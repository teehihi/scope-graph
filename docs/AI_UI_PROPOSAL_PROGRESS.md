# AI UI Proposal — implementation progress

Updated 2026-11-03. Working tree only; no commit, push or deployment.

2026-11-04 update: `origin/main` fast-forwarded to `895440b` with all uncommitted proposal changes retained and no conflicts. The offline proposal now recognizes requests to change the impact-analysis button, including red color and square corners, and renders those bounded style tokens. Two red-green regression tests cover the observed mismatch and refinement. See [evaluation](AI_UI_PROPOSAL_EVALUATION.md) for actual test results. No commit or push was made.

Latest full-suite rerun with the Windows symlink-privilege case deselected: **286 passed, 1 skipped, 1 deselected**. The web and API remained available on `127.0.0.1:5173` and `127.0.0.1:8000` during the local HTTP check.

## Implemented

- Restricted `ui_generation` stage with versioned `StructuredUISpecV1` and allowlisted components. Depth is limited to six and nodes to forty. HTML, handlers, arbitrary CSS and remote asset URLs are rejected by schema fields and text validation.
- Additive `POST /api/v1/repositories/{id}/ui-proposals/generate` route. It uses repository-scoped retrieval for up to five path/symbol hints. A 100 KB request body limit applies before JSON parsing. The route rejects wrong ownership, unindexed repositories, malformed revisions, provider errors and specification identity drift.
- `UI_PROPOSAL_LIVE_ENABLED=false` by default. A Meta key alone cannot activate paid UI generation. Development live mode requires explicit opt-in, an owned repository and an approved Meta endpoint. Production is closed. Offline proposals are labeled deterministic demo output.
- Proposal workspace at `/app/ui-proposal`: requirement entry, regeneration, refinement, per-repository/account session history, selection of prior versions, safe preview, desktop/mobile switch, inspect spec, optional screenshot only for impact analysis, existing impact pipeline invocation, verified direct/indirect/potential report display, brief and JSON export.
- All 12 locale dictionaries include workspace strings. The preview renderer creates inert React components; it does not execute generated code, navigate, submit forms or request external images.

## Verification and limits

- Focused backend contract/evaluation and routing suite: 35 passed on the final rerun.
- Frontend production build and localization audit passed; Vite reported a large bundle warning.
- Full backend suite initially: 282 passed, 1 skipped, 2 failed. One was the stage-routing expectation, updated and passed on targeted rerun. The other is a Windows `WinError 1314` symlink privilege failure in `test_mcp_security.py`, unrelated to this feature. Rerun excluding only that environment-dependent case: **283 passed, 1 skipped, 1 deselected**.
- API and Vite launched on localhost with a separate SQLite demo database and `META_AI_PROVIDER=offline_demo`. Browser automation was blocked by computer-use access/policy; no visual browser pass is claimed.
- No live Meta generation was run. Existing report authorization and account-wide spend controls remain public release blockers.

Status: **PARTIAL** pending browser visual verification. The offline API and frontend compile and are available locally for review.
