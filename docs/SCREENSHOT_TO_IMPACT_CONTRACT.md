# Screenshot-to-Impact integration contract

Status: **synchronous REST upload implemented** (2026-10-29). MCP and the frontend remain text-only.

## Input and full decoding

`AnalysisOrchestrator.run_analysis(repository_id: str, requirement: str, ..., screenshot: ValidatedScreenshot | None = None) -> AnalysisRun` remains the internal entry point. A screenshot requires a nonempty text requirement and a `ready` repository. `ValidatedScreenshot.from_bytes(bytes, mime_type)` checks PNG/JPEG structure and configured limits, but is not a full pixel decoder. The REST boundary additionally calls `decode_uploaded_screenshot`, which uses Pillow to decode every pixel, reject malformed and animated input, apply EXIF orientation, and strip metadata by re-encoding to PNG. It checks the normalized image against the same limits. Defaults: 5,000,000 bytes, 4,096 pixels per side and 8,000,000 pixels total. The report hash and MIME refer to the normalized PNG passed to the provider, not the original upload.

## Public REST input and errors

`POST /api/v1/repositories/{repository_id}/analyze-screenshot` accepts `multipart/form-data`: required `requirement` text and `screenshot` file, plus optional `target_language` (default `en`). Only `image/png` and `image/jpeg` are accepted. The route runs synchronously and returns `{analysis_id, status, result, brief}`. A successful report can also be retrieved with `GET /api/v1/analyses/{analysis_id}/report`.

Empty requirement or malformed, mismatched or empty image returns 400; unsupported MIME returns 415; an over-limit upload or normalized image returns 413; missing repository returns 404; an unready repository returns 400. Missing multipart fields receive FastAPI's 422. Provider unavailability, timeout or invalid visual response creates a failed analysis; the response has `status: "failed"`, while the existing analysis status endpoint contains a sanitized error message. Remote image URLs are not accepted. The route follows the existing repository-ID access model: backend repository ownership/session enforcement does not exist yet, so deployment access control remains a product security gate.

## Image lifecycle and privacy

Application code keeps the decoded and normalized image in memory only for the synchronous provider call. It does not persist original bytes, normalized bytes or data URLs in reports, traces, database rows, Redis jobs or the existing text-only cache. FastAPI/Starlette's multipart parser may use a temporary spooled file for larger uploads; the route closes it after processing. An upstream request-body limit is still needed to reject oversized multipart bodies before framework parsing. OCR `visible_text` and the model requirement paraphrase are omitted from persisted `visual_context`. The report may retain bounded screen type, retrieval hints and uncertainties as **untrusted model observations**; these may reveal interface details, so production retention/access policy remains open. EXIF, PNG text and other source metadata are removed before the provider call. No image result is cached. An asynchronous route would require an approved ephemeral image store, access controls and expiry.

## Output and evidence semantics

The existing `AnalysisRun.result_json` remains the report. Screenshot runs add `visual_context` with normalized image SHA-256, MIME, dimensions, screen type, vision provider/model/demo flag, visual retrieval status/hints/counts and uncertainties. Text-only runs omit this field. `operational_metadata` includes vision latency and reported token usage in its existing totals. `affected_items` still require indexed source evidence and causal support; `potential_impacts` remain unconfirmed; `rejected_hallucinations` remain invalid source claims. A visual observation cannot establish a file, symbol, line or impact relationship. The brief generator receives grounded report fields without `visual_context`.

## Compatibility and frontend integration

Existing JSON REST and MCP request signatures remain text-only and unchanged. The new REST route is additive. Frontend code has not been modified and cannot upload screenshots yet. A future client should send a local PNG/JPEG plus text, display validation and provider-unavailable states, and mark `visual_context` as tentative observations rather than source facts. It should keep direct, indirect and potential impact labels distinct and cite indexed source lines from the report.

## Remaining production gates

Repository ownership/authentication, upstream multipart body limits, and visual metadata retention/access policy require deployment review. The backend owner approved this synchronous multipart route, Pillow, normalization, and image-cache bypass. No paid Meta inference was made for this integration. See [AI Core implementation](SCREENSHOT_TO_IMPACT_AI_CORE.md) and [offline evaluation](MULTIMODAL_EVALUATION_V1.md).
