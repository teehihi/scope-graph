# ScopeGraph AI Core — plan and progress

- Updated: 2026-10-28 (Asia/Bangkok)
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
| SG-AI-07A evaluation replay and observability | Implemented on branch | Schema-v2 per-case traces use the orchestrator's actual context and interpretation. Pure replay recomputes case/macro/micro metrics and separates unique from raw claims. No new paid run. |
| SG-AI-07B indexing and retrieval accuracy | Implemented on branch | Module/import-aware call resolution, aliases and statically supported instance calls, bounded source context, stable retrieval scoring, graph edge evidence, and regression tests. Existing repositories need reindexing to gain corrected edges. |
| SG-AI-07C causal impact verification | Implemented; quality gate open | Supported and potential claims are separated, type errors can be corrected from source evidence, and validated review/test calls can be promoted. On the new offline fixture strict precision improved but indirect recall did not increase; see [EVALUATION.md](EVALUATION.md). |
| SG-AI-08 plain-language explanations | Implemented on branch | Deterministic technical and simple explanation fields share the same grounded report; structural tests and [frontend contract](AI_CORE_FRONTEND_CONTRACT.md) exist. Human explanation-quality review remains open. |
| SG-AI-09 final evaluation | Offline checkpoint complete; broader validation open | 17-case source-annotated fixture, raw versus supported scoring, retrieval baseline, latency, and replay. Labels need independent adjudication; no new live Meta run. |

The workstream is on the linked branch for team review. The three-case live result and expanded 17-case offline fixture are diagnostic; wider product quality remains an open research task. The latest `main` was merged into the AI branch on 2026-10-28, without editing frontend source in this workstream.

## Architecture and contracts

The seven-step `AnalysisOrchestrator` still interprets, retrieves, traverses, reasons, reviews, validates, and writes the brief. `HybridRetriever` only selects indexed, repository-scoped context for impact reasoning; `EvidenceValidator` still gates model claims. `CausalImpactVerifier` then separates source-supported and potential effects. REST and MCP report envelopes remain compatible; explanation, trace, and retrieval metadata fields are additive. Indexed relative paths are normalized to forward slashes on Windows so graph links and source labels resolve consistently. No database migration, frontend edit by this workstream, new dependency, or secret was added. Persisted graph edges are computed at indexing time: reindex repositories to receive the new symbol resolution; the analysis cache version was advanced for report changes.

The official Meta docs specify the [API base URL](https://dev.meta.ai/docs/api-reference), [Muse Spark 1.3 model](https://dev.meta.ai/docs/models), and [JSON Schema response format](https://dev.meta.ai/docs/structured-output). The adapter follows those formats; an authorized live full-pipeline smoke and three-case evaluation have now passed. Partner providers retain their existing OpenAI-compatible JSON mode. Offline mode remains the code default; the local ignored `.env` selects Meta.

## Verification and measured limitations

- Local `.venv`: Python 3.13.13 with the existing `services/api/requirements.txt`.
- SG-AI-03 checkpoint: 63 backend tests passed before SG-AI-05/06 edits.
- SG-AI-05 provider tests: 30 passed.
- SG-AI-06 metric/scanner focused tests: 5 passed.
- Backend suite after the web contract regression tests: **76 passed, 1 live-smoke skipped** on 2026-10-27 (`META_AI_PROVIDER=offline_demo`). The separately opted-in live smoke passed **1 test** with the 6,000-token default.
- SG-AI-07A backend suite on 2026-10-28: **85 passed, 1 live-smoke skipped** (`META_AI_PROVIDER=offline_demo`). Trace/replay tests include a CLI run with live-provider environment variables but no key or network request.
- After merging `origin/main` and the final indirect-test correction, the full backend suite on 2026-10-28 was **103 passed, 1 live-smoke skipped** (`META_AI_PROVIDER=offline_demo`), and pure evaluation replay succeeded. The targeted causal/e2e suite was **10 passed**.
- Frontend packages were installed from the existing lockfile and `npm run build` passed on 2026-10-27. After merging the newer `main`, `npm run build` fails: its tracked `apps/web/src/context/RepoContext.tsx` imports `../data/sampleData`, but `origin/main` does not track that file; the unresolved import also produces an implicit-`any` callback error. The AI Core workstream did not edit frontend source. This needs the frontend owner's fix.
- Offline labeled evaluation: 3 cases, 14 indexed files, macro Recall@8 0.758 versus 0.532 for the previous selection rule. Impact F1 0.343; 17 of 24 validator-accepted impact claims are unsupported by the manual file/type labels. These are small demo-fixture measurements, not a Meta quality claim.
- Authorized Meta evaluation: **3/3 cases completed**, model `muse-spark-1.3`, macro impact precision / recall / F1 **0.197 / 0.516 / 0.282**; direct / indirect recall **0.833 / 0.111**. All **38** reported file/symbol claims passed the existence gate, but **27/38** accepted impact claims lack support in the manual file/type labels. This is not production accuracy. The key is kept only in the ignored root `.env`.
- `potential_impacts` is in REST/MCP JSON but is not displayed by the current frontend. The offline provider remains tailored to the email-change demo; non-email impact quality is weak. The formerly global same-name call resolution was replaced by contextual resolution with ambiguity left unresolved, but dynamic Python calls remain outside static coverage.
- Expanded 17-case offline checkpoint: hybrid retrieval Recall@8 **0.956** versus keyword **0.591**; supported-impact macro precision / recall / F1 **0.313 / 0.427 / 0.367**; direct / indirect recall **0.448 / 0.458**. Raw existence-gated impact precision / recall / F1 was **0.170 / 0.453 / 0.240**. The static gate improves precision but has not demonstrated improved indirect recall. All **111** raw claims were valid file/symbol references; **91** were outside the current manual file/type labels. See [EVALUATION.md](EVALUATION.md) for denominators and limitations.
- Web demo integration fix (2026-10-27): the sample-load endpoint now returns the full repository object including `id`, which the frontend needs for graph and analysis calls; cached analysis responses now include the report and brief. Before the fix, API logs showed calls to `/repositories/undefined/graph` and `/repositories/undefined/analyze`. A browser retest confirmed sample reload, 14 graph nodes, node evidence drawer, and an offline analysis report with source evidence. Redis cache behavior is covered by a focused regression test.

## Reproduce

From the repository root in PowerShell:

```powershell
$env:PYTHONPATH='services/api'
.\.venv\Scripts\python.exe -m pytest services/api/tests/ -v -p no:cacheprovider --basetemp data/pytest-NEW-UNUSED-DIRECTORY --tb=short
.\.venv\Scripts\python.exe scripts/evaluate_ai_core.py --mode offline --dataset services/api/tests/evaluation/ai_core_cases_v2.json --output data/ai_core_evaluation_v2.json
.\.venv\Scripts\python.exe scripts/replay_ai_core.py --input data/ai_core_evaluation_v2.json
```

Pytest replaces its basetemp, so choose a new directory inside the workspace. The JSON output is Git-ignored. A live smoke is intentionally skipped in the normal suite. With an authorized key in the root `.env`, set `RUN_META_LIVE_SMOKE=1` and `ALLOW_PAID_META_SMOKE=1` in the test process, then run only `services/api/tests/test_live_meta_smoke.py` with the same pytest command. The live evaluation is separate: `scripts/evaluate_ai_core.py --mode live --allow-paid-request --output data/ai_core_live_evaluation_sg_ai_07a.json` after fresh approval. Paid runs are opt-in; do not paste credentials into logs or commit them.

## Team next actions

1. Review the AI branch and reindex any existing repository before comparing graph behavior. The earlier live artifact cannot yield claim-level replay because its raw predictions were not saved.
2. Independently adjudicate the 17-case labels, audit the 42 supported-claim false positives and 21 misses, and add a separate repository holdout. The SG-AI-07C indirect-recall quality gate remains open.
3. Review technical and plain-language explanation accuracy with humans; expand non-email offline reasoning before interpreting offline impact scores as broad quality.
4. Run a new paid Meta evaluation only with separate authorization. The current frontend does not yet display `potential_impacts` or type all additive report fields.
