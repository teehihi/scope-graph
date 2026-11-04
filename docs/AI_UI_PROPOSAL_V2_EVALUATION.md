# AI UI Proposal V2 evaluation

Date: 2026-11-04. Repository HEAD at implementation start: `895440b74cb694756afbda27a9120c6da81eac38` on `main`; V1 changes were already uncommitted and were preserved. All AI provider tests used offline logic or local fakes. **Meta request count: 0.** No provider quality, token cost or latency claims are inferred from mocks.

## Development cases

| # | Case | Verification | Result |
|---|---|---|---|
| 1 | Change impact button to red | Exact Vietnamese requirement, structured intent and patch, HTTP integration | Pass |
| 2 | Change button radius to square | Same regression verifies `button_shape=square` | Pass |
| 3 | Modify form layout | Patch preserves input/button and sets two columns | Pass |
| 4 | Create a new page | Classifier and route generation with validated `StructuredUISpecV1` | Pass, offline template quality is limited |
| 5 | Add a component | Refinement adds an inert component without changing prior nodes | Pass |
| 6 | Refine a proposal | Prior version/requirement retained; darker red and preserve-size interpretation covered | Pass for supported tokens |
| 7 | Ambiguous targets | Two identical labels in one file have distinct `path:line` refs; API requires selection | Pass |
| 8 | Invalid model output | Mocked provider returns unsupported component/unsafe CSS; route fails closed | Pass |
| 9 | Missing live configuration | Explicit Live request returns 503, with no Offline spec or fallback | Pass |
| 10 | Grounded source target | Indexed literal and localized label resolve to exact source line; unindexed file is excluded | Pass for static cases |

These are development checks, not an independent holdout or live model evaluation. The existing RealWorld holdout and labels were unchanged.

## Commands and actual results

- Focused `test_ui_proposal.py`, `test_ui_proposal_v2.py`, `test_ui_proposal_evaluation.py`, `test_stage_routing.py`: **59 passed** after the final source-path and refinement cases.
- Full backend `PYTHONPATH=services/api .venv/Scripts/python.exe -m pytest services/api/tests/ -q`: **300 passed, 1 skipped, 6 failed** in the first run. Five failures exposed a real classifier bug: substring matching interpreted `Redesign` as color `red`, causing 422. A regression test was added and the matcher now requires a word boundary. The remaining failure was Windows `WinError 1314` when a pre-existing scanner test attempted to create a symlink without OS privilege, before application code ran.
- Final full backend rerun with only `test_scanner_excludes_sensitive_files_and_symlink_escapes` deselected: **309 passed, 1 skipped, 1 deselected** in 53.28 seconds. The symlink privilege case remains unverified on this host.
- `cd apps/web && npm run build`: passed (TypeScript and Vite; 1,801 modules). Vite reports an existing bundle-size warning for the 1.72 MB main chunk; no FPS or performance result is claimed.
- `node scripts/audit_i18n.js`: passed, 790 keys and 100% parity for all 12 languages; no hardcoded non-English UI strings detected.
- `git diff --check`: passed.

## Local HTTP integration

A separate local FastAPI process was started on `127.0.0.1:8001` with `META_AI_PROVIDER=offline_demo`, `UI_PROPOSAL_LIVE_ENABLED=false`, Redis disabled and a disposable SQLite database. A Vite development server on `127.0.0.1:5173` returned HTTP 200. The bundled sample repository indexed to `ready`. `GET /ui-proposals/status` returned `offline_available=true`, `live_available=false`. The exact Vietnamese red-square request sent via HTTP returned `MODIFY_STYLE`, target label, `background_color=red`, `border_radius=square`, `preview_provenance=conceptual_approximation`, `target_resolution=conceptual`, and `request_count=0`. Conceptual is correct for the bundled Python authentication sample: it does not contain ScopeGraph's impact button.

After the final code changes, the API was restarted on `127.0.0.1:8000` with the same offline settings. A request through Vite's `/api` proxy returned `offline` + `MODIFY_LAYOUT` for the initial form-layout case, with conceptual provenance and two preview columns. The local web/API servers remained running for manual review; this HTTP proxy check is not a browser interaction test.

Final proxy regression: the exact Vietnamese button request returned `MODIFY_STYLE`, conceptual Before, `red`, `square`, zero provider requests and unavailable cost status. An explicit `mode=live` request returned HTTP 503 under the disabled live flag; it did not return an Offline proposal or contact Meta.

## Browser and live verification

Actual desktop/mobile browser interaction was **not completed**. The in-app browser returned “browser access host is unavailable.” The computer-use inventory repeated that error; the available Brave window was minimized and could not be activated with the documented API. HTTP 200 and frontend build do not constitute a browser test. Loading, source-choice interaction, side-by-side visual alignment, mobile layout, version restore, export and provider error presentation still need a human or working browser harness check.

No paid Meta call was made. Live model output quality, real token usage/cost, provider latency and structured-output compatibility remain unverified. The new UI route stays local-development only; account-wide spend/rate controls are still needed before public availability.
