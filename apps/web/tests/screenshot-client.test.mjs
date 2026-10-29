import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const sourcePath = fileURLToPath(new URL('../src/api/client.ts', import.meta.url));
const compiled = ts.transpileModule(readFileSync(sourcePath, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
}).outputText;
const client = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

test('screenshot client sends multipart image, requirement and language', async (t) => {
  const previousFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = previousFetch; });
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return new Response(JSON.stringify({ status: 'completed', result: { affected_items: [], potential_impacts: [] } }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  };
  const file = new File(['png'], 'screen.png', { type: 'image/png' });

  const result = await client.analyzeScreenshot('repo-1', 'Change article list', file, 'vi');

  assert.equal(result.status, 'completed');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, '/api/v1/repositories/repo-1/analyze-screenshot');
  assert.equal(calls[0].options.method, 'POST');
  assert.equal(calls[0].options.headers, undefined);
  assert.equal(calls[0].options.body.get('requirement'), 'Change article list');
  assert.equal(calls[0].options.body.get('target_language'), 'vi');
  assert.equal(calls[0].options.body.get('screenshot'), file);
});

test('provider failure with HTTP 200 is surfaced as an error', async (t) => {
  const previousFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = previousFetch; });
  globalThis.fetch = async () => new Response(JSON.stringify({
    status: 'failed', analysis_id: 'failed-run', result: {},
  }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  await assert.rejects(
    () => client.analyzeScreenshot('repo-1', 'Change article list', new File(['png'], 'screen.png', { type: 'image/png' })),
    (error) => error instanceof client.ScreenshotAnalysisFailedError,
  );
});

test('text analysis still sends its JSON request', async (t) => {
  const previousFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = previousFetch; });
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return new Response(JSON.stringify({ status: 'completed', result: { affected_items: [] } }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  };

  await client.runAnalysis('repo-1', 'Change article list', 'en');

  assert.equal(calls[0].url, '/api/v1/repositories/repo-1/analyze');
  assert.equal(calls[0].options.headers['Content-Type'], 'application/json');
  assert.equal(JSON.parse(calls[0].options.body).requirement, 'Change article list');
});
