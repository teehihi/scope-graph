# AI Core fixture v3: AI-assisted label review

Updated 2026-10-28. This record applies six `REMOVE` decisions to the [frozen v2 fixture](../services/api/tests/evaluation/ai_core_cases_v2.json) and records them in [v3](../services/api/tests/evaluation/ai_core_cases_v3.json). It is an **AI-assisted source review**, not independent human verification or human sign-off. A second human review remains open.

## Review basis

- Reviewed source snapshot: `f413b0b90d6157d5493a5603fb1245a7f4681eb6`, under `examples/sample-repository/`.
- Dataset: 17 scenarios; 41 original impact labels; 35 `KEEP`, 0 `CHANGE`, 6 `REMOVE`.
- Policy: `direct` is a likely implementation edit target. `indirect` is dependent behavior or an existing regression test that exercises the affected behavior. `retrieval_relevant` is useful context and does not imply impact. `potential` is a plausible relationship without enough evidence for confirmed impact.
- The six source references below reproduce the original v2 annotations. The reviewer rationale explains why those references no longer establish an impact label. No new source evidence was invented.

## Removed labels

| Scenario | Removed label | Original source reference | Review rationale |
| --- | --- | --- | --- |
| `email_confirmation` | direct `app/services/verification_service.py` | `app/services/verification_service.py:8` (token creation) | The service already creates and verifies email-change tokens; the requirement does not establish that the service needs an edit. |
| `email_confirmation` | indirect `app/models/verification_token.py` | `app/models/verification_token.py:13` (`new_email`) | Existing `token_type`, `new_email`, and `is_used` fields already support the needed representation. Retain retrieval relevance. |
| `email_confirmation` | indirect `tests/test_verification.py` | `tests/test_verification.py:22` (verification test) | The existing test covers expiry rejection, not email-change confirmation. |
| `token_reuse` | indirect `tests/test_verification.py` | `tests/test_verification.py:22` (verification test) | The existing test covers expiry, not reuse or double confirmation. Recommend a new reuse regression test when implementing this change. |
| `profile_response` | indirect `app/models/user.py` | `app/models/user.py:15` (`pending_email`) | The field already exists; the likely edit is the response schema and endpoint. Retain retrieval relevance. |
| `authorization_gate` | indirect `tests/test_users.py` | `tests/test_users.py:24` (service test) | The test calls `UserService` directly and does not exercise endpoint authorization. It remains retrieval context only if useful for background service behavior. |

All other impact labels and all `retrieval_relevant` lists remain as in v2. Annotations for removed impact labels move to the v3 `review.removed_impact_labels` records; they no longer appear as active impact evidence.

## Interpretation still open

1. `email_confirmation`: `VerificationService` could become a direct edit target if a future implementation assigns token consumption or email mutation to that service.
2. `email_alert_timing`: `NotificationService` remains direct under the current policy because message wording and event timing may require changes. This depends on the chosen implementation.
3. `email_uniqueness`: the `User` model remains direct because case-insensitive uniqueness may require persistence-level enforcement. The precise solution depends on database semantics.

Predictions that disagree with v3 labels are review candidates, not automatic additions to ground truth. The [evaluation record](EVALUATION.md) shows the label-only replay results. The [original review packet](AI_CORE_LABEL_REVIEW.md) remains the v2 record and should be used for independent human adjudication.
