# Meta Global AI Developer Hackathon — submission draft

Verified locally on 2026-10-31. This is a preparation document, not a submitted entry. The [final readiness audit](HACKATHON_FINAL_READINESS.md) records actual checks and the demo plan.

| Field | Current entry |
| --- | --- |
| Project | ScopeGraph |
| Tagline | Understand the impact before you change the code. |
| Repository | https://github.com/teehihi/scope-graph |
| Track | **Unselected.** The [official event page](https://dev.meta.ai/events/global-hackathon) lists **Indie developer** and **Startup** as tracks; the team must select the applicable one. |
| Theme | **Push the Frontier** is an event theme, not a track. Confirm it in the portal. |
| Demo video | **Missing URL.** A three-minute script is proposed; that length is not asserted as an official requirement. |
| Deadline | The official event page currently says **2026-11-04, 9 PM ET**, subject to change. Confirm the portal deadline. |

## Problem and product

A change request can affect API routes, services, models and tests. ScopeGraph indexes Python source with AST parsing, stores symbols and dependency edges, retrieves context, traverses a graph, and checks proposed file and symbol references against the index. The React dashboard and MCP tools expose impact reports and implementation briefs. Source evidence establishes that referenced code exists; it does not prove that every suggested edit is necessary. Potential impacts remain separate from confirmed claims.

## AI provider claim for the demo

The recommended profile is **`meta_only`**. With `META_AI_PROVIDER=offline_demo`, local text analysis is deterministic and makes no external AI request. Screenshot success requires a vision provider: the offline provider returns an error, so a local mock result must be labeled **mocked**. The current local app configuration has no usable Meta key for a new live run.

One previously authorized real Meta `muse-spark-1.3` request produced a schema-valid visual interpretation of a synthetic screenshot. That [vision smoke test](SCREENSHOT_TO_IMPACT_LIVE_TEST.md) did **not** run the full screenshot-to-impact pipeline. Earlier Meta text-pipeline evaluation exists. No new live screenshot run was executed during this audit. A fresh live rehearsal requires local credentials and explicit paid-request authorization.

The optional `multi_ai` profile routes vision to Baseten and reasoning to Modal. Its local mock tests passed, but partner endpoints, latency, cost and behavior have **not** been verified live. Do not present it as the working hackathon demo. See [Multi-AI integration](MULTI_AI_INTEGRATION.md).

## Evaluation evidence and limits

The historical three-case live Meta evaluation reported macro impact F1 **0.282** and indirect recall **0.111**; 27 of 38 accepted claims were unsupported by its manual labels. This is diagnostic, not a generalization estimate. The 17-case development fixture has provisional AI-assisted labels, with human sign-off pending. A deterministic offline replay of saved predictions reproduced strict micro **20 TP / 31 FP / 15 FN**, precision **0.3922**, recall **0.5714**, F1 **0.4651**. It is a different dataset and scoring view, so the values do not imply model improvement. The separate repository holdout remains provisional and was not tuned or run through paid inference for this audit. See [evaluation methodology](EVALUATION.md).

## Three-minute demo plan

Follow the [timecoded script](HACKATHON_FINAL_READINESS.md#three-minute-demo-script). Show the indexed sample, a text requirement, graph and line-backed evidence. Show a live screenshot flow only after a separately approved Meta end-to-end rehearsal. Otherwise label the historical one-call vision artifact and any mocked browser walkthrough explicitly. Capture the actual provider and model; never imply that local mock output is live Meta output.

## Submission and attribution checklist

- [ ] Confirm eligibility, accepted participant status, track/theme, form fields, media format and final deadline in the official portal and rules. The public event page does not establish the video length or all form requirements.
- [ ] Record and upload the video; insert its actual URL and verify reviewer access.
- [ ] Verify repository/demo access for judges; keep the development API on localhost until access controls are implemented.
- [ ] Record actual provider, model, repository snapshot and on-screen output for the final video.
- [ ] If showing live Meta screenshot analysis, obtain a fresh explicit paid-request budget.
- [ ] Attribute ScopeGraph under its root **MIT** license. The included FastAPI RealWorld holdout snapshot has a separate **MIT** license and should be named if shown. Screenshot fixtures are locally generated synthetic artwork. The web app loads **Inter** and **JetBrains Mono** through Google Fonts and uses open-source packages; check individual third-party notices before distributing a bundle.

**Public deployment is blocked** by repository/report authorization and related runtime gaps. Local demo results do not clear that gate.
