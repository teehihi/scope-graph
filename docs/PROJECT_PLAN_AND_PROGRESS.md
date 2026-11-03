# ScopeGraph — project plan and progress

Updated: 2026-11-03 (Asia/Bangkok). This is the team-level status for the **whole product**. The detailed AI workstream and score definitions remain in [AI_CORE_PLAN_AND_PROGRESS.md](AI_CORE_PLAN_AND_PROGRESS.md) and [EVALUATION.md](EVALUATION.md).

## Current snapshot

- Working branch: `main` at `ec230f5` with active user subscription & billing, floating assistant, voice requirements & vibecoder impact story, hierarchical cluster graph, and 12-language i18n parity. Use `git rev-parse HEAD` and `git status` for exact local state.
- Product stage: **Full-featured interactive code impact analysis platform with production hardening, voice requirements, vibecoder story modes, hierarchical cluster graph navigation, floating assistant chatbot, billing/subscription quota management, and complete 12-language localization.**
- Status terms: **Implemented** means a code path exists and has relevant automated coverage; **Partial** means the feature works only under stated limits; **Pending verification** means code/configuration exists but the integrated behavior has not been verified here; **Planned** means no complete implementation is evidenced.

## Product workstreams

| Area | Status | Evidence and present limit |
| --- | --- | --- |
| Repository ingestion | **Implemented with limits** | [Repository routes](../services/api/app/api/routes/repositories.py) support ZIP upload, sandboxed extraction, sample loading, indexing, and GitHub OAuth-backed archive import. Cloud database connection configured for Neon PostgreSQL (`7e46367`), dynamic port binding for Render (`7577778`), and SPA routing for Vercel (`9890ae4`). Direct `git clone` workflows remain planned. |
| Source indexing | **Python implemented; TypeScript/JavaScript partial** | [Python AST parser](../services/api/app/indexing/parser.py), [indexer](../services/api/app/indexing/engine.py), and [scanner](../services/api/app/indexing/scanner.py) index files, symbols, imports, and resolvable calls. The [TS/JS parser](../services/api/app/indexing/ts_parser.py) uses lightweight text/regex extraction and has [focused tests](../services/api/tests/test_ts_indexing.py); it is not a full AST parser. Go symbol/call analysis remains open. |
| Graph and evidence | **Implemented** | [Graph engine](../services/api/app/graph/engine.py) builds and traverses indexed dependencies; [validator](../services/api/app/evidence/validator.py) checks file/symbol existence and returns line-grounded snippets. Features hierarchical cluster architecture with smooth drill-down and hover isolation (`dc49e07`), vertical layout dock, cluster selector dropdown, and interactive walkthrough tour (`6ca22ce`). |
| Spoken Voice & Vibecoder Impact Story | **Implemented** | Spoken voice input route ([voice.py](../services/api/app/api/routes/voice.py)) with real-time waveform, VAD silence auto-detection, and Meta Muse Spark requirement refinement. Vibecoder mode translates code changes to plain-language consequences (`screen_location`, `user_consequence`), copyable agent prompts, interactive grounded follow-up Q&A, and manual acceptance checklists. |
| AI Floating Assistant (Scout) | **Implemented** | Interactive floating chatbot widget ([FloatingAssistant.tsx](../apps/web/src/components/FloatingAssistant.tsx), [assistant.py](../services/api/app/api/routes/assistant.py)) providing context-aware guidance, repository exploration assistance, and impact explanation. |
| User Accounts, Billing & Entitlements | **Implemented** | Subscription & quota engine ([billing/](../services/api/app/billing/), [billing.py](../services/api/app/api/routes/billing.py), [UpgradeModal.tsx](../apps/web/src/components/UpgradeModal.tsx)). Database models for `User`, `Subscription`, and `BillingEvent` with Alembic migration (`8c3a21f7b904`). Supports 3 tiers (`FREE`, `PRO`, `ENTERPRISE`), Stripe Checkout and Customer Portal sessions, credit tracking, and quota enforcement. |
| AI analysis and providers | **Implemented; quality work open** | [Orchestrator](../services/api/app/analysis/orchestrator.py) interprets, retrieves, traverses, reasons, reviews, grounds, and builds a brief. [Provider adapter](../services/api/app/ai/provider.py) supports deterministic offline demo and configured HTTP providers. [Causal verifier](../services/api/app/analysis/causal.py) separates supported and potential impacts. An authorized three-case Meta evaluation exists, but broad accuracy is unproven. |
| Provider routing by pipeline stage | **Implemented locally; mock-tested, live partner verification pending** | [Multi-AI architecture](MULTI_AI_ARCHITECTURE.md) adds one opt-in stage router to the same orchestrator. Meta-only remains the default; Baseten Vision and Modal Reasoning use explicitly configured, restricted endpoints, capabilities and request budgets. The [17-case offline comparison](MULTI_AI_EVALUATION.md) tests routing and replay, not partner model quality. |
| Screenshot-to-Impact | **Integrated local browser/API verification complete; public release blocked** | The [synchronous upload route](../services/api/app/api/routes/analysis.py) accepts PNG/JPEG plus text, fully decodes and removes image metadata, then uses the grounded analysis pipeline. [SG-AI-23](SG_AI_23_FINAL_VALIDATION.md) and Multi-AI local checks exercised browser upload, validation, report distinctions and source evidence with a mock provider. [SG-AI-22](SCREENSHOT_TO_IMPACT_LIVE_TEST.md) was one live Meta vision interpretation only. |
| REST, MCP, jobs, persistence | **Implemented** | [FastAPI app](../services/api/app/main.py) exposes repository, analysis, health, auth, voice, assistant, and billing routes; [MCP server](../services/api/app/mcp/server.py) exposes three tools. [Queue](../services/api/app/jobs/queue.py) supports Redis RQ with an in-process fallback. [Database models](../services/api/app/db/models.py) and [Alembic](../services/api/alembic/) support persistence. |
| Web app and visualizer | **Implemented** | [React app](../apps/web/src/) contains modernized landing page with Brand Kit v2, interactive simulator, full legal documentation (Terms of Service, Privacy Policy), authenticated user profile navigation with `/default-avatar.webp` and seamless dashboard redirect, repositories, graph, impact report, source evidence drawer, onboarding, and GitHub import UI. |
| Localization | **Implemented across 12 languages** | [LanguageContext](../apps/web/src/context/LanguageContext.tsx) supports 12 languages (`en`, `vi`, `ja`, `ko`, `zh`, `es`, `fr`, `de`, `hi`, `th`, `it`, `ru`). Automated audit verified 100% key parity across all 675 translation keys with zero unlocalized hardcoded strings in UI components. |
| Deployment and release | **Configured & deployed** | [Docker Compose](../docker-compose.yml) defines web, API, worker, PostgreSQL, and Redis. Configured for Render backend deployment (dynamic `$PORT`), Neon serverless PostgreSQL, and Vercel frontend SPA deployment. |
| Evaluation and holdout | **Development evaluation complete; provisional holdout evaluated offline** | The [17-case v3 fixture](../services/api/tests/evaluation/ai_core_cases_v3.json) has 25 direct and 10 indirect labels after AI-assisted source review. The separate [10-case RealWorld v2 candidate](../services/api/tests/evaluation/holdout_realworld_cases_v2.json), pinned to `029eb7781c60d5f563ee8990a0cbfb79b244538c`, has 10 direct and 15 indirect labels. Its [provisional offline evaluation and replay](HOLDOUT_EVALUATION_REPORT.md) are complete. |

## Verification and measured quality

The project maintains automated regression suites across backend API, frontend TypeScript compilation, and 12-language internationalization.

| Check | Latest recorded result on merged branch | Scope |
| --- | --- | --- |
| Backend suite | **246 passed, 1 skipped** on 2026-11-03 (`PYTHONPATH=.:services/api pytest services/api/tests/ -q`). | Includes stage routing, billing & entitlements, voice & vibecoder, provider, screenshot, evaluation, replay and holdout integrity tests. Used isolated SQLite test environment. |
| Frontend production build | `npm run build` (`tsc && vite build`) passed on 2026-11-03. | TypeScript 5.7+ strict checking and Vite 6 bundle compilation completed cleanly. |
| Localization audit | `node scripts/audit_i18n.js` passed on 2026-11-03: **675 keys in each of 12 languages with 100% parity**. | Automated scan confirmed zero hardcoded non-English strings across all UI components. |
| Live screenshot interpretation | [SG-AI-22](SCREENSHOT_TO_IMPACT_LIVE_TEST.md) completed exactly one approved `muse-spark-1.3` request: schema-valid visual intent, 6.546 s provider latency, 2,702 reported tokens. | One synthetic image only; no live full impact pipeline, provider comparison, or broad vision accuracy claim. |
| Evaluation replay | After the first [SG-AI-11 model intent gate](SG_AI_11_MODEL_INTENT_GATE.md), the 17-case v3 offline development run and deterministic replay report micro strict **20 TP / 31 FP / 15 FN**, precision **0.392**, recall **0.571**, F1 **0.465**. | Same provisional labels and local source bytes; reduction comes from causal classification, not a new model. |
| False-positive audit | [SG-AI-10 analysis](SG_AI_10_FALSE_POSITIVE_ANALYSIS.md) classifies the 45 final strict false-positive pairs: provider reasoning 31, causal support 13, impact type 1. | Findings concern the deterministic offline provider and the small development fixture; they are not Meta or production error rates. |

Reproduce the local checks from the repository root:

```bash
# 1. Backend tests
PYTHONPATH=.:services/api ./.venv/bin/pytest services/api/tests/ -q

# 2. Frontend production build
cd apps/web && npm run build && cd ../..

# 3. Localization audit (12 languages)
node scripts/audit_i18n.js
```

## Prioritized remaining work

1. **Stripe webhook live verification & production secrets:** connect live Stripe webhook signing secret for production payment confirmations and invoice events.
2. **Multi-provider live verification:** review the [opt-in local implementation](MULTI_AI_INTEGRATION.md) and validate actual Baseten vision-capable and Modal reasoning deployments when credentials and approved request budgets are provisioned.
3. **AI Core accuracy and labels:** continue the [SG-AI-10 plan](SG_AI_10_FALSE_POSITIVE_ANALYSIS.md) for operation-specific service and downstream-call evidence without tuning against the holdout. Obtain named human sign-off for [17-case v3](AI_CORE_LABEL_REVIEW_V3.md) and [RealWorld v2](HOLDOUT_HUMAN_SIGNOFF_V2.md).
4. **Direct Git clone ingestion:** implement native background `git clone` alongside existing ZIP archive upload and GitHub OAuth archive fetch.
5. **Multi-Language AST expansion:** expand beyond regex TS/JS parser towards full tree-sitter or AST parsing for TypeScript, JavaScript, and Go.

## How to keep this file current

Update the branch/commit, Git state, component status, verification date and command output, measured denominators, and next actions after each material merge or milestone. Keep historical metrics tied to their dataset version, repository snapshot, provider, and inference commit. Mark an integration as verified only after exercising that integration. Record human review separately from AI-assisted review, and link new decision records rather than silently changing old fixtures.
