# AI Core label review packet

Updated 2026-10-28. This packet supports an **independent human review** of the 17-case [v2 fixture](../services/api/tests/evaluation/ai_core_cases_v2.json). The author of the fixture cannot serve as its independent second reviewer. Reviewer and sign-off are intentionally blank.

## Review protocol

1. Check the exact `repository_snapshot`, requirement, and `annotations` in the fixture. Each annotation names a checked-in file, line, and rationale. The automated dataset test confirms paths and line ranges exist; it does not validate the rationale.
2. For each candidate, choose **direct** only when the proposed requirement is likely to require an edit at that location. Choose **indirect** only when current behavior reads/calls the direct target or an existing test exercises the affected behavior. Put plausible but unproven relationships in **retrieval relevance / potential**, not confirmed impact.
3. Examine each `scoring_details.false_positives` and `false_negatives` pair in the ignored `data/ai_core_evaluation_v2_setting_reads.json`. A mismatch is a review candidate, not automatically a model error.
4. Record independent decisions and disagreements in a separate review copy. Do not change the frozen fixture until disagreements are resolved; then increment `dataset_version` and rerun both the offline and live comparisons on the same revised labels.

| Scenario | Direct labels | Indirect labels | Specific adjudication question |
| --- | ---: | ---: | --- |
| `email_confirmation` | 4 | 4 | Are the existing token field and alert service truly affected, or only relevant context? |
| `password_hashing` | 1 | 1 | Does the auth test exercise both hash and verify behavior? |
| `token_expiry` | 2 | 1 | Is changing hours to minutes an edit in both config and service? |
| `access_token_setting` | 1 | 0 | Is `ACCESS_TOKEN_EXPIRE_MINUTES` actually used by the signed-token path? |
| `signed_token_ttl` | 1 | 0 | Is the default argument the actual edit target? |
| `signature_key_rotation` | 1 | 1 | Is the security reader an indirect impact or another direct edit target? |
| `token_reuse` | 2 | 1 | Does the existing test exercise token reuse, or only successful verification? |
| `email_alert_timing` | 3 | 1 | Is the old user test affected by moving the alert trigger? |
| `smtp_host` | 1 | 1 | Confirm the indexed `settings.SMTP_HOST` read reaches the sending method. |
| `registration_response` | 1 | 0 | Does the endpoint own the response field or delegate it? |
| `profile_response` | 1 | 1 | Is the existing model field indirect impact or merely a data source? |
| `verification_error` | 2 | 1 | Does the test assert the error distinction? |
| `email_uniqueness` | 2 | 1 | Is a database/index migration required, and does the test cover mixed case? |
| `password_compare` | 1 | 1 | Does the test call the exact comparison function? |
| `authorization_gate` | 1 | 1 | The labeled service test does not exercise endpoint authorization; should it be potential only? |
| `token_reason_field` | 2 | 0 | Are model and token creator both necessary edit targets? |
| `billing_negative` | 0 | 0 | Verify there is no billing or invoice component in the indexed sample. |

## Sign-off

- Reviewer: **pending**
- Fixture version reviewed: `2026-10-28-manual-v2`
- Decisions and disagreements: **pending**
- Resolved fixture version and rerun artifact: **pending**

The current scores describe only this single Python sample. They are not a production accuracy estimate, and this packet does not substitute for a second reviewer's decisions.
