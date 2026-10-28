# SG-AI-10 — False positive root cause analysis

Status: **analysis only; SG-AI-11 changes require approval**. Prepared 2026-10-28 from saved, local artifacts. No inference request was made.

## Executive summary

On the **17-case v3 labels and saved offline predictions**, the final, source-`supported` output has **45 false-positive `(file_path, impact_type)` pairs** across 65 predicted pairs (20 true positives). The 45 is a **micro, strict file/type** count; it is neither the 93 label-mismatched existence-gated raw claims nor a Meta result. Deterministic replay reproduced the saved scores. Of the 45 final false positives, 34 are `direct`, 11 are `indirect`; one has the right file but the wrong type. No duplicate accepted pairs, nonexistent files, invalid symbols, or completeness-review promotions contributed to this count.

The clearest observed chain is: the deterministic offline provider often emits generic keyword-based impact claims; a verifier treats symbol/reason term overlap as direct support and a call to such a target as indirect support. This turns *relevance* and *callability* into confirmed edit impact. The problem is especially visible when the word `verification` in a password requirement is treated as email-token verification, or when an expiry test is accepted for SMTP, response, reuse, or model-field changes. Retrieval noise amplifies this chain, but the saved file-path graph does not prove an incorrect edge. These are **offline demo** findings, not measured Meta failure rates.

## Provenance and scoring contract

| Item | Verified value |
| --- | --- |
| Artifact analyzed | `data/ai_core_evaluation_v3_label_replay.json` (Git-ignored, schema 2, 1,323,695 bytes) |
| Dataset | `2026-10-28-ai-assisted-v3`; 17 scenario IDs and trace labels match `services/api/tests/evaluation/ai_core_cases_v3.json` |
| Source snapshot | `f413b0b90d6157d5493a5603fb1245a7f4681eb6`; Git recognizes this commit and `examples/sample-repository/` has no tracked diff against it; 14 indexed files |
| Prediction origin | `data/ai_core_evaluation_v2_setting_reads.json`, dataset `2026-10-28-manual-v2`; v3 replay replaced labels only |
| Provider / model | `offline_demo` / `deterministic-semantic-matcher`; requested model field `muse-spark-1.3` is configuration, **not** the provider used |
| Recorded inference SHA | `6e4a0cbddbdcda92ac2dca9df2baf2d6679687ef`; the original run included then-uncommitted changes, so this SHA alone does not identify every executable byte |
| Label-review SHA | `897b930887dc13a60ac037f9c41ae7ef93bb17c7`; current inspection HEAD `4cdb7b4dc81706f96cc3b2de142288c971f643a4` |
| Label status | 25 direct + 10 indirect = 35 impact pairs; AI-assisted source review, **independent human sign-off pending** |

The fixture is one small authentication sample, not the separate FastAPI RealWorld holdout. The latter has not been evaluated here. The artifact's `trace.interpretation`, `trace.reasoning_context.retrieved_files`, raw claims, existence-gated claims, supported claims, potential claims, graph file paths, review suggestions, and labels are present. Its graph context records paths, not a full edge-ID/type provenance for every claim; source inspection below therefore supports call relationships, not an assertion that a particular archived edge ID was correct.

`services/api/app/analysis/evaluation.py:25-43,101-156,164-238` compares **sets** of `(path, type)` for strict impact, averages defined per-case ratios for macro metrics, and pools TP/FP/FN for micro metrics. A right file with a wrong type yields one FP and one FN. The negative billing case has zero gold and zero predictions, so its strict precision/recall are `null`. Two positive cases also have zero final predictions: their precision and F1 are `null`, while their recall is zero. Thus macro strict precision/F1 average **14** defined cases and recall averages **16**. Grounding's 93/111 compares the **existence-gated raw claims** with labels; it is not the final supported FP count. An unlabelled prediction is a scorer disagreement, not proof of a runtime bug.

### Replayed metrics

| View | Precision | Recall | F1 | Direct recall | Indirect recall | Counts / denominator |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| Final supported, micro strict | 0.307692 | 0.571429 | 0.400000 | 15/25 = 0.600 | 5/10 = 0.500 | TP 20, FP 45, FN 15; 65 predicted / 35 gold |
| Final supported, macro strict | 0.309184 | 0.579167 | 0.395011 | 0.583333 | 0.500000 | 14 precision/F1 cases; 16 recall/direct cases; 9 indirect cases |
| Existence-gated raw, macro strict | 0.154018 | 0.511458 | 0.229469 | 0.437500 | 0.500000 | 111 raw claims, 93 unique pairs outside labels |
| Final supported, macro file-only | 0.319388 | 0.591667 | 0.406916 | — | — | File path match ignores type |

All **111 raw claims** passed file/symbol existence validation; 111 unique accepted pairs, zero duplicate accepted claims, zero rejected hallucinations. The final `affected_items` hold 65 unique pairs; 48 `potential_claims` are recorded separately and are **not** the complement of 65 because type correction and additional candidates change the pair universe. The causal pass retyped 11 final FP pairs relative to the raw claim on that file (three `indirect→direct`, eight test `direct→indirect`). No final FP was introduced as a new file by completeness review; `promoted_suggestions=0` in all 17 cases. Exactly three scenarios have zero final FPs: `signed_token_ttl`, `signature_key_rotation`, and `billing_negative`.

## Scenario ledger and ground truth

Paths in this section and the claim table use these aliases, all relative to `examples/sample-repository/`: `AU`=`app/api/users.py`, `AV`=`app/api/verification.py`, `AA`=`app/api/auth.py`, `CF`=`app/core/config.py`, `SC`=`app/core/security.py`, `VT`=`app/models/verification_token.py`, `UM`=`app/models/user.py`, `NS`=`app/services/notification_service.py`, `US`=`app/services/user_service.py`, `VS`=`app/services/verification_service.py`, `TU`=`tests/test_users.py`, `TV`=`tests/test_verification.py`, `TA`=`tests/test_auth.py`. `D`/`I` mean direct/indirect gold labels. The requirement text is reproduced from each saved trace and matches the v3 fixture.

| Scenario | Requirement | Gold D | Gold I | Final FP |
| --- | --- | --- | --- | ---: |
| `email_confirmation` | Require email verification before users can change their email address | AU, US, AV | NS, TU | 4 |
| `password_hashing` | Strengthen password hashing and verification | SC | TA | 4 |
| `token_expiry` | Shorten email verification token expiry to thirty minutes | CF, VS | TV | 4 |
| `access_token_setting` | Change the configured access token expiry to twenty minutes | CF | — | 4 |
| `signed_token_ttl` | Reduce the default lifetime of signed action tokens | SC | — | 0 |
| `signature_key_rotation` | Rotate the signing secret used for action tokens | CF | SC | 0 |
| `token_reuse` | Reject reused email verification tokens after confirmation | VS, AV | — | 4 |
| `email_alert_timing` | Send the email changed alert only after the new address is confirmed | US, NS, AV | TU | 2 |
| `smtp_host` | Change the configured SMTP host for verification emails | CF | NS | 4 |
| `registration_response` | Return a pending verification status from the registration API | AA | — | 4 |
| `profile_response` | Include pending email in the user profile API response | AU | — | 3 |
| `verification_error` | Return a distinct error for expired verification tokens | AV, VS | TV | 1 |
| `email_uniqueness` | Make email uniqueness checks case insensitive | US, UM | TU | 2 |
| `password_compare` | Change password verification comparison behavior | SC | TA | 4 |
| `authorization_gate` | Require authorization before changing a user's email | AU | — | 3 |
| `token_reason_field` | Store a reason on each verification token record | VT, VS | — | 2 |
| `billing_negative` | Change invoice rounding for billing reports | — | — | 0 |
| **Total** | **17 cases** | **25 labels** | **10 labels** | **45** |

## Claim-level false positives

**How to read the rows.** Each row is one unique final false-positive file/type pair from `case.scoring_details.false_positives`; there are exactly 45. `rN` is the **actual orchestrator retrieval rank**; `—` means absent from selected reasoning context. `G: X→Y` is the raw provider's downstream-path reason. `D: symbol` abbreviates the raw provider's literal template `Direct target for changes: contains ...` and names its first matched symbol. `N: symbol` abbreviates its literal `Connected dependency handling user/email lifecycle (...)` reason; `symbol` is the indexed symbol attached to that raw claim. The full raw text is preserved in `trace.raw_impact`. The listed line is a source location explaining why the prediction is or is not a required edit; it need not equal the validator's wide class snippet. Every row passed `existence_verified=True`, had no rejected hallucination, and ended `impact_supported=True`/`evidence_status=supported` in the saved trace.

`S` means the verifier cited **symbol/reason term overlap**; `F` means it retyped an indirect claim as direct because an indexed function name matched multiple terms; `K: target` means it cited an indexed `calls` edge to a supported direct target (the table gives the target). These codes are the verifier's *actual support reasons*, not our endorsement of causal impact. Primary diagnosis: `R`=`LLM_REASONING_ERROR` (here the deterministic offline provider), `E`=`EVIDENCE_GROUNDING_ERROR` (causal gate overpromoted relevance/callability), `T`=`IMPACT_TYPE_ERROR`. Confidence `H` is high for the mechanism and current label interpretation; `M` marks an implementation-dependent effect. `Potential fix` codes are defined in the SG-AI-11 plan below.

| # | Scenario | Predicted pair | Raw explanation | Retrieval / graph | Verifier; source evidence | Primary diagnosis; why; potential fix |
| ---: | --- | --- | --- | --- | --- | --- |
| 1 | `email_confirmation` | VT D | D: `VerificationToken` | r4 | S; VT:12-15 already has email-change, new-email, used, expiry fields | R-H: existing representation, no established edit; P2 |
| 2 | `email_confirmation` | NS D | N: `NotificationService.send_verification_email` | r5 | F; NS:7-13 sends link; NS:15-19 sends changed alert | T-H: gold NS I, verifier changed raw I→D; P1 |
| 3 | `email_confirmation` | VS I | G: VT→VS | —; VT→VS | K: VT; VS:11-18 constructs existing token | E-H: inherits false VT direct premise; P1 |
| 4 | `email_confirmation` | TV I | G: VT→TV | —; VT→TV | K: VT; TV:5,22-23 tests expiry only | E-H: test does not exercise email-change confirmation; P1 |
| 5 | `password_hashing` | AV D | D: `confirm_verification_token` | r4 | S; AV:12-24 handles verification token | R-H: unrelated to password hash/compare in SC:6-10; P2 |
| 6 | `password_hashing` | VT D | D: `VerificationToken` | r5 | S; VT:6-16 is email verification token data | R-H: wrong verification mechanism; P2 |
| 7 | `password_hashing` | VS D | D: `VerificationService` | r7 | S; VS:8-38 handles email verification tokens | R-H: no password hashing operation; P2 |
| 8 | `password_hashing` | TV I | D: `test_token_verification_expired` | r8; calls VS | K: VS; TV:22-23 checks expired email token | E-H: raw D→I but test does not call SC hash/verify; P1 |
| 9 | `token_expiry` | AU D | D: `UpdateEmailRequest` | r7 | S; AU:7-8 validates an email address | R-H: no expiry value; CF:7 and VS:10 set it; P2 |
| 10 | `token_expiry` | AV D | D: `VerifyTokenRequest` | r4 | S; AV:8-18 accepts token and generic expired error | R-H: token request schema does not set lifetime; P2 |
| 11 | `token_expiry` | VT D | D: `VerificationToken` | r1 | S; VT:15 stores `expires_at` | R-M: storage exists; no demonstrated schema edit to shorten duration; P2 |
| 12 | `token_expiry` | NS D | N: `NotificationService.send_verification_email` | r5 | F; NS:7-13 builds/sends a link | E-H: raw I→D by name overlap, no expiry calculation; P1 |
| 13 | `access_token_setting` | AV D | D: `VerifyTokenRequest` | r4 | S; AV:8-18 handles email token | R-H: access-token setting is CF:6; P2 |
| 14 | `access_token_setting` | VT D | D: `VerificationToken` | r3 | S; VT:6-16 is email token model | R-H: `token` conflates two mechanisms; P2 |
| 15 | `access_token_setting` | VS D | D: `VerificationService.create_verification_token` | r6 | S; VS:10 reads **email** expiry setting CF:7 | R-H: unrelated to access-token minutes CF:6; P2 |
| 16 | `access_token_setting` | TV I | D: `test_token_verification_expired` | r2; calls VT | K: VT; TV:18,22-23 tests email-token expiry | E-H: raw D→I from wrong token target; P1 |
| 17 | `token_reuse` | VT D | D: `VerificationToken` | r1 | S; VT:14 already has `is_used` | R-H: existing field does not establish model edit; P2 |
| 18 | `token_reuse` | NS D | N: `NotificationService.send_verification_email` | r3 | F; NS:7-13 sends verification link | E-H: raw I→D, no consumption/reuse logic; P1 |
| 19 | `token_reuse` | US D | D: `UserService.get_user_by_email` | r6 | S; US:12-13 looks up email; VS:28-38 checks token | R-M: no proven need to change user lookup for reuse; P2 |
| 20 | `token_reuse` | TV I | D: `test_token_verification_expired` | r5; calls VS | K: VS; TV:18,22-23 tests expiry, not reuse | E-H: raw D→I; v3 review explicitly removed this label; P1 |
| 21 | `email_alert_timing` | AU D | D: `UpdateEmailRequest` | r2 | S; AU:19-28 invokes US update | R-M: alert timing currently in US:35/NS:15; endpoint edit is design-dependent; P2 |
| 22 | `email_alert_timing` | VT D | D: `VerificationToken.new_email` | r7 | S; VT:13 stores address, not alert schedule | R-H: name overlap without timing effect; P2 |
| 23 | `smtp_host` | AV D | D: `confirm_verification_token` | r4 | S; AV:12-24 confirms token | R-H: SMTP host read is NS:12 from CF:8; P2 |
| 24 | `smtp_host` | VT D | D: `VerificationToken` | r3 | S; VT:6-16 stores token, not transport host | R-H: unrelated data model; P2 |
| 25 | `smtp_host` | VS D | D: `VerificationService` | r6 | S; VS:25 invokes notification, does not read host | R-H: caller relevance does not require editing caller; P2 |
| 26 | `smtp_host` | TV I | G: VT→TV | —; VT→TV; calls VS | K: VS; TV:5,22-23 checks expiry | E-H: existing test does not exercise SMTP config or notification; P1 |
| 27 | `registration_response` | AV D | D: `confirm_verification_token` | r1 | S; AV:11-24 is confirmation endpoint | R-H: requested registration response is AA:22-25; P2 |
| 28 | `registration_response` | VT D | D: `VerificationToken` | r3 | S; VT:6-16 stores token | R-H: no response payload in model; P2 |
| 29 | `registration_response` | VS D | D: `VerificationService` | r5 | S; VS:8-38 handles token lifecycle | R-H: no registration response schema; P2 |
| 30 | `registration_response` | TV I | D: `test_token_verification_expired` | r6; calls VS | K: VS; TV:22-23 is expiry test | E-H: raw D→I follows an unrelated direct target; P1 |
| 31 | `profile_response` | VT D | D: `VerificationToken.user_id` | r7 | S; VT:10,13 stores token/user/new email | R-H: profile response in AU:10-17; P2 |
| 32 | `profile_response` | US D | D: `UserService` | r3 | S; US:8-13 fetches users | R-M: endpoint currently constructs response itself, not through service; P2 |
| 33 | `profile_response` | TU I | D: `test_update_user_email_direct` | r4; calls US | K: US; TU:24-25 tests direct mutation | E-H: raw D→I, test does not exercise profile response; P1 |
| 34 | `verification_error` | VT D | D: `VerificationToken` | r3 | S; VT:15 stores expiry | R-M: distinct error requires VS/AV branch, no demonstrated model edit; P2 |
| 35 | `email_uniqueness` | AU D | D: `UpdateEmailRequest` | r1 | S; AU:7-8 validates email syntax | R-M: case-folded uniqueness is US:12-27/UM:11, endpoint edit unproven; P2 |
| 36 | `email_uniqueness` | VT D | D: `VerificationToken.new_email` | r7 | S; VT:13 stores candidate address | R-H: not the uniqueness query/constraint; P2 |
| 37 | `password_compare` | AV D | D: `confirm_verification_token` | r1 | S; AV:12-24 handles email token | R-H: password comparison is SC:9-10; P2 |
| 38 | `password_compare` | VT D | D: `VerificationToken` | r2 | S; VT:6-16 is email token record | R-H: unrelated comparison mechanism; P2 |
| 39 | `password_compare` | VS D | D: `VerificationService` | r4 | S; VS:28-38 verifies email token | R-H: same word `verification`, different behavior; P2 |
| 40 | `password_compare` | TV I | D: `test_token_verification_expired` | r6; calls VS | K: VS; TV:22-23 checks token expiry | E-H: raw D→I; correct password regression is TA:3-8; P1 |
| 41 | `authorization_gate` | VT D | D: `VerificationToken.user_id` | r6 | S; VT:10 is a foreign key | R-H: endpoint auth gate belongs at AU:19-27; P2 |
| 42 | `authorization_gate` | US D | D: `UserService` | r2 | S; US:8-52 is service logic | R-M: authorization placement could vary; fixture policy targets endpoint; P2 |
| 43 | `authorization_gate` | TU I | D: `test_update_user_email_direct` | r3; calls US | K: US; TU:24-25 bypasses endpoint | E-H: raw D→I; v3 review removed endpoint-auth test label; P1 |
| 44 | `token_reason_field` | AV D | D: `VerifyTokenRequest` | r1 | S; AV:8-9 receives token only | R-H: reason storage targets VT:6-16 and VS:8-18; P2 |
| 45 | `token_reason_field` | TV I | D: `test_token_verification_expired` | r4; calls VS | K: VS; TV:13-23 constructs a token and tests expiry | E-M: may need adaptation if new reason is non-nullable; not an existing reason-behavior test; P1 + human review |

The table's `source evidence` cites the checked-in snapshot. For rows with `K`, the saved trace supplies the supported target and the sample source supplies the corresponding call or construction; neither alone proves the test exercises the *changed behavior*. For rows 3, 4, and 26, the raw provider's graph path is explicitly present in `reasoning_context.dependency_context.paths`; for other `K` rows, the verifier's `dependency_path` is present in `validated_impact`. A missing rank does **not** mean the model saw no graph context: the offline provider can add a downstream file from `dependency_context` even when the file itself was not retrieved.

## Root cause classification and systemic patterns

| Primary category | Count / 45 final unique FP pairs | Evidence and interpretation |
| --- | ---: | --- |
| `LLM_REASONING_ERROR` (`R`, deterministic provider) | 31 | Raw provider asserted direct edit targets from path/symbol keyword matches; causal gate then accepted symbol/reason term overlap (`S`). The provider's implementation at `services/api/app/ai/provider.py:295-315,324-365` also inserts email-change assumptions for unrelated requirements. This category identifies the first bad claim; it does not absolve the gate. |
| `EVIDENCE_GROUNDING_ERROR` (`E`) | 13 | Two `F` reclassifications and eleven `K` indirect supports used name overlap or an indexed call without checking requirement-specific behavior (`services/api/app/analysis/causal.py:64-88,119-160`). Calls may be real while the edit impact is unproved. |
| `IMPACT_TYPE_ERROR` (`T`) | 1 | `email_confirmation` NS was raw indirect, then reclassified direct; v3 gold is indirect and source shows the alert is invoked after immediate mutation (`US:35`). |
| `RETRIEVAL_ERROR`, `GRAPH_ERROR`, `COMPLETENESS_REVIEW_ERROR`, `DUPLICATE_OR_SCORING_ERROR`, `GROUND_TRUTH_DISAGREEMENT`, `INSUFFICIENT_TRACE` | 0 **confirmed primary attributions** | There is retrieval noise and label uncertainty, but no saved evidence justifies assigning one of these as a *primary confirmed* cause of a particular final pair. See below. |

The `R/E/T` counts sum to 45. Confidence is high for the **mechanical path** because raw, retrieved, existence, causal, and scored claims survive in the artifact. Confidence in a proposed edit's *necessity* is lower for rows marked `M` because the requirement does not prescribe an implementation. No percentage here is a production accuracy estimate.

### Retrieval and interpretation

- `password_hashing` and `password_compare` both have `search_keywords=['verification','password']` in the saved *offline interpretation*. The requirement itself contains `verification`, but the source at `provider.py:295-315` does not distinguish password verification from email-token verification. For `password_compare`, AV is retrieved first and SC only seventh; for `password_hashing`, AV/VT/VS/TV enter the context although SC and TA are the relevant implementation/test. This is a concrete interpretation-plus-retrieval contamination pattern, not proof of a Meta interpretation error.
- `access_token_setting` has only `token` as a search keyword. CF:6 is the access-token setting; CF:7/VS:10/VT:6-16 concern **email verification tokens**. VT ranks third, TV second, and all are later overpredicted. `registration_response` puts AV first and the actually labeled registration endpoint AA eighth. `email_confirmation` does not select AV, a gold direct file, although it is present as a graph candidate; the saved selected context uses seven files and approximately 2,949 of 3,000 estimated tokens. The artifact omits rejected candidate rankings, so we cannot apportion that miss between rank and budget.
- `HybridRetriever` ranks term overlap and adds one-hop neighbors (`services/api/app/analysis/retriever.py:76-204`). It includes bounded source snippets, but rank can still favor frequent/shared words rather than the exact operation. The saved 17-case macro hybrid Recall@8 is 0.956 for *retrieval-relevant* labels; high retrieval recall does not make all retrieved files edit targets. The selected-context character proxy is 41.7% **larger** than the old full-summary baseline on average, and 12.8% smaller than full raw source; these are not actual billed tokens.

### Graph and causal support

- Persisted edges point from dependent/caller to dependency; downstream traversal reverses that direction (`services/api/app/graph/engine.py:185-223`). The source relationships in the highlighted rows are plausible: TV calls `VS.verify_token` at TV:22, VS creates `VerificationToken` at VS:11, and TV constructs VT at TV:13. This audit found **no trace-backed wrong edge direction or same-named symbol resolution error** for these 45 pairs. The indexer now resolves imports/module scope and leaves ambiguous names unresolved (`services/api/app/indexing/engine.py:142-212`). The saved graph context lacks per-claim edge IDs, so it cannot establish every persisted edge's correctness either.
- The verifier's `supported_call` accepts a call if it targets a file already marked direct and a target symbol equals or starts with the supported symbol (`causal.py:119-128`). It does not require that the source call exercises the requested changed behavior. Thus TV's expiry test is accepted for `smtp_host`, `registration_response`, `token_reuse`, and `password_compare` once a nearby verification file is marked direct. The underlying edge can be valid; the **causal inference from edge to impact** is the error.
- `CausalImpactVerifier` accepts direct claims when a symbol, a snippet, and the generic model reason share a requirement term (`causal.py:64-76`). This is stronger than mere existence but still weak: VT:15 proves an expiry field exists, not that changing token lifetime edits the model; AV:12 proves a token-confirmation endpoint exists, not that changing password comparison edits it. `EvidenceValidator` explicitly sets `impact_supported=False` after existence checks (`services/api/app/evidence/validator.py:21-61,103-205`); the later causal pass sets it true. Do not interpret 111/111 existence acceptance as causal validation.
- The completeness review only proposed candidates, with zero `promoted_suggestions` on this artifact. It cannot explain any of the 45 final FPs (`services/api/app/analysis/orchestrator.py:89-140`). The trace includes the actual `reasoning_context`, so the prior SG-AI-07 missing-context limitation is addressed for this offline run. It still lacks detailed edge provenance and discarded retrieval candidate ranks.

### Ground truth and scoring disagreements

No **confirmed label error** was established by this audit. The v3 AI-assisted review intentionally removed impact labels for VT and TV in `email_confirmation`, TV in `token_reuse`, and TU in `authorization_gate`; these rows remain retrieval-relevant or plausible background and should not be silently restored. The exact strict type disagreement is row 2: NS is gold `indirect`, predicted `direct`. That is a type error under the stated policy, even though a future implementation could edit NS. Row 45 is the clearest **possible** gold disagreement: adding a non-nullable `reason` to VT might force the existing TV fixture to change; a nullable/defaulted field might not. Count: **0 confirmed, 1 explicitly flagged candidate**. Other `M` rows are design-dependent edit targets, not evidence that the labels are wrong. Human adjudication should KEEP/CHANGE/REMOVE with source-backed rationale before treating these as tuning targets.

## Quantitative roll-up

- Final strict FP by scenario: `email_confirmation` 4; `password_hashing` 4; `token_expiry` 4; `access_token_setting` 4; `signed_token_ttl` 0; `signature_key_rotation` 0; `token_reuse` 4; `email_alert_timing` 2; `smtp_host` 4; `registration_response` 4; `profile_response` 3; `verification_error` 1; `email_uniqueness` 2; `password_compare` 4; `authorization_gate` 3; `token_reason_field` 2; `billing_negative` 0. Denominator: 45 unique final pairs over 17 scenarios.
- Final strict FP by claimed type: **34 direct, 11 indirect**. Only **1/45** is the same gold file with the opposite type (NS in `email_confirmation`); the other 44 files lack a same-file gold impact label in that scenario. Eleven final FP pairs have a different type from their raw claim, but eight of those are test direct→indirect corrections and three are service indirect→direct corrections; a type change is not by itself an error.
- By causal support reason: **31** symbol/reason overlap `S`, **3** function-name overlap `F` (all NS), **11** indexed-call `K`. These are exactly the 45 FP rows. No final FP came from a newly promoted completeness path, graph test, setting, or read edge; some true positives did come from setting/read promotions, so do not disable those paths wholesale.
- Most frequent FP components across scenarios: VT **13**, TV **8**, AV **7**, VS **6**, NS **3**, AU **3**, US **3**, TU **2**. Denominator: 45 unique scenario/file/type pairs, not eight unique files. VT+TV account for 21/45 pair appearances; this reflects the small auth fixture and broad `token`/`verification` vocabulary.
- Existence-gated raw mismatches: **93/111 unique raw accepted pairs**, with **zero raw duplicates** in this run. Final scored false positives: **45/65** unique supported pairs. These denominators and stages are different; subtracting 45 from 93 does not directly measure the number of claims successfully rejected because the causal pass can retype/promote candidates.

## SG-AI-11 targeted implementation plan (not implemented)

Priority considers evidence strength, the observed 31/13/1 failure split, cross-provider value, complexity, recall risk, and hackathon scope. Tests below must use small synthetic repositories or the existing development fixture; do **not** tune against the frozen human-reviewed holdout.

| Priority / fix | Confirmed problem and minimal files/approach | Expected benefit; risk | Required regression tests and acceptance |
| --- | --- | --- | --- |
| **P0 / P1: Make causal support requirement-specific** | `services/api/app/analysis/causal.py`: replace the broad `matching(symbol) && matching(generic reason)` direct support with a bounded check that the cited symbol/snippet contains the **specific operation or setting** requested. Distinguish password verification from email-token verification and access tokens from email tokens. If evidence is insufficient, preserve the candidate as `potential`, with an explicit reason. Keep `EvidenceValidator`'s path/symbol gate. | Can demote many of the 31 `S` FPs across providers; risk: overly strict rule hides true direct impacts or special-case heuristics overfit auth samples. | Synthetic adversarial cases: `hash_password` vs `verify_token`, access-token vs email-token setting, model field already present, negative billing case. Assert unrelated claims remain potential; actual setting/function edits remain supported; no increase in nonexistent references. On frozen v3 replay of **newly generated offline output** (separate artifact), require strict precision to improve without lower direct/indirect recall; never revise gold to achieve the target. |
| **P0 / P2: Remove hardcoded offline interpretation and path rules** | `services/api/app/ai/provider.py:295-405`: make the zero-cost demo interpretation preserve the requirement's domain, avoid unconditional email-change actors/behavior, and derive search terms and impact candidates from exact operation/setting names rather than path substring `verification`/`email`. Keep deterministic, provider-labelled output. | Addresses the first bad claim in 31 rows and noisy retrieval in password/response/config cases; risk: changes local demo behavior, old golden snapshots and scores no longer comparable. It does **not** establish Meta quality. | Unit cases for password hashing, password comparison, SMTP host, access-token expiry, email confirmation, and no-impact billing; assert no unrelated verification keywords for password-only intent, correct selected targets, deterministic output, and explicit `offline_demo` metadata. Save a new versioned offline artifact; never overwrite the v3 label-only replay. |
| **P1 / P3: Require behavior-specific downstream evidence** | `services/api/app/analysis/causal.py` and existing indexed edge metadata: for `K` support, check the call's source symbol and target method against the requested operation, rather than accepting any call to a broadly supported class/file. A test of `verify_token` expiry is only confirmed for behavior it exercises. Keep unrelated callers visible as potential. | Targets 11 `K` FPs; risk: static analysis cannot resolve all dynamic call sites, reducing indirect recall. | Synthetic tests for expiry, reuse, SMTP transport, registration response, profile response, and endpoint authorization; include a real dependent test and an unrelated call in the same file. Assert only the behavior-relevant dependent is supported, unresolved calls remain potential, and known true indirect cases retain recall. |
| **P1 / P4: Reduce context contamination** | `services/api/app/analysis/retriever.py` and the interpretation-to-retrieval handoff in `orchestrator.py`: keep source snippets and top-K budget, but prioritize exact qualified settings/functions and relevant call-site snippets over broad token/name matches; record discarded candidate reasons for audits. | May reduce the initial noise and retrieve AV for email confirmation or AA earlier for registration; risk: ranking changes can displace relevant neighbors and increase prompt size. | Stable-order/top-K/budget tests plus cross-mechanism retrieval cases. Assert relevant operation/setting appears, irrelevant homonym is not promoted above it, and reasoning context exactly matches recorded selected paths. Report Recall@8 and context cost, not just precision. |
| **P2 / P5: Preserve diagnostic provenance** | `services/api/app/analysis/orchestrator.py`, `services/api/app/analysis/evaluation.py`, `scripts/replay_ai_core.py`: include edge ID/type/source/target symbol for causal support and candidate rank/budget rejection reason in future **ignored, redacted** traces; keep strict, file-only, raw, supported, and duplicate counters separate. | Better attribution and human review; no direct accuracy gain. Risk: larger artifacts and accidental secret/source leakage. | Pure replay equality, duplicate accounting, redaction, and provenance consistency tests. A trace should explain why a claim was supported and why a candidate was dropped without making inference calls. |

**Recommended first fix:** P1, the requirement-specific direct support gate, followed immediately by P3 downstream behavior checks. P1 is the narrowest cross-provider guard against turning mere symbol existence into a confirmed edit target. It should be tested on neutral synthetic examples before any new v3 score is reported.

## Acceptance criteria and limits

1. Preserve v3 labels, the original saved replay, the separate holdout, and the REST/MCP contract. New experimental results get new filenames and record dataset version, snapshot, provider, mode, code commit, and uncommitted-state caveat.
2. In targeted tests, an existing but behavior-irrelevant file stays `potential`; a concrete operation/setting target stays supported; indirect support requires a behavior-relevant call/read. A corrected direct/indirect type is traceable. No unrelated file becomes supported solely through a completeness suggestion or graph neighbor.
3. Run the full backend suite after implementation, then compare raw and final strict micro/macro precision **and** direct/indirect recall on unchanged, human-adjudicated labels. Report candidate coverage, rejected hallucinations, and retrieval Recall@8. Set no production threshold from 17 cases.
4. Independent human review of all 17 labels and the separate holdout remains pending. This report cannot decide whether every proposed future implementation would touch the same files, whether the Meta model has these offline-demo errors, the frequency of failure in other repositories, or whether a disputed test label should change. The three-case live Meta artifacts are different datasets/modes and must not be merged into this denominator.
5. Current source code is consistent with the traced decision patterns, but the original prediction record's `commit_sha` predates then-uncommitted changes. Without a full source-state manifest for that run, exact byte-for-byte historical re-execution is unproven. The **saved-trace metric replay**, the 45 claim rows, and their fixture/snapshot alignment are independently verifiable without inference.

## Verification performed

- Read `AGENTS.md`, Git status/diff, the AI Core progress and evaluation documents, the SG-AI-07 investigation, v3 review, fixture, saved artifact, and relevant analysis/indexing/graph/evidence/provider code. Existing uncommitted SG-AI-09B holdout files were preserved.
- Ran `scripts/replay_ai_core.py --input data/ai_core_evaluation_v3_label_replay.json` with the existing `.venv`; exit code **0**, no paid inference. A direct in-memory `replay_evaluation` check reproduced all stored case score objects and macro/micro score objects exactly.
- Programmatically checked 17 matching scenario IDs, v3 dataset version/snapshot/impact labels, 45 `scoring_details.false_positives` rows, 20 TP, 15 FN, 111 raw/65 final predictions, zero raw duplicates, and the per-scenario/per-component/category roll-ups above. `git diff` against the pinned snapshot showed no tracked difference in the sample source.

**Next action:** obtain review of this diagnosis and the v3 label ambiguities, then approve a narrowly scoped SG-AI-11 P1 implementation with synthetic regression tests. No fix is applied by this report.
