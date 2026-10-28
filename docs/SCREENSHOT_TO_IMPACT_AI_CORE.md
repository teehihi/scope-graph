# Screenshot-to-Impact AI Core: SG-AI-15

SG-AI-15 adds a **provider-only** screenshot interpretation capability. It does not accept uploads through REST or MCP, retrieve code, analyze impact, or generate a screenshot-based report. SG-AI-16 and SG-AI-17 remain separate work. The text-only pipeline is unchanged.

## Input and output

`BaseMetaAIProvider.interpret_screenshot(requirement: str, image: ValidatedScreenshot) -> AIProviderResponse` is the dedicated interface. `MetaAIHttpProvider` returns an `AIProviderResponse` whose `data` is a Pydantic-validated `StructuredVisualIntent` dictionary; provider, actual served model, latency and reported token usage use the same response wrapper as text-only calls. `OfflineDemoProvider` raises a clear unavailable error and makes no visual observations.

`StructuredVisualIntent` requires `screen_type`, `visible_text`, `visible_elements`, `user_actions`, `functional_concepts`, `requirement_interpretation` and `uncertainties`. An unclear screenshot can use `screen_type: "unknown"`, empty observation arrays and explicit uncertainties. Lists are limited to 20 entries; individual entries and screen type to 160 characters; the requirement interpretation to 500 characters. Extra fields, including `affected_files` and `confirmed_file_path`, are rejected. All content remains **untrusted model output**, including strings that resemble source paths. The screenshot does not establish a repository fact.

## Screenshot validation boundary

`ValidatedScreenshot.from_bytes(data, mime_type)` accepts only `image/png` and `image/jpeg`, checks content signatures, PNG chunk CRC and compressed stream integrity or JPEG marker structure, extracts dimensions, checks that declared MIME matches content, and computes a SHA-256 identity. It rejects absent, truncated, structurally malformed, over-size and over-dimension inputs with fixed messages that do not include image content. Configurable settings are `MAX_SCREENSHOT_BYTES` (default 5,000,000), `MAX_SCREENSHOT_DIMENSION` (default 4,096 per side) and `MAX_SCREENSHOT_PIXELS` (default 8,000,000). The type keeps bytes in process memory only and excludes them from `repr`.

This standard-library check is **not a full PNG/JPEG pixel decode**. In particular, JPEG entropy and every PNG color/interlace rule are not validated. The future backend upload handler must perform a full, bounded decode and, if required by the privacy policy, strip metadata before constructing this input. The repository does not declare an image decoder dependency; adding one requires backend-owner approval. Filename extensions and caller MIME alone are insufficient. The provider accepts no user-supplied URL and does not fetch images server-side.

## Meta request and failures

For the configured official Meta endpoint (`https://api.meta.ai/v1`) and model (default `muse-spark-1.3`), the method makes one logical Chat Completions call with a developer instruction and a user message whose `content` has a `text` part plus an `image_url` part containing the validated image as a base64 data URL. Existing retry policy may issue additional HTTP attempts after transient failures. Structured JSON is parsed and validated with `StructuredVisualIntent`; malformed JSON, missing response fields, invalid schema, timeout, transport failure and non-2xx responses raise sanitized errors. The method refuses partner providers and non-Meta destinations to prevent accidental image disclosure through a text-only compatible endpoint. No implicit offline fallback occurs.

The prompt asks for visible facts, relevant functional concepts and explicit uncertainty; screenshot text is data, not instructions. It forbids verified file, symbol, component, dependency and impact claims. The response schema and provider method do not feed the existing retrieval or evidence gates yet. They do not write screenshots to the database, cache, traces, logs or reports. Application code must not log the generated data URL or attach it to an exception.

Meta's documented Chat Completions image shape is `{"type":"image_url","image_url":{"url":"data:image/png;base64,..."}}` inside a user message alongside a text part: [vision input](https://dev.meta.ai/docs/cookbook/vision-input), [image understanding](https://dev.meta.ai/docs/image-understanding), [request schema](https://dev.meta.ai/docs/api-reference/chat-completions/schemas).

## Remaining integration work

- **SG-AI-16:** Normalize visual concepts into bounded search hints for the existing `HybridRetriever`, with text-first ranking, repository isolation and no visual evidence promotion.
- **SG-AI-17:** Add optional input to the existing orchestrator; coordinate the upload/validation contract with the backend owner; decide sync versus ephemeral async image lifecycle; version or bypass caching until image hash, repository version, provider and model are in the key. Add optional visual metadata to the report while preserving REST/MCP text-only signatures.
- **SG-AI-18:** Evaluate rights-cleared screenshots with mocked/offline runs before any separately authorized live inference.
