# ScopeGraph AI Core — plan and progress

- Updated: 2026-10-27 (Asia/Bangkok)
- Branch: [ai/evidence-grounding-v2](https://github.com/teehihi/scope-graph/tree/ai/evidence-grounding-v2)
- Scope: AI Core workstream only. Frontend, authentication, multi-language parsing, direct Git ingestion, deployment, and the wider product roadmap are separate work.
- Historical audit: [AI_CORE_BASELINE.md](AI_CORE_BASELINE.md). Its original environment and defect status is superseded by this file.

## Status

| Task | Status | Evidence / remaining gate |
| --- | --- | --- |
| Phase 0 audit | Complete | Pipeline, contracts, risks, and test environment were recorded. |
| SG-AI-01 evidence grounding | Complete, pushed | File/symbol association, safe snippets, existence versus causal support, rejection metrics. Commit `9347718`. |
| SG-AI-02 structured provider | Complete, pushed | Pydantic validation, bounded retry, explicit provider failures, reported model/token metadata, mocked HTTP tests. Commit `d511b34`. |
| SG-AI-04 graph reasoning | Complete, pushed | Symmetric bounded traversal, stable paths, potential impact separation, validated review suggestions. Commit `111c396`. |
| SG-AI-03 hybrid retrieval | Implemented; final checkpoint pending | Repository-scoped deterministic path/symbol/metadata/layer/graph ranking, stable ties, top K and context budget, no unconditional first-eight fallback. Labeled comparison in [EVALUATION.md](EVALUATION.md). |
| SG-AI-05 Meta integration | Adapter and opt-in smoke prepared; live gate pending | Official URL/model and JSON Schema configured; mocked request/full-pipeline tests pass. No key or paid-call approval is present, so a real Meta call remains unverified. |
| SG-AI-06 evaluation | Offline harness implemented; live gate pending | Three manually labeled cases, retrieval/impact/grounding/efficiency metrics, JSON run record, revised unsupported benchmark claims. Live metrics require SG-AI-05 access. |

The latest user request authorizes completing the workstream without pausing at each task. No PR has been opened or merged into main.

## Architecture and contracts

The seven-step `AnalysisOrchestrator` still interprets, retrieves, traverses, reasons, reviews, validates, and writes the brief. `HybridRetriever` only selects indexed, repository-scoped context for impact reasoning; `EvidenceValidator` still gates model claims. REST and MCP report envelopes remain compatible; `retrieval_metadata` is additive. Indexed relative paths are normalized to forward slashes on Windows so graph links and source labels resolve consistently. No database migration, frontend edit, new dependency, or secret was added.

The official Meta docs specify the [API base URL](https://dev.meta.ai/docs/api-reference), [Muse Spark 1.3 model](https://dev.meta.ai/docs/models), and [JSON Schema response format](https://dev.meta.ai/docs/structured-output). The adapter follows those formats; only mocked requests have been exercised. Partner providers retain their existing OpenAI-compatible JSON mode. Offline mode remains the default.

## Verification and measured limitations

- Local `.venv`: Python 3.13.13 with the existing `services/api/requirements.txt`.
- SG-AI-03 checkpoint: 63 backend tests passed before SG-AI-05/06 edits.
- SG-AI-05 provider tests: 30 passed.
- SG-AI-06 metric/scanner focused tests: 5 passed.
- Final backend suite after SG-AI-03/05/06 code edits: **69 passed, 1 live-smoke skipped** on 2026-10-27. The linked branch records the final pushed SHA; the evaluation JSON records the SHA used for each local run.
- Frontend build was attempted as an integration check but could not start: `tsc` is unavailable because frontend packages are not installed in this workspace. No frontend source or TypeScript contract changed in this workstream.
- Offline labeled evaluation: 3 cases, 14 indexed files, macro Recall@8 0.758 versus 0.532 for the previous selection rule. Impact F1 0.343; 17 of 24 validator-accepted impact claims are unsupported by the manual file/type labels. These are small demo-fixture measurements, not a Meta quality claim.
- A real Meta smoke and live evaluation remain unverified. Neither `META_AI_API_KEY` nor `MODEL_API_KEY` is present in this environment. A paid call needs separate explicit approval.
- `potential_impacts` is in REST/MCP JSON but is not displayed by the current frontend. The offline provider remains tailored to the email-change demo; non-email impact quality is weak. Graph edge construction may still conflate same-named symbols across files; traversal uses persisted edges.

## Reproduce

From the repository root in PowerShell:

```powershell
$env:PYTHONPATH='services/api'
.\.venv\Scripts\python.exe -m pytest services/api/tests/ -v -p no:cacheprovider --basetemp data/pytest-NEW-UNUSED-DIRECTORY --tb=short
.\.venv\Scripts\python.exe scripts/evaluate_ai_core.py --mode offline --output data/ai_core_evaluation.json
```

Pytest replaces its basetemp, so choose a new directory inside the workspace. The JSON output is Git-ignored. A live smoke is intentionally skipped in the normal suite. After the team supplies an authorized key and approves a paid call, set `RUN_META_LIVE_SMOKE=1`, `ALLOW_PAID_META_SMOKE=1`, and `META_AI_API_KEY` (or `MODEL_API_KEY`) in the environment, then run only `services/api/tests/test_live_meta_smoke.py` with the same pytest command. The live evaluation is separate: `scripts/evaluate_ai_core.py --mode live --allow-paid-request --output data/ai_core_live_evaluation.json`. Do not paste credentials into logs or commit them.

## Team next actions

1. Review this branch and the human labels in `services/api/tests/evaluation/ai_core_cases.json`; expand the fixture before drawing product-wide quality conclusions.
2. Provide authorized Meta Model API access and explicit paid-call approval if live SG-AI-05/06 validation is desired. Inspect the sanitized live result for actual model identity, token usage, latency, and grounding.
3. Address the low offline impact F1 and the known indexer edge-resolution limitation in follow-up tasks with focused fixtures.
4. Run a frontend build only if a future change touches the UI or its TypeScript contracts. Do not present `potential_impacts` as visible in the current UI.
