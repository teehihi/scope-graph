import { Repository, AnalysisReport, GitHubRepoItem, SystemInfo, UpdateSystemSettingsRequest } from '../types';

const API_BASE = '/api/v1';

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
  return res.json();
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
  return res.json();
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
