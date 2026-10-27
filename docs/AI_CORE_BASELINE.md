# AI Core baseline audit

**Audit date:** 2026-10-27 (Asia/Bangkok)

**Branch:** `ai/evidence-grounding-v2`

**Commit:** `a4dfeee9602625dad27aa450797e7b3a06bc0119`

**Scope:** Phase 0 source and local environment audit only. No production logic was changed.

## Current architecture and implemented features

1. ZIP upload or the bundled sample creates a repository workspace. `indexing/scanner.py` records file paths, languages, sizes, and SHA-256 hashes. `indexing/parser.py` extracts Python AST symbols, imports, and calls. `indexing/engine.py` persists files, symbols, and dependency edges in SQLAlchemy tables (`db/models.py`). Non-Python files are classified and indexed as files, without AST symbol resolution.
2. `analysis/orchestrator.py` runs requirement interpretation, keyword-based file retrieval, graph traversal, impact reasoning, completeness review, evidence validation, and brief generation. The AI steps use `BaseMetaAIProvider`, implemented by `OfflineDemoProvider` and `MetaAIHttpProvider` in `ai/provider.py`.
3. `graph/engine.py` builds a directed NetworkX file graph from persisted edges. An edge points from a file containing an import or call to its dependency. The graph also produces React Flow nodes and edges.
4. `evidence/validator.py` checks model-selected paths and symbols against repository-indexed records and reads line-numbered source snippets. Its current checks have the defects below; a returned `is_verified_fact` does not establish that the stated impact is causally correct.
5. REST routes in `api/routes/analysis.py` expose analysis status, reports, and briefs. `mcp/server.py` exposes `analyze_change`, `get_relevant_context`, and `suggest_tests`; each opens and closes a database session. `jobs/queue.py` supports Redis RQ and in-process fallback, plus Redis result caching.

**Status split:** Python indexing, file graph construction, the seven-stage orchestration flow, REST/MCP surfaces, and offline demo mode are implemented. Multi-language symbol resolution, strict claim grounding, robust structured live inference, and deterministic ranked retrieval are partial or missing. Direct Git clone ingestion, an evaluation harness, and verified live Meta model operation are not implemented or demonstrated in this checkout.

## Confirmed defects and limitations from source inspection

| Area | Evidence and effect |
| --- | --- |
| Cross-file symbols | `evidence/validator.py` falls back from `(file_path, symbol_name)` to the first symbol with that name anywhere in the repository. A claim for a real file can therefore be marked verified using a different file's symbol and line range. Missing symbols remain in `affected_items` with `is_verified_fact=false`, while `verified_claims` counts every retained item. |
| Path matching | The same validator uses the first suffix match. An empty string matches every path, and a shared filename suffix can resolve to an arbitrary indexed file. Neither ambiguous matches nor path type errors are handled explicitly. |
| Grounding meaning | File existence is treated as verification of a file-level impact claim. Reasons, direct/indirect labels, risks, suggested tests, and the completeness review are not validated as impact evidence. `grounding_ratio` can be inflated by retained invalid-symbol claims and is `1.0` when there are no claims. |
| Snippet containment | `_extract_source_snippet` joins `workspace_root` and an indexed relative path without resolving and checking containment. It assumes indexed paths remain safe; an indexed symlink or corrupted index could make it read outside the workspace. This is a source-level risk, not an observed exploit. |
| Retrieval | `analysis/orchestrator.py` includes files while `len(retrieved_files) < 8` even if they do not match. There is no ranking, top-k setting, token budget, or score explanation. `mcp/server.py` has separate keyword scoring and a first-files fallback, so MCP and report retrieval differ. |
| Graph traversal | `find_connected_files` uses outgoing edges for dependencies but only immediate incoming edges for dependents. `max_depth` affects outgoing traversal only, and values above two still stop at two. Sets are returned without stable ordering; missing seed paths are repeated in `direct`. The indexer resolves call symbols through a repository-wide name map, which can overwrite duplicate names before edge construction. |
| Provider robustness | `MetaAIHttpProvider` parses JSON without a response schema, assumes `choices[0].message.content`, and has no bounded retry for 429, 5xx, or connection failures. The factory chooses offline demo mode if a non-demo provider is selected without a key. The response object has provider/model/latency but no token usage. Offline response latencies are hardcoded illustrative values. |
| Metadata and review | `OfflineDemoProvider` has no `provider_name` or `model` attributes, so the orchestrator stores fallback model labels that do not match the response's `deterministic-semantic-matcher`. Completeness review's `additional_files_to_check` is copied into the report without a separate evidence check; it is not merged into `affected_items`. The offline brief contains fixed email-change steps even for other requirements. |
| Cache contract | The cache key includes repository ID, requirement, and model, but no provider or index revision. The cached REST response returns only `analysis_id`, `status`, and `cached`, while the frontend's synchronous `runAnalysis` consumer expects `result` and `brief`. This is a confirmed contract divergence on a cache hit; no runtime cache test was possible locally. |

## Existing tests and actual baseline result

There are **five test files and six top-level pytest tests**: two security tests and one each for parser extraction, graph construction/traversal, validator rejection, and offline end-to-end indexing/analysis with MCP tool calls. There are no provider, retriever, ambiguity, cross-file symbol, graph cycle/depth, real inference, REST cache contract, or evaluation-harness tests.

| Command (PowerShell equivalent of documented backend test command) | Result |
| --- | --- |
| `PYTHONPATH=services/api python -m pytest services/api/tests/ -v -p no:cacheprovider` | **Exit 1** on Python 3.14.5: collection stopped with four import errors (`sqlalchemy` in three modules, `fastapi` in one). One parser test was collected but not run in that invocation. No full-suite pass can be claimed. |
| `PYTHONPATH=services/api python -m pytest services/api/tests/test_indexing.py -v -p no:cacheprovider` | **Exit 0:** `1 passed in 0.04s` on Python 3.14.5. This does not verify the project target runtime. |

Both commands set `PYTHONDONTWRITEBYTECODE=1` in the PowerShell process. No dependencies were installed, no model weights were downloaded, and no paid inference was triggered.

## Environment and real Meta inference status

- `py -0p` lists only Python **3.14**; `python --version` reports **3.14.5**. Python **3.13**, the project target and `Dockerfile.api` base image, is missing locally. No `.venv` Python was found.
- The global 3.14 installation has `pytest 9.1.1`, `networkx 3.7`, and `httpx 0.28.1`, but `fastapi`, `pydantic`, `sqlalchemy`, and `mcp` are absent. The backend suite and application cannot be verified in this environment without a Python 3.13 environment and required dependencies. The repository's `requirements.txt` provides the dependency list; installation requires user authorization under the task instructions.
- `.env.example` selects `META_AI_PROVIDER=offline_demo`; no local `.env` exists, and `META_AI_API_KEY` is absent from the current process environment. The configured base URL and model string are template defaults, not evidence of an authorized endpoint or a successful live call. The official endpoint/model and team access have not been verified. No real Meta inference or latency was measured.
- Existing numerical claims in `README.md` and `docs/EVALUATION.md` (including latency, token reduction, and impact/grounding gains) have no reproducible fixture, measured output, denominator, or run record in this repository. They must be treated as unverified claims until SG-AI-06 measures them.

## Contract compatibility and boundaries

- Keep `AnalysisRun.result_json` keys used by REST, MCP, and `apps/web/src/types/index.ts`: `affected_items`, `risks`, `suggested_tests`, `assumptions`, `coverage_review`, `validation_metrics`, `rejected_hallucinations`, and `operational_metadata`. Preserve item keys such as `file_path`, `impact_type`, `confidence`, `is_verified_fact`, snippet, and line numbers while adding more precise grounding fields.
- The frontend `RepoContext`, `ReportPanel`, `EvidenceDrawer`, and graph page consume affected paths and direct/indirect labels; `EvidenceDrawer` presents `is_verified_fact` as AST/path validation. Any changed meaning or field name needs contract review. `ReportPanel` displays the model from `operational_metadata`, so accurate demo/live labels matter.
- MCP `analyze_change` returns serialized `{status, analysis_id, result, brief}`. `get_relevant_context` returns `{repository_id, query, context_items}` with path, language, score, symbols, and preview. `suggest_tests` returns existing and proposed test lists. Preserve these envelopes when sharing retrieval logic.
- The requested implementation scope is AI provider, analysis, graph, evidence, associated tests, and evaluation documents/scripts. Frontend, authentication, database schema, deployment, and unrelated backend changes need a demonstrated need and explicit approval. Workspace sandboxing and `EvidenceValidator` must remain in the report path.

## Proposed sequence and file ownership

| Order | Task and files | Dependency / acceptance focus |
| --- | --- | --- |
| 1 | **SG-AI-01:** `evidence/validator.py`, `tests/test_validator.py` | Exact file-symbol pairing, safe/unique paths and snippets, separate existence versus impact support, honest metrics; preserve report fields. |
| 2 | **SG-AI-02:** `ai/provider.py`, optional `ai/schemas.py`, `core/config.py`, `tests/test_ai_provider.py` | Validated model JSON, bounded transient retries, accurate metadata and explicit failures; preserve provider interface. |
| 3 | **SG-AI-03:** new `analysis/retriever.py`, `analysis/orchestrator.py`, relevant graph code/tests | Deterministic ranking and budget, repository isolation; compare against the current keyword baseline on the same fixtures. |
| 4 | **SG-AI-04:** `graph/engine.py`, `analysis/orchestrator.py`, provider context, graph/e2e tests | Direction, depth, cycles, stable impact paths, and validated review candidates. |
| 5 | **SG-AI-05:** provider/config, `.env.example`, opt-in e2e smoke test, architecture docs | Verify authorized Meta endpoint/model before config changes. Live inference requires credentials and explicit approval for paid calls. |
| 6 | **SG-AI-06:** evaluation fixture/tests, `scripts/evaluate_ai_core.py`, evaluation/demo docs | Human-labeled retrieval versus impact ground truth, machine-readable measured metrics and denominators; separate demo from live results. |

**Dependency map:** SG-AI-01 establishes trustworthy output; SG-AI-02 constrains model input to that gate; SG-AI-03 supplies ranked context; SG-AI-04 uses that context and graph paths; SG-AI-05 exercises the combined pipeline with authorized live inference; SG-AI-06 measures the offline and live pipelines separately. `analysis/orchestrator.py` is shared by SG-AI-03/04, and `ai/provider.py` by SG-AI-02/04/05; changes to each should stay within the active task's acceptance tests.

The next step requested by the task is user review and approval of this plan before SG-AI-01 implementation. Each task should then be delivered as a small reviewed change with targeted and full regression results before the next task begins.
