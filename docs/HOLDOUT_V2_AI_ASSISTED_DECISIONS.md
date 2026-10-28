# FastAPI RealWorld holdout v2: AI-assisted source decisions

**Recorded:** 2026-10-28 (Asia/Bangkok)

**Reviewer:** Codex, AI-assisted technical source review. **This is not an independent human sign-off.** The separate [human form](HOLDOUT_HUMAN_SIGNOFF_V2.md) remains blank. No model predictions or provisional evaluation scores were used as ground-truth evidence.

**Project-owner disposition (2026-10-29, project chat):** The owner asked Codex to decide the labels, then accepted this AI-assisted decision and directed the team to close the current workstream to move to a new feature. This is approval to use the **provisional technical package for planning and handoff**. The owner did not state that they personally inspected every source reference, so this is **not independent human source sign-off**, does not freeze v2, and does not turn offline scores into a final benchmark.

## Decision and provenance

**Decision: KEEP all 25 v2 impact labels; CHANGE 0; REMOVE 0; no additional confirmed file labels.** This accepts the two indirect relationships proposed in the [earlier source investigation](HOLDOUT_CODEX_SOURCE_REVIEW.md) as AI-assisted candidate labels. The 10-case fixture remains **10 direct + 15 indirect = 25**. The no-impact case retains empty labels for the selected source snapshot. Retrieval-only and potential entries remain unchanged. No dataset or source file was edited for this decision.

| Item | Pinned value |
| --- | --- |
| Candidate | `services/api/tests/evaluation/holdout_realworld_cases_v2.json`; `2026-10-28-realworld-holdout-v2-candidate`; SHA-256 `af39df5af8ae431b74952efbe5921317347e54b53fadc885477a0289cb5cde6e` |
| Selected source | `examples/holdout-fastapi-realworld/`: upstream `LICENSE` plus complete `app/` and `tests/` subtrees, 103 files; upstream commit `029eb7781c60d5f563ee8990a0cbfb79b244538c` |
| Source manifest | `services/api/tests/evaluation/holdout_realworld_snapshot_v1.json`; tree SHA-256 `f112558f9f09dd0bb426e33e2c628851fe6561ba1365487c7336098f463ab51b` |
| Policy | Direct = likely implementation edit; indirect = dependent behavior or an existing test exercising that behavior; retrieval-only = useful context; potential = design-dependent, not confirmed. |

Every path:line below is relative to the selected source root. I checked the annotated line and relevant caller, dependency or test context; the lines are evidence pointers, not mandatory future edit locations.

## Decisions for every impact label

| # | Scenario | Type | Decision and source | Technical reason |
| ---: | --- | --- | --- | --- |
| 1 | `article_title_length` | Direct | **KEEP** `app/models/schemas/articles.py:21,28` | Create and update request title fields are unrestricted strings; the 120-character API boundary belongs in these schemas. |
| 2 | `article_title_length` | Indirect | **KEEP** `app/api/routes/articles/articles_resource.py:60,96` | Create and update consume those request schemas, so accepted API requests change. |
| 3 | `article_slug_separator` | Direct | **KEEP** `app/services/articles.py:18-19` | The shared slug helper calls `slugify(title)` without an underscore separator. |
| 4 | `article_slug_separator` | Indirect | **KEEP** `app/api/routes/articles/articles_resource.py:64,100` | Both article creation and title update call the helper and return/store its slug. |
| 5 | `article_slug_separator` | Indirect | **KEEP** `tests/test_api/test_routes/test_articles.py:18-29,94` | The update test explicitly expects `new-title`. The duplicate-slug test seeds `test-slug` (`tests/conftest.py:67-76`); an underscore-generated `test_slug` would no longer collide with it. This is one file label covering both existing tests. |
| 6 | `api_default_page_size` | Direct | **KEEP** `app/models/schemas/articles.py:8,42` | `DEFAULT_ARTICLES_LIMIT = 20` is the shared API default, also used by `ArticlesFilters`. |
| 7 | `api_default_page_size` | Indirect | **KEEP** `app/api/dependencies/articles.py:21-33` | `get_articles_filters` uses that constant only when the list query omits `limit`. |
| 8 | `api_default_page_size` | Indirect | **KEEP** `app/api/routes/articles/articles_common.py:27-36` | The feed route uses the constant for its omitted `limit` and passes the resolved value to the repository. |
| 9 | `api_default_page_size` | Indirect | **KEEP** `app/api/routes/articles/articles_resource.py:30-42` | **V2 addition.** The list route depends on `get_articles_filters` at line 32 and forwards `articles_filters.limit` at line 40; its default-size response changes. |
| 10 | `access_token_ttl` | Direct | **KEEP** `app/services/jwt.py:12,27-31` | The one-week constant is passed as the access-token expiry delta; changing it is the likely implementation edit. |
| 11 | `access_token_ttl` | Indirect | **KEEP** `app/api/routes/authentication.py:41,81` | Login and registration issue access tokens through the helper; returned tokens have the new expiry. |
| 12 | `access_token_ttl` | Indirect | **KEEP** `app/api/routes/users.py:23,61` | Current-user and profile-update responses issue tokens through the same helper. |
| 13 | `access_token_ttl` | Indirect | **KEEP** `app/api/dependencies/authentication.py:78-91` | **V2 addition.** Protected requests decode tokens at lines 84-87; `app/services/jwt.py:35-39` rejects expired JWTs. Newly issued tokens stop authorizing requests at 24 hours. This dependent behavior need not require editing the dependency. |
| 14 | `authorization_prefix` | Direct | **KEEP** `app/core/settings/app.py:29` | The configured prefix is exactly `Token`; the requirement says replace it with `Bearer`. |
| 15 | `authorization_prefix` | Indirect | **KEEP** `app/api/dependencies/authentication.py:46-73` | Header parsing compares the supplied prefix to the setting at line 57; accepted protected headers change. Optional headers delegate to the same check. |
| 16 | `article_author_comment_delete` | Direct | **KEEP** `app/services/comments.py:5-6` | The predicate currently permits only the comment author; the new article-author rule changes this permission decision. |
| 17 | `article_author_comment_delete` | Direct | **KEEP** `app/api/dependencies/comments.py:16-43` | The permission dependency calls that predicate without article-owner context, while the comment lookup already receives the article at line 18. |
| 18 | `article_author_comment_delete` | Indirect | **KEEP** `app/api/routes/comments.py:60-71` | The DELETE route is guarded by the permission dependency at line 64; its allowed requests change. |
| 19 | `article_author_comment_delete` | Indirect | **KEEP** `tests/test_api/test_routes/test_comments.py:61-82` | The existing test expects 403 for the requesting article author deleting another user's comment. The fixture establishes article ownership at `tests/conftest.py:67-90`; this expectation changes. |
| 20 | `comment_body_blank` | Direct | **KEEP** `app/models/schemas/comments.py:15-16` | `CommentInCreate.body` is a plain string; blank/whitespace-only rejection is an API-input rule. |
| 21 | `comment_body_blank` | Indirect | **KEEP** `app/api/routes/comments.py:40-57` | The comment POST consumes that schema before repository insertion, changing accepted requests. |
| 22 | `favorite_post_idempotency` | Direct | **KEEP** `app/api/routes/articles/articles_common.py:47-74` | The duplicate POST branch raises HTTP 400 at lines 71-73; it must return the unchanged article with 200. |
| 23 | `favorite_post_idempotency` | Indirect | **KEEP** `tests/test_api/test_routes/test_articles.py:215-243` | The parameterized test expects 400 for repeat POST and DELETE. Only its POST expectation changes; DELETE remains 400. |
| 24 | `profile_bio_length` | Direct | **KEEP** `app/models/schemas/users.py:18-23` | `UserInUpdate.bio` is an unrestricted optional string; the 160-character API update rule belongs here. |
| 25 | `profile_bio_length` | Indirect | **KEEP** `app/api/routes/users.py:38-59` | The current-user PUT consumes `UserInUpdate` and passes accepted data to persistence; input acceptance changes. |

## Retrieval-only, potential, tests and negative case

- **API-only boundaries:** `app/models/domain/articles.py:10`, `app/models/domain/comments.py:7` and `app/models/domain/users.py:11` remain retrieval/potential context for title, comment body and bio limits. Internal model enforcement was not requested. The nearby happy-path tests in `tests/test_api/test_routes/test_articles.py:32-44`, `tests/test_api/test_routes/test_comments.py:15-23` and `tests/test_api/test_routes/test_users.py:64-85` do not assert the new boundaries; recommend new 120/121-title, blank/whitespace-comment and 160/161-bio tests instead of promoting those existing tests.
- **Slug persistence:** `app/db/repositories/articles.py:75,81-86` and `app/db/queries/sql/articles.sql:78-85` store the supplied slug; they do not choose the separator. Existing hyphenated slugs and inbound links may need migration or compatibility, but that design is unspecified. Keep SQL potential and repository retrieval-only. Add create/update underscore and same-separator collision tests.
- **Pagination:** `app/db/repositories/articles.py:107,218` has separate internal defaults of 20. Both API callers pass an explicit resolved `limit`, so repository defaults remain retrieval/potential for a broader non-API request. The existing feed test creates only five followed-author articles (`tests/test_api/test_routes/test_articles.py:325-367`) and cannot distinguish 20 from 30. Add >30-item list/feed tests for omitted and explicit limits.
- **JWT and Authorization:** `tests/test_services/test_jwt.py:26-30` asserts the decoded username but not expiry; add a controlled-clock 24-hour boundary test. `tests/test_api/test_routes/test_authentication.py:12-19` rejects `WrongPrefix`, which stays invalid, while `tests/conftest.py:49-55` reads the configured prefix. Add valid `Bearer` and rejected `Token` tests. A dual-prefix transition would make the header parser a direct edit target, but it is not requested. Previously issued one-week tokens are not explicitly revoked by the issuance requirement.
- **Comment deletion:** `app/db/repositories/comments.py:80-85` passes the stored comment author's username to deletion SQL, and `app/db/queries/sql/comments.sql:36-40` filters by that author. The new permission can be decided before this call; no repository/SQL edit is established. Add article-author, comment-author and unauthorized-third-user tests. The precise permission-helper signature remains a design choice.
- **Favorite POST:** `app/db/queries/sql/articles.sql:1-5` already uses `ON CONFLICT DO NOTHING`; the duplicate is currently rejected in the route before persistence. Keep query and repository retrieval-only. Test 200 with unchanged favorite count on repeated POST while retaining 400 for repeated DELETE.
- **Negative `invoice_rounding_negative`:** **KEEP empty direct, indirect and retrieval labels** for this selected snapshot. `app/api/routes/api.py:3-16` registers no billing route, and the complete selected `app/` and `tests/` inventory contains no billing/invoice/report component. This says nothing about unselected upstream files or future versions.

## Integrity and lifecycle

`services/api/tests/test_holdout_dataset.py` passed **3/3** on 2026-10-28 with Python 3.13.13. It checks the unchanged v1 SHA, exact two-label v2 delta, 10 unique scenarios, 10 direct and 15 indirect labels, distinct and in-tree paths, valid annotation lines, all 103 source-file hashes and tree digest. A check of this decision table found **25/25** rows matching v2, with valid source-line ranges. The full backend suite passed **111 tests, 1 opt-in live-smoke skipped**. The saved provisional artifact replayed exactly across 10 cases with no inference. The offline evaluation is documented in [HOLDOUT_EVALUATION_REPORT.md](HOLDOUT_EVALUATION_REPORT.md); its predictions did **not** determine these source decisions.

**Technical disposition:** Accept all 25 as an **AI-assisted reviewed candidate** and close this technical preparation workstream under the owner's disposition above. The dataset is **not frozen and has no independent human source sign-off**. If a final independently verified benchmark is later needed, a human reviewer must record identity, date, all 25 decisions, disagreement resolution and explicit approval on [HOLDOUT_HUMAN_SIGNOFF_V2.md](HOLDOUT_HUMAN_SIGNOFF_V2.md) or an equivalent signed record. Only then create a new immutable frozen fixture, retaining v1 and v2 candidates.
