# SG-AI-22: Live Meta Vision smoke result

Status: **one authorized vision interpretation request completed on 2026-10-29 UTC**. This is a single-case smoke test, not a multimodal impact-accuracy evaluation. No full impact analysis or additional Meta request was run.

## Test case and provenance

| Item | Recorded value |
| --- | --- |
| Case and requirement | `email_confirmation`: “Require email verification before users can change their email address” |
| Screenshot | [account_email.png](../services/api/tests/evaluation/screenshots_v1/account_email.png), original synthetic 960 × 560 PNG generated locally by [generate_multimodal_fixture.ps1](../scripts/generate_multimodal_fixture.ps1); no third-party or private imagery |
| Source image SHA-256 | `e63ab13ea4f9b56ded558fdd6b1a73e18e002f25eb92ce87fa5881e140ac071a` |
| Normalized image SHA-256 sent to provider | `1aac5a3aeaec6972c5dfbb54a883de5622274dff51b823c21dd8a79d303b396a` |
| Source repository snapshot | `examples/sample-repository` at `f413b0b90d6157d5493a5603fb1245a7f4681eb6`; 14 files indexed in ephemeral SQLite during preflight |
| Provider and endpoint | `meta_model_api`, `POST https://api.meta.ai/v1/chat/completions` |
| Requested / served model | `muse-spark-1.3` / `muse-spark-1.3` |
| Request count / configured timeout | 1 HTTP attempt / 30 seconds per operation; provider and transport retries disabled |
| Captured at | `2026-10-29T06:30:12.509620+00:00` |
| Provider latency | 6.546 seconds, as reported by the provider adapter |
| Provider usage | 1,123 prompt tokens; 1,579 completion tokens; 2,702 total tokens |
| Local result | Git-ignored `data/sg_ai_22_live_vision.json`, containing schema-validated visual intent and bounded metadata |

The approved [one-call runner](../scripts/smoke_meta_vision.py) completed with exit code 0 and reported `requests=1`. It validated the returned payload with `StructuredVisualIntent`; every required field was present. The persistent `.attempted` marker prevents a second run under the same approval. No key, image bytes, base64 content, raw request prompt or raw provider response is included in this document.

At Meta's [published Standard Muse Spark rates](https://dev.meta.ai/docs/pricing-rate-limits) of $1.25 per million input tokens and $4.25 per million output tokens, the reported usage implies approximately **$0.0081** for this request (1,123 × $1.25/M + 1,579 × $4.25/M). This is an estimate from reported tokens and listed rates, not a billing statement; actual charges may differ. The [vision input documentation](https://dev.meta.ai/docs/cookbook/vision-input) describes image input as tokenized by resolution.

## Direct visual observations and model output

Manual image review shows a NORTHSTAR account/profile page headed “Email settings,” current email `alice@example.test`, a new-email input containing `new-address@example.test`, a “Save email” button, and helper copy: “Your profile email updates after you save.” The left navigation shows Overview, Projects, Account and Reports. These addresses use reserved `.test` domains.

The model returned `screen_type` = “Account / Profile Email settings page.” Its `visible_text` captured all of the above text. Its `visible_elements` identified the sidebar, settings card, labels, current-email display, new-email input, save button and helper paragraph. The `user_actions` field listed possible actions afforded by the UI; it did **not** observe a person taking those actions. No material visible text or primary control was missed in this one image. The model did not report an unseen confirmation link, token, modal, error or success message.

| Model statement | Assessment against pixels |
| --- | --- |
| Account/profile email settings, current and new email, save action | Directly supported by visible text and controls. |
| “Current flow updates immediately after save” | The helper copy suggests this, but a static screenshot cannot establish runtime behavior. |
| Email ownership verification, pending versus active state, prevention of immediate update, identity confirmation | Change-request concepts or implementation hypotheses. None is visibly implemented in the image. |
| Whether verification is for the new/current address, link versus code, pending display, resend/cancel/expiry | Appropriately listed as uncertainty; the image does not decide these. |

The model's `requirement_interpretation` correctly connected the requested verification change to the email settings flow while using the helper copy to infer the existing behavior. It did not assert a specific backend file, symbol, or verified impact claim. The visible screen alone cannot prove that saving changes a record or sends any notification.

## Repository source evidence, separate from vision

The runner indexed the pinned sample but sent **only the screenshot and requirement** to the vision model. The following observations come from manual source review; they are not claims made by the vision response or evidence that the vision model located these files.

| Source path and lines | Source-backed observation | Possible review role |
| --- | --- | --- |
| `app/api/users.py:19-28` | The email endpoint invokes `user_service.update_user_email` and returns an immediate-success response. | Candidate direct edit target. |
| `app/services/user_service.py:15-35` | The service assigns `user.email = new_email`, commits and sends an email-change alert before any verification step. | Candidate direct edit target. |
| `app/api/verification.py:11-24` | The `email_change` confirmation branch returns success without applying the pending email. | Candidate direct edit target. |
| `app/services/verification_service.py:8-38` | Existing token creation and validation cover an email-change token. | Retrieval context; an edit depends on the chosen design. |
| `app/models/verification_token.py:10-15` | `token_type`, `new_email`, `is_used` and expiry fields already exist. | Retrieval context, not an automatic impact. |
| `app/services/notification_service.py:15-19` | An email-change alert exists. | Timing/wording is a conditional indirect concern. |
| `tests/test_users.py:5-25` | A legacy test exercises the immediate update. | Regression-test context. |

Paths above are relative to `examples/sample-repository/`. The source labels in the [multimodal fixture](../services/api/tests/evaluation/multimodal_cases_v1.json) are AI-assisted and still await independent human sign-off. This request did not run retrieval, graph traversal, evidence validation, impact scoring or the screenshot REST endpoint. Therefore it establishes provider connectivity, one-image interpretation and schema compatibility only; it does **not** establish that ScopeGraph predicts the right impacted files.

## Safety and reproduction boundary

The image is local synthetic artwork and contains no user-private repository data. The runner performs full image validation and normalization, checks the pinned fixture and indexed source, enforces the approved provider/model/endpoint, blocks redirects and retries, and stores a sanitized result in an ignored local artifact. The exact invocation was:

```powershell
.\.venv\Scripts\python.exe scripts/smoke_meta_vision.py --execute-live --allow-paid-request --max-requests 1 --timeout-seconds 30
```

That command is **not repeatable under the consumed approval**: the runner refuses when the artifact or `.attempted` marker exists. Any new live request requires a new request budget and explicit authorization. No frontend code, production reasoning code, fixture labels or evaluation algorithms were changed for this smoke test.
