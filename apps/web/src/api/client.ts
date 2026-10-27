import { Repository, AnalysisReport } from '../types';

const API_BASE = '/api/v1';

export async function fetchHealth(): Promise<{ status: string; database: string; redis: string }> {
  const res = await fetch('/ready');
  if (!res.ok) throw new Error('Health check failed');
  return res.json();
}

export async function fetchRepositories(): Promise<Repository[]> {
  const res = await fetch(`${API_BASE}/repositories`);
  if (!res.ok) throw new Error('Failed to fetch repositories');
  return res.json();
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

export async function uploadRepositoryZip(file: File): Promise<Repository> {
  // First create repository
  const repoName = file.name.replace(/\.zip$/i, '');
  const createRes = await fetch(`${API_BASE}/repositories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: repoName, description: 'Uploaded via ZIP archive' }),
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
  requirement: string
): Promise<{ analysis_id: string; status: string; result?: AnalysisReport; brief?: string }> {
  const res = await fetch(`${API_BASE}/repositories/${repoId}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requirement, run_sync: true }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Analysis failed' }));
    throw new Error(err.detail || 'Analysis failed');
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
