# FastAPI RealWorld holdout v1: AI-assisted source review

**Reviewed:** 2026-10-28 (Asia/Bangkok)
**Status:** Technical review complete; independent human sign-off pending. This document is an AI-assisted source review, not a human approval or a frozen gold dataset. No ScopeGraph predictions or holdout scores informed the decisions.

## Executive summary

I reviewed all **10 scenarios** and **23 existing impact labels** against the selected source snapshot. The existing labels are technically supported: **KEEP 23, CHANGE 0, REMOVE 0** (10 direct, 13 indirect). I found **two additional, source-supported indirect-label proposals**: the article-list route for `api_default_page_size` and the current-user authorization dependency for `access_token_ttl`. These are proposals for human adjudication, not changes to the candidate fixture. If accepted, the counts would be **10 direct, 15 indirect, 25 total**. The existing fixture remains at **10 direct, 13 indirect, 23 total**.

The most consequential nuance is the slug case: the existing duplicate-slug test creates an article with stored `test-slug`, then derives a slug from `Test Slug`. With the requested underscore separator, the new slug would be `test_slug`; the existing collision test would no longer exercise a collision. This strengthens the existing indirect label for that test file, without adding another file label.

## Provenance and policy

| Item | Reviewed value |
| --- | --- |
| Candidate fixture | `services/api/tests/evaluation/holdout_realworld_cases_v1.json`; version `2026-10-28-realworld-holdout-v1-candidate` |
| Fixture SHA-256 | `5892974d49b89a735104d6857aacc4314599d2a3eec544bcc76d4599a00f5615` |
| Upstream source | `nsidnev/fastapi-realworld-example-app` commit `029eb7781c60d5f563ee8990a0cbfb79b244538c` |
| Selected source | `examples/holdout-fastapi-realworld/`: upstream `LICENSE` plus complete `app/` and `tests/` subtrees, **103 files**, including **95 Python files**; this is not the complete upstream repository |
| Snapshot manifest | `services/api/tests/evaluation/holdout_realworld_snapshot_v1.json`; tree SHA-256 `f112558f9f09dd0bb426e33e2c628851fe6561ba1365487c7336098f463ab51b` |
| Review policy | **Direct:** likely implementation edit. **Indirect:** dependent behavior or an existing test that exercises it. **Retrieval-only:** useful context without established impact. **Potential:** plausible relationship requiring an unspecified design choice. |

All source references below are **relative to `examples/holdout-fastapi-realworld/`** at the pinned commit. A label is a file-level classification: several affected lines within one file remain one label. “KEEP” means the current label is supported by the stated requirement, not that every occurrence in that file must be edited. New regression tests are recommendations, not automatic labels for existing tests that lack the required assertion.

## Complete scenario review and per-label decisions

### 1. `article_title_length`

**Requirement:** Reject article create and update API requests with titles longer than 120 characters.

**Existing behavior:** `ArticleInCreate.title` and `ArticleInUpdate.title` are unrestricted strings; the create and update endpoints accept those schemas.

| Existing label | Decision and source-based reason |
| --- | --- |
| Direct `app/models/schemas/articles.py:21` | **KEEP.** The create title is a plain `str`; the update title at line 28 is `Optional[str]`. Both request boundaries need the new length rule. |
| Indirect `app/api/routes/articles/articles_resource.py:60` | **KEEP.** The create endpoint consumes `ArticleInCreate`; the update endpoint consumes `ArticleInUpdate` at line 96. Their accepted requests change through schema validation. |

**Retrieval/potential:** `app/models/domain/articles.py:10` has a domain title field, but the requirement is API-scoped; keep it retrieval-relevant and potential only if internal construction must later obey the limit. `tests/test_api/test_routes/test_articles.py:32-44,99-119` uses short titles and lacks a boundary assertion; retrieval-only. **Missing confirmed labels:** none. **Ambiguity:** whether internal domain construction should also be constrained. **New tests:** create and update with exactly 120 and 121 characters; verify rejection and that a failed update leaves the stored article unchanged.

### 2. `article_slug_separator`

**Requirement:** Use underscores in title-derived slugs on create and title update.

**Existing behavior:** `get_slug_for_article` calls `slugify(title)` without a separator argument. Both create and update call the helper. The update test expects `new-title`.

| Existing label | Decision and source-based reason |
| --- | --- |
| Direct `app/services/articles.py:18-19` | **KEEP.** This shared helper generates the slug and is the likely separator edit target. |
| Indirect `app/api/routes/articles/articles_resource.py:64` | **KEEP.** Create calls the helper at line 64 and update calls it at line 100; the resulting route outputs and persisted slug change. |
| Indirect `tests/test_api/test_routes/test_articles.py:94` | **KEEP.** The title-update expectation explicitly says `new-title`. The same file's duplicate test at lines 18-29 also needs attention: its existing `test_article` has `test-slug` (`tests/conftest.py:67-76`), while a newly generated slug from `Test Slug` would be `test_slug`, so the former 400 collision would disappear unless the test setup is changed. |

**Retrieval/potential:** `app/db/repositories/articles.py:75,81-86` and `app/db/queries/sql/articles.sql:78-85` persist the supplied slug; neither generates its separator. Existing stored hyphenated slugs and links make migration or compatibility plausible, but the requirement specifies neither. Keep the repository retrieval-only and SQL retrieval/potential. **Missing confirmed labels:** no additional file; the collision test is in an already labeled file. **Ambiguity:** policy for existing slugs and link compatibility. **New tests:** create and title-update yield underscores; duplicate collision under the new separator; old-slug handling only after product policy is specified.

### 3. `api_default_page_size`

**Requirement:** Raise the default API page size for article lists and user feeds from 20 to 30, while preserving explicit limits.

**Existing behavior:** The shared constant is 20. The list dependency and feed endpoint use it as their `Query` default. The list route passes the resolved limit to the repository; the feed route also passes its resolved limit.

| Existing label | Decision and source-based reason |
| --- | --- |
| Direct `app/models/schemas/articles.py:8` | **KEEP.** `DEFAULT_ARTICLES_LIMIT = 20` is the shared API default; `ArticlesFilters.limit` also references it at line 42. |
| Indirect `app/api/dependencies/articles.py:25` | **KEEP.** `get_articles_filters` uses the constant for an omitted list `limit`; explicit query values remain explicit. |
| Indirect `app/api/routes/articles/articles_common.py:28` | **KEEP.** The feed endpoint uses the same constant and passes the resolved value to `get_articles_for_user_feed` at lines 33-36. |

**Missing-label proposal P1 — indirect `app/api/routes/articles/articles_resource.py:30-42`.** `list_articles` depends on `get_articles_filters` at line 32 and passes `articles_filters.limit` to `filter_articles` at line 40. Its default-size response therefore changes. This is a distinct, source-backed downstream file, already labeled for other scenarios but absent from this scenario's retrieval list and impact. Add only after human review.

**Retrieval/potential:** `app/db/repositories/articles.py:107,218` declares separate default arguments of 20, but API callers pass a limit; an internal-default change needs a broader requirement. `tests/test_api/test_routes/test_articles.py:325-367` makes default and explicit feed requests, but only five followed-author articles are available, so it does not distinguish 20 from 30. Keep both retrieval-only; repository defaults remain potential. **Ambiguity:** whether non-API callers' defaults should change. **New tests:** create more than 30 visible articles; check omitted limit returns 30 for list and feed, explicit 20 remains 20, and offsets remain stable.

### 4. `access_token_ttl`

**Requirement:** Shorten issued JWT access tokens from one week to 24 hours.

**Existing behavior:** `ACCESS_TOKEN_EXPIRE_MINUTES` is `60 * 24 * 7`; `create_access_token_for_user` uses it to set `exp` via `create_jwt_token`. The decoder validates token claims when protected requests resolve a user.

| Existing label | Decision and source-based reason |
| --- | --- |
| Direct `app/services/jwt.py:12,27-31` | **KEEP.** The constant sets the expiration delta for all newly issued access tokens. |
| Indirect `app/api/routes/authentication.py:41,81` | **KEEP.** Login and registration both return a token issued through the helper, so the returned expiry changes. |
| Indirect `app/api/routes/users.py:23,61` | **KEEP.** Current-user and update responses likewise issue tokens through the helper. |

**Missing-label proposal P2 — indirect `app/api/dependencies/authentication.py:78-91`.** `_get_current_user` calls `jwt.get_username_from_token`; `app/services/jwt.py:35-39` decodes and rejects expired JWTs. Protected requests made with newly issued tokens between 24 hours and one week therefore change from accepted to rejected. The dependency need not be edited, but its behavior depends on the new expiry. Add only after human review.

**Retrieval/potential:** `tests/test_services/test_jwt.py:26-30` checks the decoded username, not the expiry, so it is retrieval-only and a site for a *new* assertion, not an existing changed regression test. **Ambiguity:** the requirement addresses newly issued tokens; it does not say to revoke or rewrite previously issued one-week tokens. **New tests:** inspect `exp` near issuance at the 24-hour boundary; check protected access just before and after expiry, using a controlled clock; preserve unrelated malformed-token behavior.

### 5. `authorization_prefix`

**Requirement:** Replace the configured protected-request Authorization prefix `Token` with `Bearer`.

**Existing behavior:** `AppSettings.jwt_token_prefix` defaults to `Token`. The required header parser splits the header and compares its prefix with that setting; optional authorization delegates to the same parser when a header exists.

| Existing label | Decision and source-based reason |
| --- | --- |
| Direct `app/core/settings/app.py:29` | **KEEP.** This is the configured prefix named in the requirement. |
| Indirect `app/api/dependencies/authentication.py:46-73` | **KEEP.** The comparison at line 57 changes which prefixes are accepted through the new setting, including optional-header requests, without requiring an edit to the comparison. |

**Retrieval/potential:** `tests/test_api/test_routes/test_authentication.py:12-19` rejects `WrongPrefix`, which remains wrong; `tests/conftest.py:49-55` reads the configured prefix, so its authorized-client setup follows the setting. The existing test file is potential only as a location for added Bearer/Token tests. **Missing confirmed labels:** none. **Ambiguity:** simultaneous support for old `Token` and new `Bearer` would make the parser an edit target, but “replace” does not request dual-prefix compatibility. **New tests:** valid `Bearer`, rejected `Token`, rejected malformed prefix, and optional-auth behavior when a header is supplied.

### 6. `article_author_comment_delete`

**Requirement:** Permit an article author to delete a comment on that article even when another user wrote the comment.

**Existing behavior:** The permission predicate compares only the comment author's username with the requester. The delete permission dependency has the comment and user, but its comment lookup already receives the article by slug. The route is guarded by this dependency. The existing 403 test uses a requester who authored the article and a different comment author.

| Existing label | Decision and source-based reason |
| --- | --- |
| Direct `app/services/comments.py:5-6` | **KEEP.** The predicate must permit the article author as well as the comment author; it currently knows only the latter. |
| Direct `app/api/dependencies/comments.py:16-43` | **KEEP.** The permission dependency calls the predicate at line 43 without passing article-owner context. `get_comment_by_id_from_path` already obtains the article at line 18, so the dependency layer is the likely context-wiring edit. |
| Indirect `app/api/routes/comments.py:60-71` | **KEEP.** The DELETE route uses that permission dependency at line 64; authorized behavior changes while the route's deletion call can stay as written. |
| Indirect `tests/test_api/test_routes/test_comments.py:61-82` | **KEEP.** This test expects 403 when `authorized_client` acts as the article author and another user wrote the comment; the new rule changes that expectation. `tests/conftest.py:67-76,79-90` establishes article ownership and client identity. |

**Retrieval/potential:** `app/db/repositories/comments.py:80-85` passes `comment.author.username`, not the requesting user's username, to deletion; `app/db/queries/sql/comments.sql:36-40` uses that stored comment author in the DELETE condition. Thus authorization can change before deletion without a repository or SQL edit. `tests/conftest.py` is useful setup context. **Missing confirmed labels:** none. **Ambiguity:** exact function signature for bringing article-owner context to the predicate. **New tests:** article author deleting another user's comment succeeds; comment author still succeeds; a third user remains forbidden; deletion is limited to the article identified by the path.

### 7. `comment_body_blank`

**Requirement:** Reject blank or whitespace-only comment bodies at the comment creation API boundary.

**Existing behavior:** `CommentInCreate.body` is an unrestricted string, and the create endpoint passes it to the repository.

| Existing label | Decision and source-based reason |
| --- | --- |
| Direct `app/models/schemas/comments.py:15-16` | **KEEP.** Request-body validation belongs in this API input schema. |
| Indirect `app/api/routes/comments.py:40-57` | **KEEP.** The POST endpoint consumes that schema at line 47 before calling the repository at lines 52-55; accepted inputs change. |

**Retrieval/potential:** `app/db/repositories/comments.py:61-73` persists the supplied body; `app/models/domain/comments.py:6-8` stores a plain string. Neither needs a confirmed edit for an API-only rule; the domain is potential if all internal comments later need the invariant. `tests/test_api/test_routes/test_comments.py:15-23` uses a nonblank body, so it is retrieval-only. **Missing confirmed labels:** none. **Ambiguity:** no broader domain or repository rule is specified. **New tests:** empty string, spaces/tabs/newlines, and a nonblank body; verify rejected requests do not insert a comment.

### 8. `favorite_post_idempotency`

**Requirement:** Repeated favorite POST on an already-favorited article returns the unchanged article with HTTP 200 instead of HTTP 400.

**Existing behavior:** The route returns an incremented article for a first POST and raises 400 on a duplicate. The persistence query already tolerates duplicate inserts. A parameterized test expects 400 for repeated POST and DELETE.

| Existing label | Decision and source-based reason |
| --- | --- |
| Direct `app/api/routes/articles/articles_common.py:47-74` | **KEEP.** The duplicate POST branch at lines 71-73 must return the unchanged article rather than raise. The DELETE branch at lines 77-103 is outside this requirement. |
| Indirect `tests/test_api/test_routes/test_articles.py:215-243` | **KEEP.** The test's POST parameter at line 218 currently expects 400 at line 243; that expectation changes. The DELETE parameter at line 219 should continue to expect 400. |

**Retrieval/potential:** `app/db/queries/sql/articles.sql:1-5` already has `ON CONFLICT DO NOTHING`; `app/db/repositories/articles.py:275-280` invokes that query. Both are retrieval-only because the route rejects a repeated POST before insertion. **Missing confirmed labels:** none. **Ambiguity:** none for the specified POST; DELETE behavior is explicitly out of scope. **New tests:** repeat POST yields 200, identical article fields and favorite count, no duplicate persistence; repeated DELETE still yields 400.

### 9. `profile_bio_length`

**Requirement:** Reject current-user profile update API requests when bio exceeds 160 characters.

**Existing behavior:** `UserInUpdate.bio` is `Optional[str]` with no maximum, and the update route accepts it before persistence.

| Existing label | Decision and source-based reason |
| --- | --- |
| Direct `app/models/schemas/users.py:18-23` | **KEEP.** The `bio` field at line 22 is the API request validation target. |
| Indirect `app/api/routes/users.py:38-59` | **KEEP.** The current-user PUT consumes that schema at line 40 and forwards its values to `update_user` at line 59, so request acceptance changes. |

**Retrieval/potential:** `app/models/domain/users.py:8-12` has an unrestricted domain bio; `app/db/repositories/users.py:50-69` accepts and stores bio. Neither is a confirmed edit for API-only validation. The domain is potential if internal records must share the limit. `tests/test_api/test_routes/test_users.py:64-85` uses a short bio and lacks the boundary assertion; retrieval-only. **Missing confirmed labels:** none. **Ambiguity:** whether a system-wide bio invariant is intended. **New tests:** exactly 160 and 161 characters, unchanged stored bio after rejection, and an update without bio.

### 10. `invoice_rounding_negative`

**Requirement:** Change billing-report invoice-total rounding to banker's rounding.

**Existing behavior and decision:** There are **no direct or indirect labels to decide**. `app/api/routes/api.py:3-16` registers authentication, users, profiles, articles, comments and tags, with no billing route. The snapshot manifest covers the complete selected `app/` and `tests/` trees; inspection of that inventory and text search found no billing, invoice or report implementation in the selected source. Keep retrieval, impact and potential sets empty. This conclusion is limited to the **selected snapshot**, not every file in the upstream repository or a future version. **Missing confirmed labels:** none. **New test:** retain a dataset-integrity check of the negative case and its scoped inventory evidence; no application regression test can be identified from this source.

## Proposed additions and unresolved decisions

| Proposal | Classification | Source evidence | Human decision needed |
| --- | --- | --- | --- |
| P1 `api_default_page_size` → `app/api/routes/articles/articles_resource.py` | Indirect | `:30-42`: list endpoint depends on `get_articles_filters` and forwards its `limit`. | Decide whether downstream API endpoint files should be enumerated consistently with the existing feed label. |
| P2 `access_token_ttl` → `app/api/dependencies/authentication.py` | Indirect | `:78-91`: current-user dependency decodes JWT via `app/services/jwt.py:35-39`, which enforces expiry. | Decide whether protected-request acceptance is within this issuance scenario's indirect scope. |

Both proposals are **source-supported downstream behavior**, not proposed implementation edits. The candidate fixture does not yet list either path in the corresponding scenario's `retrieval_relevant` set, so a future approved fixture version would need matching retrieval/context evidence and annotations. Do not insert these into v1 in place. No existing impact label is proposed for removal or type change. Other unresolved product choices are: domain-wide versus API-only title/comment/bio limits; existing-slug migration and link compatibility; repository defaults for non-API callers; dual auth prefixes; behavior of previously issued JWTs; and the exact article-owner context wiring. These choices should be resolved only if their requirements are expanded, not inferred from model predictions.

## Integrity checks and limits

- The candidate fixture contains **10 unique scenario IDs**, **10 direct** and **13 indirect** file labels, with one source annotation per existing impact label. The dataset integrity tests found no duplicate labels, missing or cross-repository paths, invalid line numbers, or retrieval/impact mismatches.
- `services/api/tests/test_holdout_dataset.py`: **2 passed** with Python 3.13.13, `META_AI_PROVIDER=offline_demo`, `PYTHONDONTWRITEBYTECODE=1`, pytest cache disabled. The tests verify all 103 local file hashes and the manifest tree digest as well as the scenario assertions.
- The local upstream clone's `HEAD` was the pinned commit `029eb7781c60d5f563ee8990a0cbfb79b244538c`; **all 103 manifest hashes matched the corresponding Git blobs** at that commit. The snapshot is an exact selected subtree, not a full checkout.
- The negative-case conclusion is limited to the selected subtree. Static source review does not prove runtime behavior of the upstream application or establish benchmark accuracy. No paid inference, model evaluation, production edit, fixture edit, source-snapshot edit, commit or push was performed.

**Technical readiness:** The 23 existing labels are supported, and the two additional indirect proposals are ready for human adjudication. The fixture is **not yet ready to freeze as human-approved gold** until a human checks the decisions, resolves P1/P2, and records sign-off in a separate decision record. If either proposal is accepted, create a new versioned fixture; preserve v1 unchanged.

AI-assisted source review completed. Independent human sign-off remains pending.
