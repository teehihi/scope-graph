# SG-AI-22 Meta vision smoke: Phase A plan

Status: **Phase A prepared offline on 2026-10-29; Phase B subsequently approved and executed once.** See the [sanitized live result](SCREENSHOT_TO_IMPACT_LIVE_TEST.md). The runner exercises screenshot interpretation only; it does not run the impact orchestrator.

## Fixed test case

- Case: `email_confirmation` from [multimodal_cases_v1.json](../services/api/tests/evaluation/multimodal_cases_v1.json).
- Requirement sent to the model: **Require email verification before users can change their email address**.
- Image: [account_email.png](../services/api/tests/evaluation/screenshots_v1/account_email.png), 960 x 560 PNG, 18,049 bytes, source SHA-256 `e63ab13ea4f9b56ded558fdd6b1a73e18e002f25eb92ce87fa5881e140ac071a`. The image is original synthetic UI artwork rendered locally by [generate_multimodal_fixture.ps1](../scripts/generate_multimodal_fixture.ps1). It has no third-party screenshot or private repository data. Full decoding and metadata removal produce PNG SHA-256 `1aac5a3aeaec6972c5dfbb54a883de5622274dff51b823c21dd8a79d303b396a`; this normalized version is sent to Meta.
- Source repository: `examples/sample-repository`, pinned snapshot `f413b0b90d6157d5493a5603fb1245a7f4681eb6`. The source tree still matches that commit. Phase A indexed it in ephemeral SQLite with status `ready`, **14 files**, including the paths below. No persistent user repository is needed for this one-call interpretation smoke.

## Manual reference for review

**Visible in the image:** account/profile section, “Email settings,” current email, new email field, “Save email” button, and copy stating that the profile email updates after saving. The addresses are synthetic `.test` values. There is no visible confirmation message, verification link, token, or proof of backend behavior.

**Expected visual concepts:** profile/account settings, editing an email address, and a save action. A possible model hypothesis is that the current flow updates immediately; the image copy suggests this, but the image alone cannot prove what the backend does. Requiring verification is the textual change request, not an existing visual fact.

**Repository source evidence, separate from the image:**

| Path and line | Manually observed behavior | Review role |
| --- | --- | --- |
| `app/api/users.py:19-28` | Email endpoint calls `user_service.update_user_email` and returns immediate success. | Possible direct edit target. |
| `app/services/user_service.py:15-35` | Service assigns `user.email = new_email`, commits, then sends an alert. | Possible direct edit target. |
| `app/api/verification.py:11-24` | Confirmation branch acknowledges `email_change` but does not mutate the email. | Possible direct edit target. |
| `app/services/verification_service.py:8-38` | Existing token creation and validity checks already support an email-change token. | Retrieval context; editing this service is implementation dependent. |
| `app/models/verification_token.py:10-15` | `token_type`, `new_email`, `is_used` and expiry fields exist. | Retrieval context, not automatically impacted. |
| `app/services/notification_service.py:15-19` | Existing email-change alert wording/timing may need review. | Conditional indirect effect. |
| `tests/test_users.py:5-25` | Existing test expects immediate service mutation. | Regression test context. |

These source observations are a manual review of the pinned sample, not a claim the screenshot proves the files. The fixture's impact labels remain provisional and have no independent human sign-off.

## Provider, request and cost boundary

Effective configuration, checked without printing the key: `meta_model_api`, model `muse-spark-1.3`, base URL `https://api.meta.ai/v1`, key present in the Git-ignored root `.env`. The target is `POST https://api.meta.ai/v1/chat/completions` with one text part and one inline PNG image part. This request shape and model are documented in Meta's [vision input guide](https://dev.meta.ai/docs/cookbook/vision-input) and [image understanding guide](https://dev.meta.ai/docs/image-understanding).

The [runner](../scripts/smoke_meta_vision.py) allows **exactly one HTTP attempt**, disables provider and transport retries, blocks redirects, sets a **30-second per-operation timeout**, and caps the completion request at **3,000 tokens**. It creates an ignored `.attempted` marker before the call; even a timeout or 429 consumes this one-call approval and prevents a second invocation without a new approval and deliberate marker review. It calls `MetaAIHttpProvider.interpret_screenshot` only. The full impact pipeline would require additional model calls and is outside this approval.

Meta lists Standard-mode Muse Spark rates as **$1.25 per million input tokens** and **$4.25 per million output tokens** in its [pricing table](https://dev.meta.ai/docs/pricing-rate-limits). The 3,000-token output cap corresponds to at most **$0.01275 of output tokens** at that listed rate, plus input tokens. [Meta's vision guide](https://dev.meta.ai/docs/cookbook/vision-input) says image input tokens scale with resolution; the exact input-token count and total charge are unknown until measured or reported. A token-counting API call would itself exceed the approved one-request smoke budget, so Phase A did not make one. The live response may include `prompt_tokens`, `completion_tokens` and `total_tokens`; usage is recorded when returned.

## Reproduction and output

From the repository root, offline preflight only:

```powershell
.\.venv\Scripts\python.exe scripts/smoke_meta_vision.py
```

The offline preflight verifies the fixture hash, full image decode, pinned source snapshot, ephemeral repository index, provider/model/endpoint match, and key presence **without sending HTTP**. After a separate explicit approval for one potentially billable request, the exact live command is:

```powershell
.\.venv\Scripts\python.exe scripts/smoke_meta_vision.py --execute-live --allow-paid-request --max-requests 1 --timeout-seconds 30
```

The live runner wrote schema-validated visual intent, served model, latency, token usage, hashes and request count to Git-ignored `data/sg_ai_22_live_vision.json`. It did not print the key, request prompt, base64, image bytes or raw provider response. The [Phase B result](SCREENSHOT_TO_IMPACT_LIVE_TEST.md) compares observations with the image and separates visible facts, model hypotheses, source evidence and unsupported conclusions.

## Gates and limits

- No frontend code, production reasoning code, fixture labels, or evaluation algorithms are changed in Phase A.
- No paid request, full impact pipeline, commit or push is authorized by this preparation.
- A successful visual schema does not prove the model saw all UI details, nor that a source file is impacted.
- A network failure can leave billing uncertain; the runner deliberately refuses to retry under the same approval.
