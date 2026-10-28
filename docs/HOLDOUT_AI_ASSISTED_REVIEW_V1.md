# SG-AI-09B — FastAPI RealWorld holdout v1 AI-assisted source review decisions

**Review recorded:** 2026-10-28 (Asia/Bangkok)
**Status:** All supplied KEEP decisions recorded; **independent human sign-off pending**. This is an AI-assisted source review of the pinned repository, not a claim that a second human independently verified the labels. The project owner's decision summary supplied the KEEP/CHANGE/REMOVE outcome; this record cross-checks its cited paths and lines against the selected source snapshot. No model prediction or evaluation score was used to decide labels.

**Owner disposition (2026-10-28, project chat):** The owner approved this AI-assisted proposal but explicitly stated they had **not** independently checked all 23 labels against source. This is an acknowledgement of the proposal only. The candidate labels, human sign-off gate, and holdout evaluation status remain unchanged.

## Reviewed inputs and decision

| Item | Value |
| --- | --- |
| Candidate fixture | [`holdout_realworld_cases_v1.json`](../services/api/tests/evaluation/holdout_realworld_cases_v1.json), version `2026-10-28-realworld-holdout-v1-candidate` |
| Fixture SHA-256 | `5892974d49b89a735104d6857aacc4314599d2a3eec544bcc76d4599a00f5615` |
| Selected source | [`examples/holdout-fastapi-realworld/`](../examples/holdout-fastapi-realworld/), upstream `nsidnev/fastapi-realworld-example-app` commit `029eb7781c60d5f563ee8990a0cbfb79b244538c` |
| Snapshot manifest | [`holdout_realworld_snapshot_v1.json`](../services/api/tests/evaluation/holdout_realworld_snapshot_v1.json), tree SHA-256 `f112558f9f09dd0bb426e33e2c628851fe6561ba1365487c7336098f463ab51b` |
| Selected snapshot scope | 103 files: exact upstream `LICENSE` plus complete `app/` and `tests/` trees; 95 Python files. This is not a full upstream checkout. |
| Decisions | 10 scenarios reviewed; **KEEP 23** existing impact labels (**10 direct, 13 indirect**); **CHANGE 0, REMOVE 0**, no additional confirmed impact labels. |
| Context decisions | Preserve every existing `retrieval_relevant` path (42 case/path entries) and `potential_impacts` entry (7 case/path entries). No promotion from context or potential to gold. |
| Dataset lifecycle | Candidate fixture preserved byte-for-byte, with `review_status` still indicating human review pending; **not frozen**. |

Policy: `direct` is a likely implementation edit target; `indirect` is dependent behavior or an existing regression test that exercises the affected behavior; `retrieval_relevant` is useful context without confirmed impact; `potential_impacts` records a plausible, design-dependent relationship. A source reference confirms where the current behavior lives; it does not prescribe a future implementation beyond the requirement as written. The path:line references below are relative to the selected snapshot root.

## Per-label decisions

Each row is an existing fixture impact label. All decisions are **KEEP**. The cited source locations and reasons were checked against the selected source files; the original fixture annotations remain unchanged.

| # | Scenario | Type | KEEP label and source reference | Rationale |
| ---: | --- | --- | --- | --- |
| 1 | `article_title_length` | Direct | `app/models/schemas/articles.py:21` | `ArticleInCreate.title` is unrestricted; `ArticleInUpdate.title` at line 28 also accepts an unrestricted string. API request validation belongs in these schemas. |
| 2 | `article_title_length` | Indirect | `app/api/routes/articles/articles_resource.py:60` | The create endpoint consumes `ArticleInCreate`; the update endpoint at line 96 consumes `ArticleInUpdate`, so request acceptance changes. |
| 3 | `article_slug_separator` | Direct | `app/services/articles.py:18-19` | `get_slug_for_article` calls `slugify(title)` without a separator override; this is the shared generation target. |
| 4 | `article_slug_separator` | Indirect | `app/api/routes/articles/articles_resource.py:64` | Create uses the slug helper here; title update uses it again at line 100, changing both route outputs. |
| 5 | `article_slug_separator` | Indirect | `tests/test_api/test_routes/test_articles.py:94` | The title-update test expects `new-title`; the requested separator changes that expectation. |
| 6 | `api_default_page_size` | Direct | `app/models/schemas/articles.py:8` | `DEFAULT_ARTICLES_LIMIT = 20` supplies the shared API default to raise to 30. |
| 7 | `api_default_page_size` | Indirect | `app/api/dependencies/articles.py:25` | The article list query parameter reads the shared default; requests omitting `limit` change, explicit limits do not. |
| 8 | `api_default_page_size` | Indirect | `app/api/routes/articles/articles_common.py:28` | The feed query parameter reads the same constant and has the same default-only behavior change. |
| 9 | `access_token_ttl` | Direct | `app/services/jwt.py:12` | Issued access-token lifetime is one week here and is passed into token creation at line 31. |
| 10 | `access_token_ttl` | Indirect | `app/api/routes/authentication.py:41` | Login issues an access token through that helper; registration also does so at line 81. Returned token lifetimes change. |
| 11 | `access_token_ttl` | Indirect | `app/api/routes/users.py:23` | Current-user response issues an access token through the helper; the update response at line 61 does likewise. |
| 12 | `authorization_prefix` | Direct | `app/core/settings/app.py:29` | `jwt_token_prefix` is configured as `Token`; replacing the configured value is the specified edit. |
| 13 | `authorization_prefix` | Indirect | `app/api/dependencies/authentication.py:57` | Protected-request authorization compares the supplied prefix with this setting, so accepted headers change without necessarily editing this comparison. |
| 14 | `article_author_comment_delete` | Direct | `app/services/comments.py:5-6` | The permission predicate currently allows only the comment author; it needs article-author context for the new rule. |
| 15 | `article_author_comment_delete` | Direct | `app/api/dependencies/comments.py:39-43` | The delete permission dependency calls that predicate without article-owner context and raises 403 for disallowed users. |
| 16 | `article_author_comment_delete` | Indirect | `app/api/routes/comments.py:64` | The delete endpoint is guarded by the dependency; its authorized behavior changes although its route body need not be edited. |
| 17 | `article_author_comment_delete` | Indirect | `tests/test_api/test_routes/test_comments.py:61-82` | The existing test expects 403 when the requester is the article author but another user wrote the comment. That expectation changes. |
| 18 | `comment_body_blank` | Direct | `app/models/schemas/comments.py:15-16` | `CommentInCreate.body` is an unrestricted string; blank/whitespace rejection belongs at the specified API request boundary. |
| 19 | `comment_body_blank` | Indirect | `app/api/routes/comments.py:47` | The create endpoint consumes that schema before repository insertion, so request acceptance changes. |
| 20 | `favorite_post_idempotency` | Direct | `app/api/routes/articles/articles_common.py:71-73` | Repeated favorite POST currently raises 400; this route must return the unchanged article with HTTP 200. |
| 21 | `favorite_post_idempotency` | Indirect | `tests/test_api/test_routes/test_articles.py:215-243` | The parameterized test expects 400 for repeated POST and DELETE; **only the POST branch** changes under this requirement. |
| 22 | `profile_bio_length` | Direct | `app/models/schemas/users.py:22` | `UserInUpdate.bio` is an optional unrestricted string; the 160-character API input limit belongs in this request schema. |
| 23 | `profile_bio_length` | Indirect | `app/api/routes/users.py:40` | The current-user update endpoint consumes `UserInUpdate` before persisting the bio, so overlong request acceptance changes. |

`invoice_rounding_negative` has **zero** impact labels, hence no KEEP row. The selected API router inventory at `app/api/routes/api.py:3-16` registers authentication, users, profiles, articles, comments, and tags. The manifest's complete selected `app/` and `tests/` trees contain no billing/invoice/report component. Keep the empty label set **only for this selected snapshot**, not for unspecified upstream files or future versions.

## Scope notes retained with the decision

1. **`article_title_length`** is API-scoped. The domain field at `app/models/domain/articles.py:10` remains retrieval-relevant and potential; no domain edit is confirmed.
2. **`article_slug_separator`** specifies generation of new slugs, not migration or lookup compatibility for existing hyphenated slugs. `app/db/repositories/articles.py:75` and `app/db/queries/sql/articles.sql:80` remain retrieval/potential context. The existing duplicate-slug test at `tests/test_api/test_routes/test_articles.py:18-29` expects HTTP 400; a separator change **may** alter collision behavior for titles that previously mapped to the same slug. This is a review/check recommendation, not an additional confirmed label.
3. **`api_default_page_size`** is API-scoped. Repository method defaults at `app/db/repositories/articles.py:107` and line 218 remain outside confirmed impact because the API callers pass `limit` explicitly.
4. **`authorization_prefix`** leaves the header comparison indirect. If a later requirement asks for simultaneous `Token` and `Bearer` support, `app/api/dependencies/authentication.py:57` may become a direct edit target. Existing wrong-prefix test at `tests/test_api/test_routes/test_authentication.py:12` does not establish valid Bearer coverage; a new transition test should be recommended.
5. **`article_author_comment_delete`** keeps exactly two direct and two indirect labels. `app/db/repositories/comments.py:80-85` passes `comment.author.username` to deletion SQL, and `app/db/queries/sql/comments.sql:36-40` filters by that stored comment author. The new permission decision occurs before deletion; no repository/SQL edit follows from this requirement. Article context is available through `app/api/dependencies/comments.py:16-30`. `tests/conftest.py:67-76,85-90` establishes the requester's article ownership in the existing 403 test.
6. **`favorite_post_idempotency`** changes repeated POST only. The test's DELETE parameter at `tests/test_api/test_routes/test_articles.py:219` and its expected 400 remain unchanged. `app/db/queries/sql/articles.sql:1-5` already uses `ON CONFLICT DO NOTHING`, so duplicate persistence is retrieval context, not an additional SQL label.
7. **Boundary tests needed:** `tests/test_services/test_jwt.py:26-30` asserts a username but not 24-hour expiry; `tests/test_api/test_routes/test_comments.py:15` creates a nonblank comment; `tests/test_api/test_routes/test_users.py:65-85` updates a short bio. Keep these files retrieval-relevant, and recommend new tests for the requested expiry, whitespace, and 160-character boundaries. Their current assertions do not become confirmed impact labels.
8. **`invoice_rounding_negative`** remains a no-impact case for the pinned selected snapshot only.

All `retrieval_relevant`, `context_annotations`, `potential_impacts`, ambiguity, and negative-evidence entries in the candidate fixture are retained exactly. No new confirmed labels are added from the notes above.

## Integrity verification and remaining gate

- `services/api/tests/test_holdout_dataset.py`: **2 passed** on 2026-10-28 with Python 3.13.13, `META_AI_PROVIDER=offline_demo`, no model inference. The tests verify 103 exact file hashes and the aggregate tree digest, 10 distinct scenarios, source-path containment, valid annotation lines, no duplicate or cross-type labels, context separation, and 10 direct + 13 indirect annotations.
- The first integrity run produced **1 failed, 1 passed** because an earlier Git stash/apply converted 79 snapshot files from LF to CRLF. Every mismatched file matched the pinned manifest after CRLF normalization. The local upstream clone's exact 103 blobs matched the manifest; those 79 files were restored byte-for-byte from commit `029eb7781c60d5f563ee8990a0cbfb79b244538c`. A second run passed **2/2**. This repair changed line endings back to the pinned source bytes, not source semantics or fixture labels.
- The candidate fixture SHA-256 remained `5892974d49b89a735104d6857aacc4314599d2a3eec544bcc76d4599a00f5615`. No holdout inference, retrieval tuning, production-code edit, or gold-label edit was performed.

**Human gate:** A named independent human reviewer must still check and sign off on these 23 KEEP decisions, the 10 case scopes, and the context/potential classifications. Only then may the team mark the dataset frozen, recording reviewer, date, final fixture hash, and any separately versioned changes. This AI-assisted decision record is not that sign-off.
