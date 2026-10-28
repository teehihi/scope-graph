# Screenshot-to-Impact integration contract

Status: **internal AI Core input implemented; public upload route proposed only** (2026-10-29). This document is for backend/frontend integration review. It does not announce a REST or MCP screenshot feature.

## Current typed input

`AnalysisOrchestrator.run_analysis(repository_id: str, requirement: str, ..., screenshot: ValidatedScreenshot | None = None) -> AnalysisRun` is the internal entry point. The repository must exist and be indexed with status `ready`. A screenshot requires a nonempty text requirement. `None` preserves text-only behavior. `ValidatedScreenshot.from_bytes(bytes, mime_type)` accepts `image/png` or `image/jpeg`, verifies content signature and structure, checks MIME/content agreement, computes SHA-256, and enforces configurable limits: 5,000,000 bytes, 4,096 pixels per side and 8,000,000 total pixels by default. It does **not** fully decode JPEG entropy or every PNG pixel encoding.

## Proposed public input and errors

A future handler may accept one multipart image plus a text requirement and repository ID. This is **not a named production endpoint**. It must perform a bounded full image decode before constructing `ValidatedScreenshot`, reject remote image URLs, and check repository access and readiness. Suggested error semantics for owner review: invalid/empty requirement or unsupported/malformed/mismatched/oversized image → client validation error; missing repository → not found; unready repository → conflict; unavailable vision provider, timeout or invalid model response → failed analysis with sanitized provider error. The precise HTTP codes and response envelope must be finalized by the backend owner; no route is implemented here.

## Image lifecycle and privacy

The internal path keeps image bytes in process memory for the provider call. Raw bytes and data URLs are not placed in reports, traces, database rows, Redis jobs or the existing text-only cache. OCR `visible_text` and model requirement paraphrase are omitted from persisted `visual_context`. The report may retain bounded screen type, retrieval hints and uncertainties as **untrusted model observations**; these may still reveal details about a submitted interface, so production retention/access policy must be reviewed. The upload handler should decide whether to strip EXIF and other metadata, and must avoid logging bytes, data URLs, credentials or model request bodies. Synchronous processing is the proposed MVP; an asynchronous route needs an approved ephemeral image store, access controls and expiry. Existing text-only cache keys are insufficient for images. Any image cache must include image SHA-256, repository index version, requirement, provider/model and relevant settings, or bypass caching.

## Output and evidence semantics

The existing `AnalysisRun.result_json` remains the report. Screenshot runs add `visual_context` with `image_sha256`, MIME, dimensions, `screen_type`, vision provider/model/demo flag, visual retrieval status/hints/counts and `uncertainties`. Text-only runs omit this field. `operational_metadata` includes vision latency and reported token usage in its existing totals. `affected_items` still require indexed source evidence and causal support; `potential_impacts` remain unconfirmed; `rejected_hallucinations` remain invalid source claims. A visual observation cannot establish a file, symbol, line or impact relationship. The brief generator receives grounded report fields without `visual_context`.

## Compatibility and frontend integration

Current REST and MCP request signatures remain text-only. Their existing response envelopes and fields are unchanged. Frontend code has not been modified and cannot upload screenshots yet. After backend approval and route implementation, the frontend should send the text requirement with a locally selected PNG/JPEG, show format/size errors and provider-unavailable states, and display `visual_context` as tentative observations rather than source facts. It should keep direct, indirect and potential impact labels distinct and cite indexed source lines from the existing report fields.

## Decisions for backend owner

Confirm the public route/envelope and authorization check, the full decoder dependency, EXIF policy, synchronous versus ephemeral asynchronous lifecycle, retention/access policy for visual metadata, and cache bypass or versioned image key. See [AI Core implementation](SCREENSHOT_TO_IMPACT_AI_CORE.md) and [offline evaluation](MULTIMODAL_EVALUATION_V1.md).
