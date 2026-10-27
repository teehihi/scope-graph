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
| SG-AI-03 hybrid retrieval | Complete, pushed | Repository-scoped deterministic path/symbol/metadata/layer/graph ranking, stable ties, top K and context budget, no unconditional first-eight fallback. Labeled comparison in [EVALUATION.md](EVALUATION.md). Commit `125c6be`. |
| SG-AI-05 Meta integration | Complete on the sample pipeline | Authorized `muse-spark-1.3` smoke passed against Meta Model API. A live response exhausted the original 3,000-token completion budget during reasoning; the default is now 6,000, with a specific truncated-response error and regression tests. |
| SG-AI-06 evaluation | Complete on the three-case fixture | Offline and authorized live runs recorded retrieval, impact, grounding, latency, and reported token usage. The live result and limitations are in [EVALUATION.md](EVALUATION.md). |

The workstream is on the linked branch for team review. The three-case fixture is diagnostic; wider product quality remains an open research task.

## Architecture and contracts

The seven-step `AnalysisOrchestrator` still interprets, retrieves, traverses, reasons, reviews, validates, and writes the brief. `HybridRetriever` only selects indexed, repository-scoped context for impact reasoning; `EvidenceValidator` still gates model claims. REST and MCP report envelopes remain compatible; `retrieval_metadata` is additive. Indexed relative paths are normalized to forward slashes on Windows so graph links and source labels resolve consistently. No database migration, frontend edit, new dependency, or secret was added.

The official Meta docs specify the [API base URL](https://dev.meta.ai/docs/api-reference), [Muse Spark 1.3 model](https://dev.meta.ai/docs/models), and [JSON Schema response format](https://dev.meta.ai/docs/structured-output). The adapter follows those formats; an authorized live full-pipeline smoke and three-case evaluation have now passed. Partner providers retain their existing OpenAI-compatible JSON mode. Offline mode remains the code default; the local ignored `.env` selects Meta.

## Verification and measured limitations

- Local `.venv`: Python 3.13.13 with the existing `services/api/requirements.txt`.
- SG-AI-03 checkpoint: 63 backend tests passed before SG-AI-05/06 edits.
- SG-AI-05 provider tests: 30 passed.
- SG-AI-06 metric/scanner focused tests: 5 passed.
- Backend suite after the web contract regression tests: **76 passed, 1 live-smoke skipped** on 2026-10-27 (`META_AI_PROVIDER=offline_demo`). The separately opted-in live smoke passed **1 test** with the 6,000-token default.
- Frontend packages were installed from the existing lockfile and `npm run build` passed on 2026-10-27. No frontend source or TypeScript contract changed in this workstream.
- Offline labeled evaluation: 3 cases, 14 indexed files, macro Recall@8 0.758 versus 0.532 for the previous selection rule. Impact F1 0.343; 17 of 24 validator-accepted impact claims are unsupported by the manual file/type labels. These are small demo-fixture measurements, not a Meta quality claim.
- Authorized Meta evaluation: **3/3 cases completed**, model `muse-spark-1.3`, macro impact precision / recall / F1 **0.197 / 0.516 / 0.282**; direct / indirect recall **0.833 / 0.111**. All **38** reported file/symbol claims passed the existence gate, but **27/38** accepted impact claims lack support in the manual file/type labels. This is not production accuracy. The key is kept only in the ignored root `.env`.
- `potential_impacts` is in REST/MCP JSON but is not displayed by the current frontend. The offline provider remains tailored to the email-change demo; non-email impact quality is weak. Graph edge construction may still conflate same-named symbols across files; traversal uses persisted edges.
- Web demo integration fix (2026-10-27): the sample-load endpoint now returns the full repository object including `id`, which the frontend needs for graph and analysis calls; cached analysis responses now include the report and brief. Before the fix, API logs showed calls to `/repositories/undefined/graph` and `/repositories/undefined/analyze`. A browser retest confirmed sample reload, 14 graph nodes, node evidence drawer, and an offline analysis report with source evidence. Redis cache behavior is covered by a focused regression test.

## Reproduce

From the repository root in PowerShell:

```powershell
$env:PYTHONPATH='services/api'
.\.venv\Scripts\python.exe -m pytest services/api/tests/ -v -p no:cacheprovider --basetemp data/pytest-NEW-UNUSED-DIRECTORY --tb=short
.\.venv\Scripts\python.exe scripts/evaluate_ai_core.py --mode offline --output data/ai_core_evaluation.json
```

Pytest replaces its basetemp, so choose a new directory inside the workspace. The JSON output is Git-ignored. A live smoke is intentionally skipped in the normal suite. With an authorized key in the root `.env`, set `RUN_META_LIVE_SMOKE=1` and `ALLOW_PAID_META_SMOKE=1` in the test process, then run only `services/api/tests/test_live_meta_smoke.py` with the same pytest command. The live evaluation is separate: `scripts/evaluate_ai_core.py --mode live --allow-paid-request --output data/ai_core_live_evaluation.json`. Paid runs are opt-in; do not paste credentials into logs or commit them.

## Team next actions

1. Review this branch and the human labels in `services/api/tests/evaluation/ai_core_cases.json`; expand the fixture before drawing product-wide quality conclusions.
2. Investigate the **27/38** live unsupported claims and **0.111** indirect recall with targeted labels and prompt/index evidence; rerun the opt-in evaluation after improvements.
3. Address the known indexer edge-resolution limitation in follow-up tasks with focused fixtures.
4. Run a frontend build only if a future change touches the UI or its TypeScript contracts. Do not present `potential_impacts` as visible in the current UI.
