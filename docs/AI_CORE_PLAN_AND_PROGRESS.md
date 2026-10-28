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
| SG-AI-07C causal impact verification | Implemented; independent-label gate open | Supported and potential claims are separated, type errors can be corrected, indexed test calls can be promoted, and imported setting reads resolve to exact attributes. On the frozen 17-case offline fixture strict precision and indirect recall both improved without direct-recall loss; independent label adjudication is pending. |
| SG-AI-08 plain-language explanations | Implemented on branch | Deterministic technical and simple explanation fields share the same grounded report; structural tests and [frontend contract](AI_CORE_FRONTEND_CONTRACT.md) exist. Human explanation-quality review remains open. |
| SG-AI-09 final evaluation | Offline and opted-in live checkpoints complete; review open | 17-case source-annotated offline fixture, raw versus supported scoring, retrieval baseline, latency, and replay. A new three-case Meta run has a replayable trace. The v3 labels have AI-assisted review; independent human sign-off remains open. |
| SG-AI-09B separate-repository holdout | Technical readiness checked; `HUMAN_SIGNOFF_REQUIRED` | Pinned FastAPI RealWorld source snapshot, 10 source-annotated cases, 10 direct and 13 indirect labels. [AI-assisted decisions](HOLDOUT_AI_ASSISTED_REVIEW_V1.md) retain all 23 labels; [validation/readiness](HOLDOUT_EVALUATION_READINESS.md) and a blank [human sign-off form](HOLDOUT_HUMAN_SIGNOFF.md) are prepared. The fixture is not frozen; no holdout inference or score. |
| SG-AI-10 false-positive investigation | Analysis complete; fixes pending | [Trace-backed analysis](SG_AI_10_FALSE_POSITIVE_ANALYSIS.md) attributes 45 final strict false-positive pairs on the v3 saved offline predictions to provider reasoning (31), causal support (13), and impact type (1). Proposed SG-AI-11 fixes have not been implemented. |

The workstream is on the linked branch for team review. The three-case live result and expanded 17-case offline fixture are diagnostic; wider product quality remains an open research task. `origin/main` at `5d65463` was merged into the AI branch as `2f01a7b` on 2026-10-28. That main update adds GitHub OAuth/repository archive import, onboarding, dynamic AI settings, and 12-language UI support; these are separate product features, not evidence of better AI Core accuracy. An earlier merge required a separately authorized `RepoContext.tsx` build repair.

The 17-case fixture now also has an [AI-assisted v3 label review](AI_CORE_LABEL_REVIEW_V3.md): six impact labels removed, leaving 25 direct and 10 indirect labels. The [label-only replay](EVALUATION.md#sg-ai-09-label-only-v3-replay-2026-10-28) uses the saved offline predictions and changes no model output. Independent human sign-off remains open.

SG-AI-09B has prepared a [10-case FastAPI RealWorld holdout candidate](HOLDOUT_LABEL_REVIEW.md) from pinned upstream commit `029eb7781c60d5f563ee8990a0cbfb79b244538c`. It has 10 direct and 13 indirect labels with source annotations. The [AI-assisted source review](HOLDOUT_AI_ASSISTED_REVIEW_V1.md) records KEEP for all 23 impact labels, CHANGE 0, REMOVE 0, without changing the candidate fixture. Static snapshot and label validation passed; no holdout model evaluation has run. Independent human sign-off and freezing remain open.

The [holdout readiness report](HOLDOUT_EVALUATION_READINESS.md) records the exact fixture/source hashes, static indexing, evaluation-harness capabilities and limits, and conditional offline commands. The owner acknowledged the AI-assisted proposal but said they had not independently checked the labels against source. The [human sign-off form](HOLDOUT_HUMAN_SIGNOFF.md) remains unfilled. The evaluation gate is **BLOCKED: HUMAN_SIGNOFF_REQUIRED**; neither an offline holdout run nor a paid Meta run was performed for this task.

## Architecture and contracts

The seven-step `AnalysisOrchestrator` still interprets, retrieves, traverses, reasons, reviews, validates, and writes the brief. `HybridRetriever` only selects indexed, repository-scoped context for impact reasoning; `EvidenceValidator` still gates model claims. `CausalImpactVerifier` then separates source-supported and potential effects. REST and MCP report envelopes remain compatible; explanation, trace, and retrieval metadata fields are additive. Indexed relative paths are normalized to forward slashes on Windows so graph links and source labels resolve consistently. The AI Core changes required no database migration, new dependency, or secret. Persisted graph edges are computed at indexing time: reindex repositories to receive corrected call and imported-attribute `reads` edges; the analysis cache version was advanced for report changes. The newer main also adds partial TypeScript/JavaScript indexing through a lightweight parser; this does not imply full AST or cross-language call resolution.

The official Meta docs specify the [API base URL](https://dev.meta.ai/docs/api-reference), [Muse Spark 1.3 model](https://dev.meta.ai/docs/models), and [JSON Schema response format](https://dev.meta.ai/docs/structured-output). The adapter follows those formats; an authorized live full-pipeline smoke and three-case evaluation have now passed. Partner providers retain their existing OpenAI-compatible JSON mode. Offline mode remains the code default; the local ignored `.env` selects Meta.

## Verification and measured limitations

- Local `.venv`: Python 3.13.13 with the existing `services/api/requirements.txt`.
- SG-AI-03 checkpoint: 63 backend tests passed before SG-AI-05/06 edits.
- SG-AI-05 provider tests: 30 passed.
- SG-AI-06 metric/scanner focused tests: 5 passed.
- Backend suite after the web contract regression tests: **76 passed, 1 live-smoke skipped** on 2026-10-27 (`META_AI_PROVIDER=offline_demo`). The separately opted-in live smoke passed **1 test** with the 6,000-token default.
- SG-AI-07A backend suite on 2026-10-28: **85 passed, 1 live-smoke skipped** (`META_AI_PROVIDER=offline_demo`). Trace/replay tests include a CLI run with live-provider environment variables but no key or network request.
- After the imported-setting-read change, the full backend suite on 2026-10-28 was **104 passed, 1 live-smoke skipped** (`META_AI_PROVIDER=offline_demo`). Offline and new live schema-v2 artifacts replayed without inference. The targeted causal/index/graph suite was **11 passed** before the final cache-version test.
- After merging the newer `main`, frontend build failed because `RepoContext.tsx` imported missing `../data/sampleData` (the broad `data/` Git ignore rule covered that path). With the user's follow-up authorization, the context now starts empty and loads the real sample and graph through the API. `npm run build` passed, and the 12-language i18n audit passed. The UI still needs a browser interaction check when an API is available; no fabricated client impact report is shown when the API fails.
- After merging `origin/main` at `5d65463` on 2026-10-28, the full backend suite passed **108 tests, with 1 live-smoke skip** (`META_AI_PROVIDER=offline_demo`); this includes the two holdout integrity tests. `npm run build` passed, and `node scripts/audit_i18n.js` found 299 keys in each of 12 languages with no reported unlocalized strings. These checks do not constitute a browser interaction test or a holdout model evaluation.
- SG-AI-09B readiness on 2026-10-28: holdout/integrity/evaluation/replay targeted tests **18 passed**; full backend suite **108 passed, 1 opt-in live-smoke skipped**. A separate SQLite in-memory indexing smoke found **103 files, 340 symbols, and all 28 distinct retrieval paths**. No holdout requirement was sent to an inference provider; see [readiness report](HOLDOUT_EVALUATION_READINESS.md).
- Offline labeled evaluation: 3 cases, 14 indexed files, macro Recall@8 0.758 versus 0.532 for the previous selection rule. Impact F1 0.343; 17 of 24 validator-accepted impact claims are unsupported by the manual file/type labels. These are small demo-fixture measurements, not a Meta quality claim.
- Authorized Meta evaluation: **3/3 cases completed**, model `muse-spark-1.3`, macro impact precision / recall / F1 **0.197 / 0.516 / 0.282**; direct / indirect recall **0.833 / 0.111**. All **38** reported file/symbol claims passed the existence gate, but **27/38** accepted impact claims lack support in the manual file/type labels. This is not production accuracy. The key is kept only in the ignored root `.env`.
- `potential_impacts` is in REST/MCP JSON and is displayed in `ReportPanel`; human review of its presentation remains open. The offline provider remains tailored to the email-change demo; non-email impact quality is weak. The formerly global same-name call resolution was replaced by contextual resolution with ambiguity left unresolved, but dynamic Python calls remain outside static coverage.
- Expanded 17-case offline checkpoint: hybrid retrieval Recall@8 **0.956** versus keyword **0.591**; supported-impact macro precision / recall / F1 **0.352 / 0.552 / 0.427**; direct / indirect recall **0.573 / 0.542**. Raw existence-gated impact precision / recall / F1 was **0.170 / 0.453 / 0.240**, with direct / indirect recall **0.427 / 0.458**. All **111** raw claims were valid file/symbol references; **91** were outside the current manual file/type labels. The independent-label condition remains open; see [EVALUATION.md](EVALUATION.md).
- A newly authorized three-case Meta evaluation recorded schema-v2 traces and replayed without a second request. Final source-supported macro impact precision / recall / F1 was **0.690 / 0.746 / 0.714**; direct / indirect recall **0.917 / 0.444**. The result is diagnostic and cannot be compared as a controlled experiment against the historical live run.
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
2. Obtain independent human sign-off for the [17-case v3 labels](AI_CORE_LABEL_REVIEW_V3.md) and [10-case RealWorld holdout](HOLDOUT_HUMAN_SIGNOFF.md). Review the [45 v3 strict false positives](SG_AI_10_FALSE_POSITIVE_ANALYSIS.md) against source before implementing SG-AI-11; the holdout must remain untouched by tuning. The mechanical indirect-recall gate passes on the current development labels.
3. Review technical and plain-language explanation accuracy with humans; expand non-email offline reasoning before interpreting offline impact scores as broad quality.
4. Run a new paid Meta evaluation only with separate authorization. The frontend displays `potential_impacts`; verify its behavior in a browser and tighten remaining additive report-field types when frontend work is scheduled.
