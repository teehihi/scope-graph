# ScopeGraph — project plan and progress

Updated: 2026-10-29 (Asia/Bangkok). This is the team-level status for the **whole product**. The detailed AI workstream and score definitions remain in [AI_CORE_PLAN_AND_PROGRESS.md](AI_CORE_PLAN_AND_PROGRESS.md) and [EVALUATION.md](EVALUATION.md).

## Current snapshot

- Working branch: `ai/evidence-grounding-v2`. Its reviewed code baseline includes merge commit `2f01a7b171d41dde757da5ba9f0f4b9fa3d1f020`; `origin/main` at `5d6546387521d06f239a144ab1ae1db29ae8f5e7` was merged. Use `git rev-parse HEAD` for the current branch tip after later documentation commits.
- Product stage: **working local prototype, with release and accuracy gates open**. A successful build and automated tests do not establish production readiness or generalization to other repositories.
- Packaging state at this snapshot: the FastAPI RealWorld candidate fixture, source snapshot, review records, integrity test, and false-positive analysis are prepared for branch review. The local `review-output/` ZIP and manifest are private handoff artifacts and must remain outside Git. Consult `git status` for the current checkout state.
- Status terms: **Implemented** means a code path exists and has relevant automated coverage; **Partial** means the feature works only under stated limits; **Pending verification** means code/configuration exists but the integrated behavior has not been verified here; **Planned** means no complete implementation is evidenced.

## Product workstreams

| Area | Status | Evidence and present limit |
| --- | --- | --- |
| Repository ingestion | **Implemented with limits** | [Repository routes](../services/api/app/api/routes/repositories.py) support ZIP upload, sandboxed extraction, sample loading, indexing, and GitHub OAuth-backed archive import. GitHub import downloads an archive; it is not a `git clone` workflow. GitHub OAuth and private-repository import have not had a live integration check in this snapshot. |
| Source indexing | **Python implemented; TypeScript/JavaScript partial** | [Python AST parser](../services/api/app/indexing/parser.py), [indexer](../services/api/app/indexing/engine.py), and [scanner](../services/api/app/indexing/scanner.py) index files, symbols, imports, and resolvable calls. The new [TS/JS parser](../services/api/app/indexing/ts_parser.py) uses lightweight text/regex extraction and has [focused tests](../services/api/tests/test_ts_indexing.py); it is not a full AST parser. Go symbol/call analysis and dynamic-language call resolution remain open. |
| Graph and evidence | **Implemented with static-analysis limits** | [Graph engine](../services/api/app/graph/engine.py) builds and traverses indexed dependencies; [validator](../services/api/app/evidence/validator.py) checks file/symbol existence and returns line-grounded snippets. Existing indexed repositories need reindexing for newer edge rules. Existence and graph proximity do not prove that a file must be edited. |
| AI analysis and providers | **Implemented; quality work open** | [Orchestrator](../services/api/app/analysis/orchestrator.py) interprets, retrieves, traverses, reasons, reviews, grounds, and builds a brief. [Provider adapter](../services/api/app/ai/provider.py) supports deterministic offline demo and configured HTTP providers. [Causal verifier](../services/api/app/analysis/causal.py) separates supported and potential impacts. An authorized three-case Meta evaluation exists, but broad accuracy is unproven. |
| Screenshot-to-Impact | **Backend REST implemented; frontend and production access pending** | The [synchronous upload route](../services/api/app/api/routes/analysis.py) accepts PNG/JPEG plus text, fully decodes and removes image metadata, then uses the grounded analysis pipeline. [The contract](SCREENSHOT_TO_IMPACT_CONTRACT.md) records the existing access-control gap and the need for an upstream multipart body limit. The [six-case offline comparison](MULTIMODAL_EVALUATION_V1.md) uses scripted visual intent, not a live vision model. |
| REST, MCP, jobs, persistence | **Implemented** | [FastAPI app](../services/api/app/main.py) exposes repository, analysis, health, and auth routes; [MCP server](../services/api/app/mcp/server.py) exposes three tools. [Queue](../services/api/app/jobs/queue.py) supports Redis RQ with an in-process fallback. [Database models](../services/api/app/db/models.py) and [Alembic](../services/api/alembic/) support persistence. Full-stack deployment behavior was not reverified for this snapshot. |
| Web app and graph exploration | **Implemented; browser review open** | [React app](../apps/web/src/) contains dashboard, repositories, graph, impact report, source evidence drawer, sample flow, onboarding, and GitHub import UI. [ReportPanel](../apps/web/src/components/ReportPanel.tsx) displays direct, indirect, and potential impacts. TypeScript/Vite build passes; the newly merged UI paths still need an integrated browser check with a running API. |
| Account and access control | **Partial; release blocker** | [GitHub OAuth routes](../services/api/app/api/routes/auth.py) exchange codes and list repositories, while [AuthContext](../apps/web/src/context/AuthContext.tsx) persists the user and GitHub token in browser `localStorage`. There is no verified ScopeGraph backend session/user ownership boundary. Repository and runtime-settings routes do not enforce a user session. The token is also supplied as a query parameter when listing GitHub repositories. Review authentication, authorization, token handling, and deployment exposure before a public launch. |
| AI settings and localization | **Implemented in UI/API; operational review open** | [Settings page](../apps/web/src/pages/app/Settings.tsx) calls [system settings routes](../services/api/app/api/routes/health.py); [language context](../apps/web/src/context/LanguageContext.tsx) has 12 UI languages and passes selected language to analysis. Settings mutate the running process and have no persisted, per-user configuration or authorization boundary. Automated parity checks pass; translated copy and generated explanations still need human review. |
| Deployment and release | **Configured; pending verification** | [Docker Compose](../docker-compose.yml) defines web, API, worker, PostgreSQL, and Redis. [README](../README.md) documents local and container startup. No current Docker Compose launch, live GitHub OAuth run, or production security review is recorded. [Hackathon submission](HACKATHON_SUBMISSION.md) remains a draft with a pending video link. |
| Evaluation and holdout | **Development evaluation complete; provisional holdout evaluated offline** | The [17-case v3 fixture](../services/api/tests/evaluation/ai_core_cases_v3.json) has 25 direct and 10 indirect labels after AI-assisted source review. The separate [10-case RealWorld v2 candidate](../services/api/tests/evaluation/holdout_realworld_cases_v2.json), pinned to `029eb7781c60d5f563ee8990a0cbfb79b244538c`, has 10 direct and 15 indirect labels. Its [provisional offline evaluation and replay](HOLDOUT_EVALUATION_REPORT.md) are complete. Independent [human sign-off](HOLDOUT_HUMAN_SIGNOFF_V2.md) and freezing remain pending; no paid holdout inference was run. |

## Verification and measured quality

| Check | Latest recorded result on merged branch | Scope |
| --- | --- | --- |
| Backend suite | `172 passed, 1 skipped` on 2026-10-29 with `META_AI_PROVIDER=offline_demo`; the skip is the opt-in live smoke. | Includes screenshot upload, evaluation and holdout integrity tests; no paid inference. |
| Frontend production build | `npm run build` passed on 2026-10-28. | TypeScript and Vite build; Vite reported a non-failing bundle-size warning. |
| Localization audit | `node scripts/audit_i18n.js` passed: 299 keys in each of 12 languages; its scan reported no hardcoded non-English UI strings. | Key parity/static audit, not a human translation review or proof that every English string is localized. |
| Evaluation replay | Saved 17-case offline predictions replay deterministically against v3 labels: micro strict **20 TP / 45 FP / 15 FN**, precision **0.308**, recall **0.571**, F1 **0.400**. | Label-only replay, not a model improvement or a new inference run; see [evaluation details](EVALUATION.md). |
| False-positive audit | [SG-AI-10 analysis](SG_AI_10_FALSE_POSITIVE_ANALYSIS.md) classifies the 45 final strict false-positive pairs: provider reasoning 31, causal support 13, impact type 1. | Findings concern the deterministic offline provider and the small development fixture; they are not Meta or production error rates. |

The earlier authorized live Meta run used only three sample scenarios. Its results and the later replayable three-case run are documented separately in [EVALUATION.md](EVALUATION.md); they are diagnostic and are not a controlled before/after comparison. The RealWorld holdout has an **offline demo score only**, reported in [HOLDOUT_EVALUATION_REPORT.md](HOLDOUT_EVALUATION_REPORT.md). No browser, Docker, live OAuth, or live vision result is inferred from the automated checks above.

Reproduce the local checks from the repository root in PowerShell, using a new unused `--basetemp` directory for each pytest run:

```powershell
$env:META_AI_PROVIDER='offline_demo'
$env:PYTHONPATH='services/api'
.\.venv\Scripts\python.exe -m pytest services/api/tests/ -v -p no:cacheprovider --basetemp data/pytest-NEW-UNUSED-DIR --tb=short
cd apps/web
npm run build
cd ../..
node scripts/audit_i18n.js
```

## Prioritized remaining work

1. **Access and release safety:** define backend identity and repository ownership; protect repository and runtime-settings endpoints; review GitHub token storage/transport. Verify the OAuth callback, private archive import, and failure paths with a running stack before public exposure.
2. **AI Core accuracy:** use the [SG-AI-10 evidence and proposed SG-AI-11 plan](SG_AI_10_FALSE_POSITIVE_ANALYSIS.md) to tighten requirement-specific causal support and improve the deterministic offline provider. Keep development evaluation separate from the holdout; do not tune against final holdout scores.
3. **Independent labels:** obtain named human sign-off for the [17-case v3 review](AI_CORE_LABEL_REVIEW_V3.md) and [RealWorld holdout v2](HOLDOUT_HUMAN_SIGNOFF_V2.md). Freeze the holdout with its fixture hash and source manifest only after that decision.
4. **Integrated product verification:** run the browser flow for sample load, ZIP upload, GitHub import, graph, evidence drawer, analysis, potential impacts, language selection, and settings. Run Docker Compose health and worker/Redis behavior in the target environment; record failures and fixes.
5. **Coverage and release materials:** decide the intended TS/JS/Go indexing scope, add tests for chosen language features, review accessibility and translations with people, and finish the demo/submission evidence. Update [AGENTS.md](../AGENTS.md) and broad marketing/architecture claims once those statuses are verified; some of their component summaries predate the latest `main` merge.

## How to keep this file current

Update the branch/commit, Git state, component status, verification date and command output, measured denominators, and next actions after each material merge or milestone. Keep historical metrics tied to their dataset version, repository snapshot, provider, and inference commit. Mark an integration as verified only after exercising that integration. Record human review separately from AI-assisted review, and link new decision records rather than silently changing old fixtures.
