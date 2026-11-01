import {
  Repository,
  AnalysisReport,
  GitHubRepoItem,
  GitHubAuthUrlResponse,
  SystemInfo,
  UpdateSystemSettingsRequest,
  VoiceRequirementResponse,
  RefineRequirementResponse,
  FollowUpResponse,
  ScreenshotPreviewResponse,
} from '../types';

const API_BASE = '/api/v1';

export interface RealtimeVoiceStream {
  sendAudio: (frame: ArrayBuffer) => void;
  finish: () => Promise<string>;
  close: () => void;
}

export function openRealtimeVoiceStream(
  repositoryId: string,
  language: string,
  onTranscript: (transcript: string, isFinal: boolean) => void
): Promise<RealtimeVoiceStream> {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const socketUrl = `${protocol}//${window.location.host}${API_BASE}/repositories/${encodeURIComponent(repositoryId)}/voice-stream?language=${encodeURIComponent(language)}`;
  const socket = new WebSocket(socketUrl);
  socket.binaryType = 'arraybuffer';

  let latestTranscript = '';
  let finishResolve: ((transcript: string) => void) | null = null;
  let finishReject: ((error: Error) => void) | null = null;
  let finishPromise: Promise<string> | null = null;
  let readyResolve: ((stream: RealtimeVoiceStream) => void) | null = null;
  let readyReject: ((error: Error) => void) | null = null;
  let finished = false;

  const stream: RealtimeVoiceStream = {
    sendAudio(frame) {
      if (socket.readyState === WebSocket.OPEN) socket.send(frame);
    },
    finish() {
      if (!finishPromise) {
        finishPromise = new Promise<string>((resolve, reject) => {
          finishResolve = resolve;
          finishReject = reject;
        });
        if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ action: 'stop' }));
        else finishReject?.(new Error('Realtime voice connection closed before transcription completed.'));
      }
      return finishPromise;
    },
    close() {
      if (socket.readyState < WebSocket.CLOSING) socket.close();
    },
  };

  const ready = new Promise<RealtimeVoiceStream>((resolve, reject) => {
    readyResolve = resolve;
    readyReject = reject;
  });

  const timeout = window.setTimeout(() => {
    readyReject?.(new Error('Realtime voice connection timed out.'));
    stream.close();
  }, 15000);

  socket.onmessage = (message) => {
    if (typeof message.data !== 'string') return;
    let event: { type?: string; transcript?: string; final?: boolean; message?: string };
    try {
      event = JSON.parse(message.data);
    } catch {
      return;
    }
    if (event.type === 'ready') {
      window.clearTimeout(timeout);
      readyResolve?.(stream);
      readyResolve = null;
      readyReject = null;
    } else if (event.type === 'transcript' && typeof event.transcript === 'string') {
      latestTranscript = event.transcript;
      onTranscript(latestTranscript, event.final === true);
    } else if (event.type === 'done') {
      finished = true;
      finishResolve?.(latestTranscript);
      finishResolve = null;
      finishReject = null;
    } else if (event.type === 'error') {
      const error = new Error(event.message || 'Realtime voice transcription failed.');
      readyReject?.(error);
      finishReject?.(error);
      readyReject = null;
      finishReject = null;
      socket.close();
      if (finished) return;
    }
  };

  socket.onerror = () => {
    const error = new Error('Realtime voice connection failed.');
    readyReject?.(error);
    finishReject?.(error);
    readyReject = null;
    finishReject = null;
    socket.close();
  };
  socket.onclose = () => {
    window.clearTimeout(timeout);
    readyReject?.(new Error('Realtime voice connection closed before it was ready.'));
    readyReject = null;
    if (!finished && finishPromise) {
      finishReject?.(new Error('Realtime voice connection closed before transcription completed.'));
    }
  };

  return ready;
}

export class GitHubOAuthConfigurationError extends Error {
  constructor() {
    super('GitHub OAuth is not configured');
    this.name = 'GitHubOAuthConfigurationError';
  }
}

export class ScreenshotAnalysisFailedError extends Error {
  constructor() {
    super('Screenshot analysis provider failed');
    this.name = 'ScreenshotAnalysisFailedError';
  }
}

export async function fetchGitHubAuthUrl(): Promise<string> {
  const res = await fetch(`${API_BASE}/auth/github/url`);
  if (res.status === 400) throw new GitHubOAuthConfigurationError();
  if (!res.ok) throw new Error('Failed to start GitHub OAuth');

  const data: GitHubAuthUrlResponse = await res.json();
  if (typeof data?.url !== 'string') throw new Error('Invalid GitHub OAuth URL');
  const url = new URL(data.url);
  if (url.origin !== 'https://github.com' || url.pathname !== '/login/oauth/authorize') {
    throw new Error('Invalid GitHub OAuth URL');
  }
  return url.toString();
}

export async function fetchHealth(): Promise<{ status: string; database: string; redis: string }> {
  const res = await fetch(`${API_BASE}/ready`);
  if (!res.ok) throw new Error('Health check failed');
  return res.json();
}

export async function fetchSystemInfo(): Promise<SystemInfo> {
  const res = await fetch(`${API_BASE}/system/info`);
  if (!res.ok) throw new Error('Failed to fetch system info');
  return res.json();
}

export async function updateSystemSettings(payload: UpdateSystemSettingsRequest): Promise<SystemInfo> {
  const res = await fetch(`${API_BASE}/system/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to update settings' }));
    throw new Error(err.detail || 'Failed to update system settings');
  }
  return res.json();
}

export async function testAiConnection(): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/system/test-ai`, {
    method: 'POST',
  });
  if (!res.ok) {
    return { success: false, message: 'Server error during connectivity test' };
  }
  return res.json();
}

export async function fetchGitHubRepos(token: string, refresh: boolean = false): Promise<GitHubRepoItem[]> {
  const url = `${API_BASE}/auth/github/repos?token=${encodeURIComponent(token)}${refresh ? '&refresh=true' : ''}`;
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to fetch GitHub repos' }));
    throw new Error(err.detail || 'Failed to fetch GitHub repositories');
  }
  const data = await res.json();
  if (Array.isArray(data)) {
    return data;
  }
  return data.repos || [];
}

export async function importGitHubRepo(params: {
  clone_url: string;
  name: string;
  full_name?: string;
  default_branch?: string;
  access_token: string;
  owner_email?: string;
}): Promise<Repository> {
  const res = await fetch(`${API_BASE}/repositories/import-github`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Import failed' }));
    throw new Error(err.detail || 'Failed to import repository from GitHub');
  }
  return res.json();
}

export async function fetchRepositories(ownerEmail?: string): Promise<Repository[]> {
  const url = ownerEmail ? `${API_BASE}/repositories?owner_email=${encodeURIComponent(ownerEmail)}` : `${API_BASE}/repositories`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch repositories');
  return res.json();
}

export async function deleteRepository(repoId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/repositories/${repoId}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to delete repository' }));
    throw new Error(err.detail || 'Failed to delete repository');
  }
}

export async function loadSampleRepository(): Promise<Repository> {
  const res = await fetch(`${API_BASE}/repositories/load-sample`, {
    method: 'POST',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to load sample' }));
    throw new Error(err.detail || 'Failed to load sample repository');
  }
  return res.json();
}

export async function uploadRepositoryZip(file: File, ownerEmail?: string): Promise<Repository> {
  // First create repository
  const repoName = file.name.replace(/\.zip$/i, '');
  const createRes = await fetch(`${API_BASE}/repositories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: repoName, description: 'Uploaded via ZIP archive', owner_email: ownerEmail }),
  });
  if (!createRes.ok) throw new Error('Failed to create repository');
  const repo: Repository = await createRes.json();

  // Next upload zip
  const formData = new FormData();
  formData.append('file', file);
  const uploadRes = await fetch(`${API_BASE}/repositories/${repo.id}/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!uploadRes.ok) {
    const err = await uploadRes.json().catch(() => ({ detail: 'Upload failed' }));
    throw new Error(err.detail || 'Upload failed');
  }

  // Next trigger indexing
  await triggerIndexing(repo.id);

  return repo;
}

export async function triggerIndexing(repoId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/repositories/${repoId}/index`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to trigger indexing');
}

export async function fetchGraph(
  repoId: string,
  highlightFiles?: string[],
  focusSubgraph: boolean = false
): Promise<{ nodes: any[]; edges: any[]; stats: any }> {
  const params = new URLSearchParams();
  if (highlightFiles && highlightFiles.length > 0) {
    params.set('highlight_files', highlightFiles.join(','));
  }
  if (focusSubgraph) {
    params.set('focus_subgraph', 'true');
  }

  const res = await fetch(`${API_BASE}/repositories/${repoId}/graph?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch graph');
  return res.json();
}

export async function runAnalysis(
  repoId: string,
  requirement: string,
  targetLanguage: string = 'en'
): Promise<{ analysis_id: string; status: string; result?: AnalysisReport; brief?: string }> {
  const res = await fetch(`${API_BASE}/repositories/${repoId}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requirement, run_sync: true, target_language: targetLanguage }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Analysis failed' }));
    throw new Error(err.detail || 'Analysis failed');
  }
  const data = await res.json();
  if (data.status === 'failed') {
    throw new Error(data.error || (data.result && data.result.error) || 'Analysis failed');
  }
  return data;
}

export async function analyzeScreenshot(
  repoId: string,
  requirement: string,
  screenshot: File,
  targetLanguage: string = 'en'
): Promise<{ analysis_id: string; status: string; result?: AnalysisReport; brief?: string }> {
  const formData = new FormData();
  formData.append('requirement', requirement);
  formData.append('screenshot', screenshot);
  formData.append('target_language', targetLanguage);

  const res = await fetch(`${API_BASE}/repositories/${repoId}/analyze-screenshot`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Screenshot analysis failed' }));
    throw new Error(err.detail || 'Screenshot analysis failed');
  }
  const body = await res.json();
  if (body.status === 'failed') throw new ScreenshotAnalysisFailedError();
  return body;
}

export async function fetchAnalysisReport(analysisId: string): Promise<AnalysisReport> {
  const res = await fetch(`${API_BASE}/analyses/${analysisId}/report`);
  if (!res.ok) throw new Error('Failed to fetch report');
  return res.json();
}

export async function fetchImplementationBrief(analysisId: string): Promise<{ brief_markdown: string }> {
  const res = await fetch(`${API_BASE}/analyses/${analysisId}/implementation-brief`);
  if (!res.ok) throw new Error('Failed to fetch brief');
  return res.json();
}

export async function sendVoiceRequirement(
  repositoryId: string,
  audioBlob: Blob,
  language: string = 'vi',
  targetLanguage: string = 'vi'
): Promise<VoiceRequirementResponse> {
  const formData = new FormData();
  formData.append('file', audioBlob, 'recording.wav');
  formData.append('language', language);
  formData.append('target_language', targetLanguage);

  const res = await fetch(`${API_BASE}/repositories/${encodeURIComponent(repositoryId)}/voice-requirement`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Voice transcription failed' }));
    const detail = err.detail;
    const message = typeof detail === 'string' ? detail : detail?.message || 'Voice transcription failed';
    const error = new Error(message) as Error & { rawTranscript?: string };
    if (typeof detail === 'object' && typeof detail?.raw_transcript === 'string') {
      error.rawTranscript = detail.raw_transcript;
    }
    throw error;
  }
  return res.json();
}

export async function refineRequirement(
  repositoryId: string,
  transcript: string,
  targetLanguage: string = 'vi'
): Promise<RefineRequirementResponse> {
  const res = await fetch(`${API_BASE}/repositories/${encodeURIComponent(repositoryId)}/refine-requirement`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transcript, target_language: targetLanguage }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Refinement failed' }));
    throw new Error(err.detail || 'Refinement failed');
  }
  return res.json();
}

export async function askFollowUpQuestion(
  repositoryId: string,
  question: string,
  filePath?: string,
  symbol?: string,
  targetLanguage: string = 'vi'
): Promise<FollowUpResponse> {
  const res = await fetch(`${API_BASE}/repositories/${encodeURIComponent(repositoryId)}/follow-up`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      question,
      file_path: filePath,
      symbol: symbol,
      target_language: targetLanguage,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Follow-up question failed' }));
    throw new Error(err.detail || 'Follow-up question failed');
  }
  return res.json();
}

export async function interpretScreenshotPreview(
  repositoryId: string,
  file: File,
  requirement: string = ''
): Promise<ScreenshotPreviewResponse> {
  const formData = new FormData();
  formData.append('screenshot', file);
  formData.append('requirement', requirement);

  const res = await fetch(`${API_BASE}/repositories/${encodeURIComponent(repositoryId)}/interpret-screenshot-preview`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Screenshot preview failed' }));
    throw new Error(err.detail || 'Screenshot preview failed');
  }
  return res.json();
}
