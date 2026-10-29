import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const sourcePath = fileURLToPath(new URL('../src/api/client.ts', import.meta.url));
const source = readFileSync(sourcePath, 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
}).outputText;
const client = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

test('GitHub authorization URL is fetched once through the API client', async (t) => {
  const previousFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = previousFetch; });
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(url);
    return new Response(JSON.stringify({
      url: 'https://github.com/login/oauth/authorize?client_id=test',
      client_id: 'test',
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };

  const url = await client.fetchGitHubAuthUrl();

  assert.equal(url, 'https://github.com/login/oauth/authorize?client_id=test');
  assert.deepEqual(calls, ['/api/v1/auth/github/url']);
});

test('missing server OAuth configuration produces a distinct error', async (t) => {
  const previousFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = previousFetch; });
  globalThis.fetch = async () => new Response(JSON.stringify({
    detail: 'GitHub OAuth is not configured',
  }), { status: 400, headers: { 'Content-Type': 'application/json' } });

  await assert.rejects(
    () => client.fetchGitHubAuthUrl(),
    (error) => error instanceof client.GitHubOAuthConfigurationError,
  );
});
