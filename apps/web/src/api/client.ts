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

const RAW_API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.trim() || '';
const API_BASE = RAW_API_URL ? `${RAW_API_URL.replace(/\/$/, '')}/api/v1` : '/api/v1';

export type SubscriptionPlan = 'free' | 'plus' | 'pro';

// ---------------------------------------------------------------------------
// Auth API
// ---------------------------------------------------------------------------

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  username?: string;
  avatar_url?: string;
  provider: string;
}

export interface EmailAuthResult {
  user: AuthUser;
  access_token: string;
  is_new_user: boolean;
  onboarding_completed: boolean;
}

export interface CheckEmailResult {
  exists: boolean;
  provider?: string;
}

export async function checkEmail(email: string): Promise<CheckEmailResult> {
  const res = await fetch(`${API_BASE}/auth/check-email?email=${encodeURIComponent(email)}`);
  if (!res.ok) throw new Error('Could not check email');
  return res.json();
}

export async function registerSendOtp(email: string, name: string, password: string): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE}/auth/register/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, name, password }),
  });
  const data = await res.json().catch(() => ({ detail: 'Request failed' }));
  if (!res.ok) throw new Error(data.detail || 'Failed to send verification code');
  return data;
}

export async function registerVerifyOtp(
  email: string,
  otp: string,
  name: string,
  password: string
): Promise<EmailAuthResult> {
  const res = await fetch(`${API_BASE}/auth/register/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp, name, password }),
  });
  const data = await res.json().catch(() => ({ detail: 'Request failed' }));
  if (!res.ok) throw new Error(data.detail || 'Verification failed');
  return data;
}

export async function resendOtp(email: string, name?: string): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE}/auth/resend-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, name: name || '' }),
  });
  const data = await res.json().catch(() => ({ detail: 'Request failed' }));
  if (!res.ok) throw new Error(data.detail || 'Failed to resend code');
  return data;
}

export async function emailLogin(email: string, password: string): Promise<EmailAuthResult> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => ({ detail: 'Request failed' }));
  if (!res.ok) throw new Error(data.detail || 'Login failed');
  return data;
}

export async function oauthCompleteProfile(
  email: string,
  provider: string,
  name: string,
  avatarUrl?: string,
  username?: string
): Promise<{ is_new_user: boolean; onboarding_completed: boolean; user_id: string }> {
  const params = new URLSearchParams({ email, provider, name });
  if (avatarUrl) params.set('avatar_url', avatarUrl);
  if (username) params.set('username', username);
  const res = await fetch(`${API_BASE}/auth/oauth/complete-profile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, provider, name, avatar_url: avatarUrl, username }),
  });
  if (!res.ok) {
    // Non-critical — proceed as new user if this fails
    return { is_new_user: true, onboarding_completed: false, user_id: '' };
  }
  return res.json();
}

export async function markOnboarded(email: string): Promise<void> {
  await fetch(`${API_BASE}/auth/mark-onboarded?email=${encodeURIComponent(email)}`, {
    method: 'POST',
  });
}

export interface AssistantMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function sendAssistantMessage(
  message: string,
  history: AssistantMessage[],
  language: string,
  signal?: AbortSignal
): Promise<{ answer: string; grounded: boolean; model: string }> {
  const res = await fetch(`${API_BASE}/assistant/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history, language }),
    signal,
  });
  if (!res.ok) throw new Error('Assistant request failed');
  return res.json();
}

export interface SubscriptionStatus {
  plan: SubscriptionPlan;
  subscription_status: string | null;
}

export async function createCheckoutSession(
  plan: Exclude<SubscriptionPlan, 'free'>,
  email: string
): Promise<{ checkout_url: string; session_id: string }> {
  const res = await fetch(`${API_BASE}/billing/create-checkout-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plan, email }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Could not start checkout' }));
    throw new Error(err.detail || 'Could not start checkout');
  }
  return res.json();
}

export async function fetchSubscription(email: string): Promise<SubscriptionStatus> {
  const res = await fetch(`${API_BASE}/billing/subscription?email=${encodeURIComponent(email)}`);
  if (!res.ok) throw new Error('Could not load subscription');
  return res.json();
}

export async function confirmCheckoutSession(sessionId: string, email: string): Promise<SubscriptionStatus> {
  const res = await fetch(
    `${API_BASE}/billing/checkout-session/${encodeURIComponent(sessionId)}?email=${encodeURIComponent(email)}`
  );
  if (!res.ok) throw new Error('Could not confirm checkout');
  return res.json();
}

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
  let socketUrl = '';
  if (RAW_API_URL) {
    const wsBase = RAW_API_URL.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:').replace(/\/$/, '');
    socketUrl = `${wsBase}/api/v1/repositories/${encodeURIComponent(repositoryId)}/voice-stream?language=${encodeURIComponent(language)}`;
  } else {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    socketUrl = `${protocol}//${window.location.host}${API_BASE}/repositories/${encodeURIComponent(repositoryId)}/voice-stream?language=${encodeURIComponent(language)}`;
  }
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
    const msg = err.detail || 'Analysis failed';
    const e = new Error(msg) as any;
    e.status = res.status;
    throw e;
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
    const msg = err.detail || 'Screenshot analysis failed';
    if (res.status === 403 || res.status === 429) {
      const e = new Error(msg) as any;
      e.status = res.status;
      throw e;
    }
    throw new ScreenshotAnalysisFailedError();
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
