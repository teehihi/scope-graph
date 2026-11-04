# AI UI Proposal — offline evaluation

Updated 2026-11-03. No paid inference was used.

2026-11-04 follow-up: after fast-forwarding to `895440b`, two regression cases were added for Vietnamese impact-button styling and English refinement. Both now pass. The focused suite has **37 passed**. The full backend suite has **286 passed, 1 skipped, 1 failed**; the sole failure is a Windows symlink privilege error (`WinError 1314`) before application scanner logic executes. Rerunning with only that case deselected yielded **286 passed, 1 skipped, 1 deselected**. Frontend build and 12-language audit pass after the merge. A localhost request through Vite's `/api` proxy using the exact Vietnamese requirement returned an offline proposal with the matching button label, `red` variant and `square` shape. Browser interaction remains unverified by automation.

## Deterministic cases

`services/api/tests/test_ui_proposal_evaluation.py` exercises six synthetic cases: login redesign, dashboard layout, account settings, responsive navigation, form validation, and text refinement of a screenshot-related workflow. Screenshot pixels are intentionally processed only by the existing Screenshot-to-Impact route when the user explicitly runs impact analysis.

The targeted proposal suite ran **23/23 passed**. All six cases produced a valid `StructuredUISpecV1`; five initial cases matched their expected coarse title, and all six retained a one-column mobile setting. The sixth preserved the original requirement and created version 2 with a two-column desktop setting. These are deterministic contract checks, not independent evidence of aesthetic quality or live model coverage.

Negative tests reject unsupported components, HTML/script text, arbitrary fields and asset URLs, oversized child lists, invalid responsive tokens, invalid version transitions, oversized HTTP bodies, private and spoofed sample repository access, production use, and invalid or identity-drifted mocked provider output. The default remains offline even with a Meta key present. The final focused suite including stage routing ran **35 passed**. The earlier full backend suite excluding one Windows symlink privilege case ran **283 passed, 1 skipped, 1 deselected**; the additional spoofed-repository test passed in the focused rerun. Provider latency, quality and cost remain unmeasured.

## Impact and browser status

The proposal route sends only bounded indexed paths and symbol names to the UI stage; it does not return code impact claims. Impact analysis is a separate user action through existing analysis endpoints. Reports are displayed by direct, indirect and potential categories with source snippets where present. No new live screenshot or paid request was made.

Frontend TypeScript/Vite build and the 12-language audit passed after restoring existing locked npm dependencies. Browser automation could not proceed: the computer-use browser host was unavailable and native Brave access was stopped because its URL could not be determined for policy enforcement. Desktop/mobile interaction, keyboard flow and visual quality are therefore **not browser-verified**. A human should exercise `http://127.0.0.1:5173/app/ui-proposal` before visual acceptance.

Do not tune this feature against the provisional RealWorld holdout. Live Meta structured generation requires separate explicit approval and secured development access.
