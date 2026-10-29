# Multi-AI local integration and handoff

Updated: 2026-10-29. Read [architecture](MULTI_AI_ARCHITECTURE.md), [offline evaluation](MULTI_AI_EVALUATION.md) and [execution log](MULTI_AI_AUTONOMOUS_EXECUTION.md) alongside this guide. No Baseten or Modal live call has been made.

## Profiles

`AI_PROVIDER_PROFILE=meta_only` is the default. The existing `META_AI_PROVIDER` setting selects `offline_demo`, the Meta Model API, or a legacy compatible provider. Existing text, screenshot, REST and MCP entry points use the same orchestrator. To return to the local no-network baseline, set `AI_PROVIDER_PROFILE=meta_only` and `META_AI_PROVIDER=offline_demo`, then restart the API and worker.

`AI_PROVIDER_PROFILE=multi_ai` is opt-in. It is accepted only when `ENVIRONMENT=development` or `test` and all three destinations have explicit configuration. No runtime settings page can set the profile. Place real credentials in ignored local `.env` or a secret manager, never in source, a URL or this document. Do not enable this profile on a public listener until repository ownership, report access, runtime settings and spending gates are reviewed.

```dotenv
AI_PROVIDER_PROFILE=multi_ai
ENVIRONMENT=development
META_AI_PROVIDER=meta_model_api
META_AI_BASE_URL=https://api.meta.ai/v1
META_AI_MODEL=muse-spark-1.3
META_AI_API_KEY=<secret from approved Meta account>
BASETEN_VISION_BASE_URL=https://inference.baseten.co/v1
BASETEN_VISION_MODEL=<verified vision-capable deployment model ID>
BASETEN_VISION_API_KEY=<secret from approved Baseten account>
BASETEN_VISION_CAPABLE=true
MODAL_REASONING_BASE_URL=https://<approved deployment>.modal.direct/v1
MODAL_REASONING_MODEL=<exact model ID shown by Modal endpoint>
MODAL_REASONING_API_KEY=<approved Modal proxy token>
BASETEN_VISION_META_FALLBACK=false
MODAL_REASONING_META_FALLBACK=false
```

The example is a template and contains no working credentials or assumed partner model IDs. Modal also supports documented `api.modal.com/v1` and `*.modal.run/v1` endpoint shapes; only HTTPS approved hosts are accepted. The explicit capability flag means the operator has checked the Baseten model supports image input. It is not a substitute for a live schema check. The [Baseten compatibility announcement](https://www.baseten.co/resources/changelog/baseten-is-fully-openai-compatible/) and [Modal endpoint reference](https://modal.com/docs/guide/endpoints) support the Chat Completions transport. Provider- and model-specific JSON mode must still be verified on the selected deployments.

## Limits, fallback and failures

Baseten Vision and Modal Reasoning each have configurable `*_TIMEOUT_SECONDS`, `*_MAX_RETRIES`, `*_MAX_TOKENS` and `*_REQUEST_BUDGET` settings. Their defaults are 45 s/1 retry/1,500 tokens/2 requests and 60 s/1 retry/4,000 tokens/2 requests respectively. Meta retains its existing retry and token settings with a per-analysis request ceiling of 15 in Multi-AI; the Meta-only path has a ceiling of 20. These are request ceilings for one analysis, **not** account-wide spend or rate controls.

Fallback is disabled by default. Set `BASETEN_VISION_META_FALLBACK=true` only after authorizing screenshot transmission to Meta, or `MODAL_REASONING_META_FALLBACK=true` only after authorizing source context transmission to Meta. A timeout, connection failure, HTTP 429 or 5xx may activate one fallback. Authentication errors, invalid schemas and exhausted budgets fail explicitly; no provider loop is allowed. Failed runs expose stable sanitized error codes through the analysis status. An evaluation trace records failed-stage metadata if one was requested.

The `result.operational_metadata.stages` array records stage, selected provider, requested and actual model, duration, logical attempts, actual HTTP request count, retry count, fallback, reported token usage, error class, health classification and `offline`/`mock`/`live` mode. The `visual_context` remains an untrusted observation; only `affected_items` with indexed evidence and causal support are confirmed impact. Multi-AI text requests bypass Redis cache. Screenshot requests already bypass it.

## Reproduce without network inference

From repository root in PowerShell, set the following overrides for tests so a local Meta key in `.env` is never used:

```powershell
$env:PYTHONPATH='services/api'
$env:AI_PROVIDER_PROFILE='meta_only'
$env:META_AI_PROVIDER='offline_demo'
$env:META_AI_API_KEY=''
.\.venv\Scripts\python.exe -m pytest services/api/tests/ -q --basetemp=data/pytest-temp/NEW-UNUSED-DIRECTORY
.\.venv\Scripts\python.exe scripts/evaluate_ai_core.py --mode offline --dataset services/api/tests/evaluation/ai_core_cases_v3.json --output data/multi_ai_meta_only_v3.json
.\.venv\Scripts\python.exe scripts/evaluate_ai_core.py --mode offline --mock-multi-ai --dataset services/api/tests/evaluation/ai_core_cases_v3.json --output data/multi_ai_mock_v3.json
.\.venv\Scripts\python.exe scripts/replay_ai_core.py --input data/multi_ai_mock_v3.json
```

The evaluation outputs stay in Git-ignored `data/`. `--mock-multi-ai` routes through separate deterministic local provider instances; it does not run a Baseten or Modal model. The existing screenshot integration browser exercise with a local mock is recorded in [SG-AI-23](SG_AI_23_FINAL_VALIDATION.md) and was repeated for this work using an ignored local harness, PNG and JPEG. No browser test here used real Multi-AI credentials.

## Outstanding approval and release work

Real deployment/model IDs and credentials, approved destinations and a paid request budget are needed for one-by-one live verification. Public deployment also requires backend identity and repository/report authorization, protection of `/system/settings` and `/system/test-ai`, upstream multipart body limits, cross-provider data transfer policy, account-wide rate/spend controls and retention rules. The holdout is provisional until human source sign-off and must not be used for routing or prompt selection.
