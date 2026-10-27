# AI Core plan and progress

- **Updated:** 2026-10-27 (Asia/Bangkok)
- **Workstream:** Meta Global AI Developer Hackathon 2026, AI Core
- **Working branch:** [`ai/evidence-grounding-v2`](https://github.com/teehihi/scope-graph/tree/ai/evidence-grounding-v2)
- **SG-AI-02 code checkpoint:** `d511b340b19e8dc77e54488554b19114fc00abde`
- **Current checkpoint:** SG-AI-02 delivered; awaiting review before SG-AI-03.

This is the team handoff for the AI Core workstream. It records completed code, the remaining plan, and evidence for the current checkpoint. [AI_CORE_BASELINE.md](AI_CORE_BASELINE.md) is the **historical Phase 0 snapshot**; its environment and bug-status sections do not describe the code after SG-AI-01 and SG-AI-02.

## Project context

ScopeGraph indexes uploaded repositories, builds a Python source/dependency graph, and gives developers or coding agents a change-impact report with source evidence. The existing product has a React dashboard, FastAPI REST routes, and MCP tools (`analyze_change`, `get_relevant_context`, `suggest_tests`). It can run with a deterministic offline demo provider; the HTTP inference adapter has now been tested with mocked responses. See [ARCHITECTURE.md](ARCHITECTURE.md) and [MCP_SETUP.md](MCP_SETUP.md) for system and tool setup.

Python AST symbol resolution, ZIP ingestion, SQLAlchemy persistence, and graph traversal are implemented. TS/JS/Go symbol parsing and backend authentication are partial; direct Git clone ingestion is planned. This document tracks the **AI Core** changes only, not a completion claim for the entire product.

## Progress at a glance

| Stage | Status | Delivered or next acceptance focus | Commit |
| --- | --- | --- | --- |
| Phase 0 — audit | Complete | Mapped the existing pipeline, defects, contracts, environment, and implementation order. No production code changed. | `a0eecc7` |
| SG-AI-01 — evidence grounding v2 | Complete | Exact indexed file/symbol association; safe path and snippet handling; separate existence from impact support; honest grounding counts. | `9347718` |
| SG-AI-02 — structured provider | Complete; review checkpoint | Pydantic v2 response validation, bounded transient retries, explicit provider failure, response-reported metadata, and mocked HTTP tests. | `d511b34` |
| SG-AI-03 — hybrid retrieval | Planned | Deterministic ranking, graph neighbors, top-k and context budget; compare Recall@K and latency with the same baseline fixtures. | — |
| SG-AI-04 — graph-aware reasoning | Planned | Correct edge direction and depth, cycle handling, explainable paths, validated completeness suggestions. | — |
| SG-AI-05 — authorized Meta integration | Planned; depends on verified access | Confirm endpoint/model and team credentials; run an explicitly opted-in live smoke test. | — |
| SG-AI-06 — evaluation harness | Planned | Human-labeled fixtures, reproducible metrics with denominators, machine-readable results, and qualified documentation. | — |

No PR has been opened and nothing has been merged into `main` as part of this workstream.

## What is implemented now

### SG-AI-01: grounded impact claims

- `services/api/app/evidence/validator.py` matches a claimed symbol to its **specific indexed file** and rejects missing, empty, unsafe, or ambiguous paths. Snippet extraction checks workspace containment and uses the matched file/symbol lines.
- Report items retain the existing consumer fields and add `existence_verified` and `impact_supported`. File existence alone does not establish that a proposed change affects the file. Invalid claims go to `rejected_hallucinations`, and grounding metrics do not count those claims as verified.
- `services/api/tests/test_validator.py` covers wrong-file symbols, suffix ambiguity, absent symbols, file-level claims, snippets, metrics, and escape paths.

### SG-AI-02: structured inference adapter

- `services/api/app/ai/schemas.py` defines strict Pydantic v2 models for requirement interpretation, impact items/results, and completeness review. `services/api/app/ai/provider.py` validates model JSON before handing it to the orchestrator.
- The HTTP adapter retries bounded 429, 5xx, connection, and timeout failures. Permanent authentication errors fail immediately. Malformed responses and invalid schemas fail explicitly; provider response bodies are not included in error messages.
- A configured live provider without an API key records a failed analysis run instead of silently producing an offline report. `OfflineDemoProvider` remains available and is labeled as a demo.
- `services/api/app/analysis/orchestrator.py` stores the selected provider, model identity reported by the response, measured inference latency, and token usage when supplied. The report duration includes brief generation. Tests in `test_ai_provider.py` and `test_e2e_analysis.py` use mocked HTTP responses; they do not exercise a paid endpoint.

These changes preserve the existing REST/MCP report envelope and frontend-consumed impact fields. The added operational metadata fields are additive. Frontend, authentication, database schema, and deployment were not changed.

## Verification and limits

| Check | Observed result |
| --- | --- |
| Python runtime | Local `.venv` uses Python **3.13.13**, matching the project target. Backend requirements are installed locally; `.venv` is ignored by Git. |
| Backend suite after SG-AI-02 | **50 passed in 6.70s** on 2026-10-27. PowerShell command: `$env:PYTHONPATH='services/api'; $env:PYTHONDONTWRITEBYTECODE='1'; .\.venv\Scripts\python.exe -m pytest services/api/tests/ -v -p no:cacheprovider --basetemp <fresh-workspace-path> --tb=short`. |
| Source hygiene | `git diff --cached --check` passed before the SG-AI-02 commit. The pushed remote branch and local HEAD were both verified at `d511b340b19e8dc77e54488554b19114fc00abde`; the working tree was clean. |
| Live Meta inference | **Unverified.** No authorized endpoint/model, credential, paid request, or live benchmark has been confirmed. Mocked HTTP success is adapter verification only. |
| Performance/quality benchmarks | **Not yet measured.** Numerical claims in existing README/evaluation material lack a reproducible run record; treat them as unverified until SG-AI-06. |

The Phase 0 audit initially found only Python 3.14 and missing backend packages. Python 3.13 and the existing requirements were installed later with user authorization; this resolves that *local test-environment* blocker. The backend suite does not validate a real inference service, frontend build, or Redis-backed cache behavior. No frontend files changed in SG-AI-01/02.

## Remaining plan and ownership boundaries

Work remains sequential so that each result can be reviewed before the next task changes shared modules.

| Next task | Planned change and acceptance evidence | Main files / boundaries |
| --- | --- | --- |
| **SG-AI-03** | Add a separate deterministic retriever using path, symbol, metadata, layer, and graph-neighbor signals. Stable ties, deduplicated paths, configurable `top_k` and context budget, repository isolation, safe weak-match behavior. Remove the unconditional first-eight-file fallback. Test ranking, ties, cycles, no matches, and isolation; compare Recall@K and latency on identical fixtures. | New `analysis/retriever.py`; focused integration in `analysis/orchestrator.py`; `graph/engine.py` only if graph access needs adjustment; `tests/test_retriever.py`. No embeddings/vector database. |
| **SG-AI-04** | Verify stored edge direction, depth and cycles; return deterministic impact context and dependency paths where feasible. Keep direct, indirect, and potential impacts distinct. Validate completeness-review candidates before including them in a report. | `graph/engine.py`, `analysis/orchestrator.py`, provider context, graph/e2e tests. Keep `EvidenceValidator` in the report path. |
| **SG-AI-05** | Verify an officially supported model endpoint/identifier and authorized team access, then test the full pipeline with an explicitly opted-in live smoke test. Record actual provider/model and sanitized metrics. | Provider/config, `.env.example`, e2e smoke test, architecture docs. Credentials stay in environment variables; any paid call needs explicit approval. |
| **SG-AI-06** | Create human-labeled retrieval and impact fixtures; measure Precision@K, Recall@K, MRR, impact precision/recall/F1, grounding error rates, latency, tokens, and context reduction with denominators. Separate offline and live results; revise unsupported claims in existing docs. | `services/api/tests/evaluation/`, `scripts/evaluate_ai_core.py`, `docs/EVALUATION.md`, `docs/DEMO_SCRIPT.md`. |

`analysis/orchestrator.py` is shared by SG-AI-03/04; `ai/provider.py` by SG-AI-04/05. Coordinate edits to those files with the active task owner. The REST routes, MCP tool envelopes, frontend types, database schema, and sandbox rules are compatibility boundaries. Changes outside the named AI Core scope need a demonstrated need and explicit approval.

## Team handoff: next action

1. Review SG-AI-02 at `d511b34`, especially strict schema fields and the added metadata in analysis reports.
2. Start SG-AI-03 only after that review. Capture the existing keyword retrieval behavior as a measured baseline on the same small fixtures used for the new retriever; do not use numbers from current documentation as measured results.
3. For each task, add a failing regression test where practical, make the focused change, run targeted and full backend tests, inspect `git diff --check`, report actual results and limitations, then pause for review.

For local verification on Windows, set `PYTHONPATH=services/api` and use `.venv/Scripts/python.exe`. Use a **new** `--basetemp` directory inside the workspace for each pytest run because pytest replaces an existing basetemp directory. Do not put API keys in tests, logs, commits, or this document.
