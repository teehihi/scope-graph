# AI UI Proposal architecture and API contract

Design agreed for the local MVP before implementation, 2026-11-03. This feature is a proposal workbench inside ScopeGraph, not a code writer or standalone site builder.

## Flow and trust boundaries

1. The user chooses an indexed repository and writes a UI change requirement. The requirement remains the canonical intent for impact analysis.
2. `POST /api/v1/repositories/{repository_id}/ui-proposals/generate` validates input and access. The server retrieves at most five repository-scoped indexed paths and symbol names. Source snippets, secrets and arbitrary workspace files are excluded from the generation prompt.
3. A request-scoped `ui_generation` provider stage returns a versioned `StructuredUISpecV1`. The server validates every field, depth and node count before returning it. Development defaults to a labeled deterministic demo; live mode requires an explicit server flag and a real user session. Production fails closed until account-wide spending and authorization are reviewed.
4. React renders only allowlisted elements and fixed design token choices. Generated text remains text. Controls simulate local states only; they cannot navigate, submit, execute code, fetch assets or mutate auth.
5. A refinement request carries the original requirement, current validated spec and bounded follow-up text. Each response is a new validated version. Client session storage retains bounded proposal history per repository and account for the active browser session; reports and briefs stay in memory. It is not cross-device persistence.
6. “Analyze code impact” calls the existing text or screenshot analysis endpoint with the original requirement plus the user's explicit refinement text. The generated component tree is never source evidence or an automatic impacted path. Existing `AnalysisOrchestrator`, retrieval, graph, `EvidenceValidator` and `CausalImpactVerifier` remain authoritative.
7. The workspace binds each report to the exact local proposal version. Refinement marks a previous report stale. Export creates a local JSON file containing the requirement, validated spec, provenance, and any completed grounded report. No server-side UI code is written.

## API contracts

`POST /api/v1/repositories/{id}/ui-proposals/generate` JSON:

```json
{"requirement":"Redesign the account sign-in screen with a clear error state","refinement":null,"previous_spec":null,"version":1}
```

Response: `{"spec": StructuredUISpecV1, "generation": {"mode":"offline|live", "provider":"...", "model":"...", "latency_seconds":0, "token_usage":null, "context_paths":[...]}}`. Refinement uses the same endpoint, with `version > 1`, a bounded `refinement`, and the previous validated spec. HTTP 400/403/404/413/422/503/502 indicate invalid input, access, missing repository, oversized request, schema failure, unavailable provider, or provider output failure. Errors never echo prompts, source text or credentials.

`StructuredUISpecV1` is strict: `schema_version="1"`, title/description, root component tree, allowlisted component types, bounded `text`/`label`/`placeholder` fields, enumerated tone/spacing/alignment tokens, desktop/mobile column counts, accessibility labels, assumptions and uncertainties. Component depth is at most six and node count at most forty. It has no HTML, CSS, script, handler, action URL or external asset field. Unsupported nodes fail validation; the renderer also has an inert fallback for corrupt client-side data.

Buttons additionally accept only `button_variant` (`lime`, `red`, `ink`) and `button_shape` (`soft`, `square`). These are fixed renderer classes, not arbitrary CSS. The offline demo recognizes a small set of button and style words; unsupported instructions still require a live supported model or human design work. A proposal never edits ScopeGraph or the selected repository.

## Provider and security policy

- `UI_PROPOSAL_LIVE_ENABLED=false` is the default. A configured Meta key alone never triggers generation inference. The offline provider returns a deterministic, conspicuously labeled proposal. `meta_only` and `multi_ai` use the configured Meta model for `ui_generation` only when explicitly enabled in development; Baseten and Modal are not required for this stage.
- Live requests have one request budget, zero retries, a 30-second timeout and a bounded completion cap. Provider name, model, latency and available token usage are returned; raw prompts/responses and keys are not logged or stored.
- Local demo access is limited to the bundled, unowned sample repository with its expected description and workspace path. Other repositories require an authenticated session whose email matches `Repository.owner_email`. Production returns 503 until the ownership model and account-wide spend controls are approved for public use. Existing broader analysis authorization gaps are not silently fixed by this feature.
- UI preview strings are React text nodes. No `eval`, `dangerouslySetInnerHTML`, remote images, browser navigation, or form submission exists in the renderer. Model instructions and retrieved symbols are untrusted data.
- Optional screenshots remain in the established Screenshot-to-Impact path. The proposal generator uses text and bounded index metadata only; attaching a screenshot to impact analysis does not imply that its pixels shaped the UI spec.

## Compatibility

Existing analysis routes, result schemas, dashboard, landing, auth, graph, screenshot pipeline, provider defaults and holdout labels are unchanged. The new route and page are additive. Existing application state and text analysis continue through `RepoContext`.
