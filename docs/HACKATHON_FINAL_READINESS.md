# ScopeGraph — Hackathon final readiness audit

Audit date: **2026-10-31**. Safe local checks only. No paid inference, public deployment, merge, push, holdout edit or benchmark-driven tuning was performed in this audit.

## 1. Current Git state

| Item | Verified state |
| --- | --- |
| Branch | `ai/evidence-grounding-v2` |
| HEAD | `7940f394c0f57ca3901acc652756dc60f2513576` |
| Relation to `origin/main` | 0 commits behind, 6 branch-only commits ahead at audit time |
| Relation to branch upstream | In sync with `origin/ai/evidence-grounding-v2` at audit start |
| Uncommitted work at audit start | Clean |
| Audit edits | This report and `docs/HACKATHON_SUBMISSION.md`; both were uncommitted at audit handoff |

The project and AI Core progress files contain historical status entries, including stale push/merge statements. Git was checked directly. This audit did not fetch the server, so `origin/main` refers to the local remote-tracking ref and may not be the latest remote state.

## 2. Feature readiness and provider evidence

| Feature | Locally verified | Limit |
| --- | --- | --- |
| Python indexing, graph, source evidence | Existing API and full backend suite; browser mock report showed source-backed items | Evidence gate verifies indexed references, not the necessity of each edit |
| Text-only analysis | Local REST `POST /analyze` completed with `offline_demo`; no `visual_context` | Deterministic demo output, not live Meta reasoning |
| Screenshot upload and UI | Browser-tested PNG/JPEG through screenshot route with a local mocked vision provider; loading, visual note, impact, potential and evidence states appeared | No new live full-pipeline Meta screenshot run |
| Input errors | Browser-tested invalid type, MIME mismatch, overlarge file, empty requirement and provider failure | Local mock/offline settings only |
| Meta vision | Historical single real `muse-spark-1.3` interpretation on a synthetic PNG; structured visual schema passed | Vision step only; no retrieval or impact validation in that request |
| Multi-AI Baseten/Modal | Opt-in routing and mock tests exist | Partner deployments and behavior unverified live; exclude from dependable demo |

**Recommended profile: `AI_PROVIDER_PROFILE=meta_only`.** Use `META_AI_PROVIDER=offline_demo` for repeatable local text preparation and disclose it. A live screenshot recording requires a configured Meta key, new paid-request approval and a successful full-pipeline rehearsal. There is no usable app Meta key in the current local configuration. The prior SG-AI-22 single-call approval was consumed and cannot authorize another call.

## 3. Actual local verification

All model tests below were offline or mocked. Headless Chrome DevTools actually opened local Vite on `127.0.0.1:5173` and a mock API on `127.0.0.1:8001`, backed by a copy of the SQLite database. The regular local API on `127.0.0.1:8000` and Vite returned HTTP 200 before testing. Mock harness files under ignored `data/` are local tools, not checked-in reproduction assets.

| Check | Observed result |
| --- | --- |
| Browser PNG, synthetic `account_email.png` | Passed: loading, visual note, direct/potential distinctions, source evidence; exactly one mock vision request |
| Browser JPEG | Passed: same states and one mock request |
| Browser invalid input | Passed: type warning, MIME mismatch rejection, size warning, requirement control disabled when empty |
| Browser provider error | Passed: error shown, UI returned to ready state, no mock request |
| REST screenshot through mock | HTTP 200/completed; `visual_context.provider=sg_ai_23_local_mock`, `screen_type=account settings`, 5 `affected_items`, 9 `potential_impacts`, 4 impacted items with source evidence including `app/api/verification.py`; no image data URL in report |
| REST text-only | HTTP 200/completed; no `visual_context` |
| Full backend | **211 passed, 1 skipped**, 33.21 s, isolated SQLite and `offline_demo` |
| Frontend tests | `node --test tests/*.test.mjs`: **5 passed** |
| Frontend build | `npm run build`: **passed**, Vite 6.4.5; bundle-size warning (~836.73 KB) |
| Localization | `node scripts/audit_i18n.js`: **passed**, 314 keys per language across 12 languages |
| Saved prediction replay | Deterministic micro/macro metrics and 17 case scoring details; strict micro 20 TP, 31 FP, 15 FN, F1 0.46511628 |
| Docker Compose syntax | `docker-compose -f docker-compose.yml config --quiet`: passed |
| Docker runtime | **Unavailable:** Engine named pipe missing; no container, proxy or migration run |

Browser checks establish the mock upload-to-report UI/API contract. They do not measure vision accuracy or prove real Meta end-to-end behavior. No fixture or holdout ground truth changed. The 17-case and RealWorld holdout labels remain provisional; do not tune against final holdout scores.

## 4. Readiness classification

**Current classification: `INTEGRATION BLOCKED` for a live Meta screenshot demo and `PUBLIC RELEASE BLOCKED` for internet exposure.** A clearly labeled local offline/mock walkthrough is available.

| Label | Criteria and current position |
| --- | --- |
| `DEMO READY` | Local offline text and mocked screenshot walkthrough can be recorded now if disclosed. A **live Meta screenshot** demo reaches this label only after a new authorized end-to-end rehearsal succeeds with the actual key/model and line-backed report. Video URL and portal requirements are still outstanding for submission. |
| `INTEGRATION BLOCKED` | No usable app Meta key in local config and no paid approval for this audit; Baseten/Modal endpoints unconfigured and unverified. |
| `PUBLIC RELEASE BLOCKED` | Missing repository/report authorization, unauthenticated development inference settings, and deployment/privacy controls prevent internet exposure. |

## 5. Security and deployment findings

| Area | Evidence and risk | Owner action |
| --- | --- | --- |
| Repository/report authorization | Repository list/get/delete/upload/index/graph and analysis/report routes accept IDs without user-scoped authorization. `owner_email` is not identity proof. | Backend/security: implement identity, ownership and route guards before public release |
| Runtime provider settings | `/system/info` redacts the custom key. Production returns 403 for `/system/settings` and `/system/test-ai`; development leaves both unauthenticated and able to change provider or trigger inference. Analysis routes also need spend control. | Backend/security: authentication, authorization, budgets; localhost-only development |
| Outbound endpoints | Opt-in Multi-AI routing uses HTTPS host/path allowlists and capability checks. Meta-only configured HTTP provider URL lacks equivalent global outbound policy. | Backend/security: central destination policy and SSRF review |
| Request size | Screenshot body is bounded before multipart parsing at image limit plus form overhead; Nginx screenshot route has 6 MB limit. Final proxy/direct API behavior needs deployment testing. | Backend/deployment |
| GitHub token | Frontend token persists in `localStorage` and can be sent as a query parameter for GitHub repository listing, exposing it to history or logs. | Frontend/auth with backend owner |
| Compose | Config parses, but Engine was unavailable. Stack publishes API, PostgreSQL and Redis ports and has development settings. | Deployment: isolated staging and locked-down release config |

Do not make broad authentication changes during this audit. Keep development servers on `127.0.0.1` and use non-sensitive sample data.

## 6. Local demo environment

Run from the repo root with the existing virtual environment and installed web dependencies. Process-specific overrides prevent stale local PostgreSQL/provider settings from affecting the offline demo. Put credentials only in ignored `.env`; never put them in a command, screenshot or submission.

```powershell
# Terminal A: backend, offline and local
$env:DATABASE_URL = 'sqlite:///D:/scope-graph/data/scopegraph.db'
$env:AI_PROVIDER_PROFILE = 'meta_only'
$env:META_AI_PROVIDER = 'offline_demo'
$env:META_AI_API_KEY = ''
Set-Location D:\scope-graph\services\api
..\..\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

```powershell
# Terminal B: web, local
Set-Location D:\scope-graph\apps\web
npm run dev -- --host 127.0.0.1
```

Open `http://127.0.0.1:5173/` and verify API health before recording. Use a dedicated non-sensitive sample index; load the bundled sample if absent. Screenshot analysis requires vision and will return a provider error under `offline_demo`. The ignored mock harness used here is not reproducible from a clean checkout; checked-in tests cover the contract.

## 7. Three-minute demo script

Suggested length only; the official form's video requirement must be checked. Capture the exact provider/profile and repository snapshot. Keep keys, private paths and tokens off-screen.

| Time | Screen and narration | Capture |
| --- | --- | --- |
| 0:00–0:20 | “A small requirement can affect routes, services and tests. ScopeGraph maps the likely impact before editing.” | Landing/dashboard and public sample repository |
| 0:20–0:45 | Open indexed repository and graph. “The index records real Python symbols and edges.” | Name, indexing status, selected graph node |
| 0:45–1:25 | Submit “Require email verification before users can change their email address.” “The report separates direct edits, dependencies and possible risks.” | Requirement, loading, report; label `offline_demo` when used |
| 1:25–1:55 | Open affected file and line snippet. “Source references are checked against the indexed repository.” | Path, symbol, lines; existence does not prove edit necessity |
| 1:55–2:30 | If a newly authorized live Meta end-to-end rehearsal passed, upload the synthetic account-email PNG. Otherwise show the historical one-call vision artifact as “vision smoke only,” or a clearly labeled mock walkthrough. “Visual observations and source-backed impacts are separate.” | Screenshot provenance, visual context, potential and verified code evidence, actual provider |
| 2:30–3:00 | Show brief and regression test suggestion. “Human review resolves remaining uncertainty.” | Brief, risks, evidence, repository link and limits |

Recommended stills: indexed repository/graph, text requirement/report, source evidence drawer, visual context beside code impacts with an honest provider label, final brief. Do not depict unverified Multi-AI as live.

## 8. Submission checklist and ownership

| Owner | Next action | Gate |
| --- | --- | --- |
| Project/submission | Confirm accepted status, **Indie developer** or **Startup** track, theme, form fields, rules and deadline in the [official event portal](https://dev.meta.ai/events/global-hackathon). Public page currently says 2026-11-04 9 PM ET, subject to change. | Submission |
| Demo | Choose disclosed offline/mock path or authorized Meta live rehearsal; record video, verify access, add actual URL to submission draft. | Submission |
| AI integration | For live screenshot: configure ignored `.env`, obtain fresh paid budget, run one controlled end-to-end case, record model/latency/usage, manually compare image and result. | Live demo |
| Backend/security | Add repository/report guards, inference/settings control and outbound policy before internet-facing deployment. | Public release |
| Frontend/auth | Coordinate token storage/query handling with backend identity design; keep 12-language gate. | Public release |
| Deployment | Bring up isolated staging with Docker Engine; verify migrations, proxy limits, exposed ports, secrets and health. | Public release |
| Evaluation | Preserve provisional 17-case and RealWorld labels; obtain independent human sign-off; report denominators and snapshots. Avoid final holdout tuning. | Accuracy claims |
| Legal/submission | Check root MIT, third-party dependency/font notices, RealWorld MIT attribution if shown, and hackathon disclosure rules. | Submission |

The [submission draft](HACKATHON_SUBMISSION.md) contains verified claims. Video URL, track and official form details remain open; no successful submission is claimed.
