# Screenshot-to-Impact AI Core: SG-AI-15 through SG-AI-19

SG-AI-15 adds a dedicated screenshot interpretation capability. SG-AI-16 adds optional visual hints to the existing `HybridRetriever`. SG-AI-17 connects both to the existing orchestrator through an internal, optional input. SG-AI-18 records a synthetic offline checkpoint. SG-AI-19 adds a synchronous REST upload route. MCP and the frontend still accept text only; the existing JSON analysis route is unchanged.

## Input and output

`BaseMetaAIProvider.interpret_screenshot(requirement: str, image: ValidatedScreenshot) -> AIProviderResponse` is the dedicated interface. `MetaAIHttpProvider` returns an `AIProviderResponse` whose `data` is a Pydantic-validated `StructuredVisualIntent` dictionary; provider, actual served model, latency and reported token usage use the same response wrapper as text-only calls. `OfflineDemoProvider` raises a clear unavailable error and makes no visual observations.

`StructuredVisualIntent` requires `screen_type`, `visible_text`, `visible_elements`, `user_actions`, `functional_concepts`, `requirement_interpretation` and `uncertainties`. An unclear screenshot can use `screen_type: "unknown"`, empty observation arrays and explicit uncertainties. Lists are limited to 20 entries; individual entries and screen type to 160 characters; the requirement interpretation to 500 characters. Extra fields, including `affected_files` and `confirmed_file_path`, are rejected. All content remains **untrusted model output**, including strings that resemble source paths. The screenshot does not establish a repository fact.

## Screenshot validation boundary

`ValidatedScreenshot.from_bytes(data, mime_type)` accepts only `image/png` and `image/jpeg`, checks content signatures, PNG chunk CRC and compressed stream integrity or JPEG marker structure, extracts dimensions, checks that declared MIME matches content, and computes a SHA-256 identity. It rejects absent, truncated, structurally malformed, over-size and over-dimension inputs with fixed messages that do not include image content. Configurable settings are `MAX_SCREENSHOT_BYTES` (default 5,000,000), `MAX_SCREENSHOT_DIMENSION` (default 4,096 per side) and `MAX_SCREENSHOT_PIXELS` (default 8,000,000). The type keeps bytes in process memory only and excludes them from `repr`.

This structural check is **not a full PNG/JPEG pixel decode**. The public REST boundary uses Pillow to load every pixel, apply EXIF orientation and re-encode to PNG without source metadata before constructing the provider input. The normalized image is checked against the same limits. The hash in the public report identifies that normalized image. Filename extensions and caller MIME alone are insufficient. The provider accepts no user-supplied URL and does not fetch images server-side.

## Meta request and failures

For the configured official Meta endpoint (`https://api.meta.ai/v1`) and model (default `muse-spark-1.3`), the method makes one logical Chat Completions call with a developer instruction and a user message whose `content` has a `text` part plus an `image_url` part containing the validated image as a base64 data URL. Existing retry policy may issue additional HTTP attempts after transient failures. Structured JSON is parsed and validated with `StructuredVisualIntent`; malformed JSON, missing response fields, invalid schema, timeout, transport failure and non-2xx responses raise sanitized errors. The method refuses partner providers and non-Meta destinations to prevent accidental image disclosure through a text-only compatible endpoint. No implicit offline fallback occurs.

The prompt asks for visible facts, relevant functional concepts and explicit uncertainty; screenshot text is data, not instructions. It forbids verified file, symbol, component, dependency and impact claims. Image bytes and data URLs are not written to the database, cache, traces, logs or reports. Application code must not log the generated data URL or attach it to an exception.

Meta's documented Chat Completions image shape is `{"type":"image_url","image_url":{"url":"data:image/png;base64,..."}}` inside a user message alongside a text part: [vision input](https://dev.meta.ai/docs/cookbook/vision-input), [image understanding](https://dev.meta.ai/docs/image-understanding), [request schema](https://dev.meta.ai/docs/api-reference/chat-completions/schemas).

## SG-AI-16: optional visual retrieval hints

`HybridRetriever.retrieve(..., visual_intent: StructuredVisualIntent | None = None)` uses the same repository-scoped index, graph, deterministic sort, `top_k` and context-token budget as text-only retrieval. With `None`, its selected items and seeds retain their existing behavior. A caller must explicitly pass a validated visual-intent object; the orchestrator now connects provider output to this input.

Hint normalization considers `screen_type`, `visible_elements`, `user_actions` and `functional_concepts`. It ignores OCR `visible_text` and the model's requirement paraphrase, drops path-like strings and generic UI words, and activates extra hints only when a substantive visual term overlaps the original text requirement. It caps extra terms at eight. Text matches rank ahead of visual-only matches; visual terms can break ties or retrieve indexed context when text has no file match. Visual matches can seed the existing one-hop graph context, but this never establishes code impact. `source_snippets`, scores and reasons still derive exclusively from indexed repository files and symbols.

`RetrievalResult.visual_metadata` reports status (`empty`, `unanchored`, `no_new_hints`, `active` or `no_index_match`), bounded hint terms, model uncertainties and counts for visual candidates and selected visual-only files. An unrelated screenshot is suppressed as `unanchored`; this is a lexical safety gate, not a semantic proof of irrelevance. Results are deduplicated by indexed path, remain within the requested repository, and honor the existing context budget. English-oriented lexical normalization can miss relevant non-English or synonym-only relationships. No image bytes or data URLs enter retrieval metadata.

## SG-AI-17: optional orchestrator input

`AnalysisOrchestrator.run_analysis(..., screenshot: ValidatedScreenshot | None = None)` accepts a validated, in-memory image. A screenshot requires a nonempty text requirement. The orchestrator calls `interpret_screenshot` once, validates its `StructuredVisualIntent`, then runs the existing text interpretation, retrieval, graph, reasoning, completeness, evidence, causal verification and brief steps. The visual intent influences retrieval only; it is not added to the requirement interpretation or treated as file, symbol, line or causal evidence. The implementation brief receives the grounded report without `visual_context`, so model-produced observations are not forwarded as instructions to the brief generator. Provider errors produce a failed analysis with a fixed, image-free error; offline mode reports that screenshot interpretation is unavailable.

For screenshot calls only, the report gains `visual_context`: SHA-256 image identity, MIME, dimensions, screen type, vision provider/model/demo flag, retrieval status/hints/counts and explicit uncertainties. The evaluation trace receives the same metadata. OCR `visible_text`, model requirement paraphrase, raw image bytes and data URLs are omitted from report, trace and brief input. `operational_metadata` includes vision latency and reported token usage in the existing totals. The visual result is not cached. Existing REST/MCP signatures and jobs remain text-only and do not pass an image to this internal method.

## SG-AI-19: synchronous REST upload

`POST /api/v1/repositories/{repository_id}/analyze-screenshot` accepts one multipart PNG/JPEG file, a nonempty text requirement and optional `target_language`, then invokes the existing orchestrator synchronously. It rejects malformed and over-limit images, bypasses the text-only cache and never enqueues image bytes. The route returns the existing synchronous `{analysis_id, status, result, brief}` envelope. The [integration contract](SCREENSHOT_TO_IMPACT_CONTRACT.md) records exact fields, errors, metadata stripping, temporary framework spooling, and the remaining repository access and upstream body-limit gates. No paid Meta request was used to implement or test this route.

## SG-AI-18: synthetic offline checkpoint

- The [six-case paired evaluation](MULTIMODAL_EVALUATION_V1.md) uses original synthetic screenshots and source labels copied from the provisional v3 sample fixture. Its scripted visual provider verifies image identity and supplies authored intent; it does not read pixels. Text-only and screenshot paths are compared on retrieval, supported impact, claim disagreement, latency and reported usage. Pure replay runs without images or inference. The result demonstrates pipeline mechanics and is **not** real vision-model accuracy. Human review of visual concepts and source labels is pending. Live Muse Spark evaluation still requires separate authorization.

## Remaining work

- **Frontend integration:** Add a local screenshot picker and display visual context only after product review. MCP remains text-only.
- **Production access:** Add repository ownership/session enforcement and an upstream multipart body limit before exposing the upload route publicly.
- **Real vision evaluation:** Review rights and labels, then obtain explicit approval before any paid Muse Spark screenshot evaluation. No paid Meta vision call has been made in this workstream.
