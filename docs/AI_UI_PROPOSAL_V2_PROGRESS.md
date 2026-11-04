# AI UI Proposal V2 progress

Updated 2026-11-04. Working tree on `main` at `895440b74cb694756afbda27a9120c6da81eac38`. V1 proposal files were already uncommitted and were preserved. No commit, push, merge, deployment, paid inference or holdout-label edit was made for V2.

## Implemented locally

- Explicit Live AI / Offline Demo request mode and a credential-free provider readiness endpoint. Live errors fail closed; Offline remains deterministic and labeled.
- Structured operation classification; bounded, validated `UIPatchV2`; deep-copy patching of previous proposal versions; add/remove, button style, icon and form/container layout operations. The Vietnamese red-square case now yields a one-button conceptual Before and a patched After, rather than an unrelated form.
- Indexed-repository UI target lookup for literal and localized labels, line-specific ambiguity choices, source excerpts and conceptual fallback when no match exists.
- Side-by-side Before/After, desktop/mobile view, target evidence, change summary, prior-version return, refinement history and stale report marker. Existing inert renderer and export remain.
- Existing impact action now includes validated target reference and patch tokens in its requirement sent to the established analysis path. No source files are mutated by preview.
- 12-language UI strings and source/security regression tests.

## Verification

See [V2 evaluation](AI_UI_PROPOSAL_V2_EVALUATION.md). The final full backend run with the pre-existing Windows symlink-privilege case deselected passed **309 tests, 1 skipped, 1 deselected**; the focused proposal/routing suite passed **59 tests** before the final added form-layout route case. Frontend build, 12-language audit and local Offline HTTP request passed. Browser automation was unavailable. A live Meta request was not authorized for this task and was not made.

## Remaining work and release gate

1. Perform actual desktop/mobile browser checks for target choice, Before/After alignment, loading and error states, refinement, version return, impact and export when a working browser harness or human reviewer is available.
2. With separate paid-request authorization, verify the configured Meta model returns valid `StructuredUISpecV1` and `UIPatchV2`; measure request count, latency, usage and quality. Current integration is mocked/offline only.
3. Keep public Live inference disabled until account-wide spend/rate limits and a full authorization review are implemented. Current route is development-only and owner-only.
4. Improve static target coverage for dynamic UI text and complex CSS only with source-backed tests; do not infer exact runtime UI from TSX.
5. Review causal scope of style-only impact reports in the existing orchestrator. The proposal's source candidate is evidence of the target, not proof that every downstream claim is necessary.

**Status: PARTIAL.** The Offline implementation and tests are ready for local review; browser verification and live model behavior remain open. Public release is blocked by cost/security controls.
