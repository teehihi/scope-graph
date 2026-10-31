# Multi-AI security follow-up — 2026-10-30

Status: **offline hardening verified; public release blocked**. This follow-up continues the local handoff in [Multi-AI integration](MULTI_AI_INTEGRATION.md). It does not claim a live Baseten or Modal run.

## Confirmed defects addressed

1. `GET /api/v1/system/info` previously returned `CUSTOM_USER_API_KEY` verbatim. It now returns an empty `custom_api_key` field while retaining `has_api_key` and `api_key_source`. A client can replace or reset the runtime key but cannot read it back. The same router is also mounted at the root path.
2. In `ENVIRONMENT=production`, unauthenticated `PUT /system/settings` and `POST /system/test-ai` now return 403 before changing configuration or making inference. This closes those two default-production entry points while backend identity and administrative authorization remain undecided. Development-mode endpoints are still intended for local use only.
3. Screenshot request size is now bounded at the ASGI boundary before Starlette parses multipart fields. The limit is `MAX_SCREENSHOT_BYTES + 1,000,000` bytes, including framing and requirement text. Both a declared `Content-Length` and a chunked body without it return JSON 413 when over the limit. The Docker web Nginx route has a dedicated 6 MiB ceiling; the ASGI default of 6,000,000 bytes is the stricter gate. ZIP archive upload retains its existing, separate limit.
4. Production text and screenshot analysis routes now return 403 before repository lookup when the selected profile/provider would use live inference. The offline demo remains available. This is an interim spending gate, **not** repository authorization: a production deployment configured for Meta or Multi-AI cannot serve live analyses until authenticated access is designed and implemented.

The bounded screenshot middleware holds at most one allowed multipart body in memory before handing it to FastAPI. It does not retain the body after the request. If an operator raises `MAX_SCREENSHOT_BYTES`, the Nginx limit must be reviewed together with it. The Nginx configuration change has not been syntax-checked against a running container because Docker Engine is unavailable in this workspace.

## Partner live-test preparation

`scripts/smoke_partner_stages.py` now supports a separate preflight for `baseten_vision` and `modal_reasoning`. Each live stage has a hard one-request transport, zero retries and fallback, a 1–60 second timeout, a marker written before inference, and an ignored, sanitized result under `data/`. The Baseten case uses the owned synthetic screenshot from SG-AI-22; the Modal case uses the indexed sample repository's `app/services/user_service.py`. Modal output is marked as unverified model claims, not source-backed impact. The runner does not print keys, source bodies, image bytes, prompts or raw provider responses.

```powershell
.\.venv\Scripts\python.exe scripts/smoke_partner_stages.py --stage baseten_vision
.\.venv\Scripts\python.exe scripts/smoke_partner_stages.py --stage modal_reasoning
```

Both preflights exited 0 and reported `deployment_configured=False`, `key_configured=False`, and **no HTTP request sent**. The one-request live options remain unused. Provider billing and usage cannot be estimated from the current configuration because deployment/model IDs are absent; the runner records reported token usage if returned. A live run requires both explicit flags, a configured approved endpoint/model/key, a separate request budget decision, and an owned destination review.

## Verification

The new security and screenshot tests first failed on the previous implementation, then passed after the changes. The final full backend run, with `PYTHONPATH=services/api`, `META_AI_PROVIDER=offline_demo`, `META_AI_API_KEY=''`, `AI_PROVIDER_PROFILE=meta_only`, and workspace-local pytest temp: **210 passed, 1 opt-in live skipped**. The focused security/screenshot run after the gate: **23 passed**. The partner runner's mocked transport tests passed **4/4**. Frontend build, 5 client tests and 12-language i18n audit passed. No inference or network request was made. `git diff --check` passed; two configured local secrets were checked against changed files with zero matches. No frontend source, user `.env`, holdout fixture or production authentication architecture was changed.

## Remaining release gates

- **Repository and report authorization:** repository IDs and analysis IDs remain usable without a verified backend user session. The current `owner_email` query parameter is not proof of ownership. A backend identity and authorization design needs owner approval; no such design was silently added here.
- **Other runtime routes and development exposure:** production mutation and connection testing are disabled, but development mode must not be exposed on an untrusted network. Public `system/info` returns non-secret provider metadata. A future authenticated admin flow should replace the production 403 gate.
- **Account-wide inference controls:** the production gate blocks public paid analysis for now. Per-analysis request ceilings still do not enforce cross-worker rate or spend limits. A shared quota and provider billing telemetry are needed before any authenticated public paid inference is enabled.
- **Provider deployment:** Baseten and Modal endpoint/model IDs and credentials are absent from the local ignored `.env`. No partner live or paid call was made. Model-specific image/JSON behavior, actual latency, usage and cost remain unknown.
- **Privacy and holdout:** cross-provider source/screenshot transfer and retention need an explicit policy. The development and RealWorld labels still lack independent human source sign-off.

Therefore the deployment remains **PUBLIC RELEASE BLOCKED**. The deterministic local Multi-AI implementation remains **OFFLINE_READY** for team review.
