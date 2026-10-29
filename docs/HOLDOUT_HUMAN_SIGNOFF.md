# SG-AI-09B — independent human holdout label sign-off

> **Historical v1 form for 23 labels.** The current [v2 candidate](../services/api/tests/evaluation/holdout_realworld_cases_v2.json) has 25 provisional labels. Use the blank [v2 human sign-off form](HOLDOUT_HUMAN_SIGNOFF_V2.md) for the current review. No human sign-off has been recorded for either version.

**Status: PENDING INDEPENDENT HUMAN REVIEW.** This form has no reviewer, decisions, or approval recorded. The separate [AI-assisted source review](HOLDOUT_AI_ASSISTED_REVIEW_V1.md) examined all 23 existing impact labels and recommended KEEP 23, CHANGE 0, REMOVE 0. That record is preparation for a human review, not a human sign-off.

The project owner acknowledged the AI-assisted proposal in chat on 2026-10-28 and clarified that they have **not** independently checked the 23 labels against source. This acknowledgement does not fill any human decision field below.

## Material to review

| Item | Pinned value |
| --- | --- |
| Candidate fixture | [holdout_realworld_cases_v1.json](../services/api/tests/evaluation/holdout_realworld_cases_v1.json), `2026-10-28-realworld-holdout-v1-candidate` |
| Candidate SHA-256 | `5892974d49b89a735104d6857aacc4314599d2a3eec544bcc76d4599a00f5615` |
| Source | FastAPI RealWorld, `nsidnev/fastapi-realworld-example-app`, commit `029eb7781c60d5f563ee8990a0cbfb79b244538c` |
| Selected snapshot | [examples/holdout-fastapi-realworld](../examples/holdout-fastapi-realworld): complete `app/` and `tests/` trees plus `LICENSE`, 103 files; it is a selected subtree, not the full upstream repository |
| Snapshot manifest | [holdout_realworld_snapshot_v1.json](../services/api/tests/evaluation/holdout_realworld_snapshot_v1.json), tree SHA-256 `f112558f9f09dd0bb426e33e2c628851fe6561ba1365487c7336098f463ab51b` |
| Proposed impact labels | 10 direct, 13 indirect, 23 total across 10 scenarios |

Paths and lines below are relative to the selected snapshot root. Each cited line is an evidence pointer, not a claim that the future edit must occur exactly on that line. Read the full requirement, annotation rationale, `retrieval_relevant`, `context_annotations`, `potential_impacts`, `ambiguities`, and `negative_evidence` in the candidate fixture. The [review queue](HOLDOUT_LABEL_REVIEW.md) explains the label policy.

## Scenario decisions

Write **KEEP**, **CHANGE**, or **REMOVE** for each proposed label in the fixture or the [23-row AI-assisted record](HOLDOUT_AI_ASSISTED_REVIEW_V1.md). For CHANGE or REMOVE, record the exact path, type, source line, and reason below; do not silently alter the candidate fixture.

| Scenario and requirement summary | Proposed direct evidence | Proposed indirect evidence | Human case decision |
| --- | --- | --- | --- |
| `article_title_length` — reject API titles over 120 characters | `app/models/schemas/articles.py:21` | `app/api/routes/articles/articles_resource.py:60` |  |
| `article_slug_separator` — generate underscore slugs on create/update | `app/services/articles.py:18` | `app/api/routes/articles/articles_resource.py:64`; `tests/test_api/test_routes/test_articles.py:94` |  |
| `api_default_page_size` — default article list/feed limit 30 | `app/models/schemas/articles.py:8` | `app/api/dependencies/articles.py:25`; `app/api/routes/articles/articles_common.py:28` |  |
| `access_token_ttl` — issue 24-hour JWT access tokens | `app/services/jwt.py:12` | `app/api/routes/authentication.py:41`; `app/api/routes/users.py:23` |  |
| `authorization_prefix` — replace `Token` with `Bearer` | `app/core/settings/app.py:29` | `app/api/dependencies/authentication.py:57` |  |
| `article_author_comment_delete` — article author may delete another user's comment | `app/services/comments.py:5`; `app/api/dependencies/comments.py:39` | `app/api/routes/comments.py:64`; `tests/test_api/test_routes/test_comments.py:61` |  |
| `comment_body_blank` — reject blank/whitespace comment body | `app/models/schemas/comments.py:15` | `app/api/routes/comments.py:47` |  |
| `favorite_post_idempotency` — repeated favorite POST returns 200 | `app/api/routes/articles/articles_common.py:71` | `tests/test_api/test_routes/test_articles.py:222` |  |
| `profile_bio_length` — reject update bio over 160 characters | `app/models/schemas/users.py:22` | `app/api/routes/users.py:40` |  |
| `invoice_rounding_negative` — billing invoice rounding request has no selected-tree target | None | None; `app/api/routes/api.py:7` inventories registered API areas, and the complete selected `app/` and `tests/` manifest contains no billing/invoice/report component |  |

Record one human decision per existing impact label. A CHANGE decision must specify the corrected path/type and source evidence; a REMOVE decision must explain why the proposed impact is unproved. KEEP still requires reading the cited source and requirement.

| # | Scenario | Proposed type | Proposed path:line | Human decision |
| ---: | --- | --- | --- | --- |
| 1 | `article_title_length` | Direct | `app/models/schemas/articles.py:21` |  |
| 2 | `article_title_length` | Indirect | `app/api/routes/articles/articles_resource.py:60` |  |
| 3 | `article_slug_separator` | Direct | `app/services/articles.py:18` |  |
| 4 | `article_slug_separator` | Indirect | `app/api/routes/articles/articles_resource.py:64` |  |
| 5 | `article_slug_separator` | Indirect | `tests/test_api/test_routes/test_articles.py:94` |  |
| 6 | `api_default_page_size` | Direct | `app/models/schemas/articles.py:8` |  |
| 7 | `api_default_page_size` | Indirect | `app/api/dependencies/articles.py:25` |  |
| 8 | `api_default_page_size` | Indirect | `app/api/routes/articles/articles_common.py:28` |  |
| 9 | `access_token_ttl` | Direct | `app/services/jwt.py:12` |  |
| 10 | `access_token_ttl` | Indirect | `app/api/routes/authentication.py:41` |  |
| 11 | `access_token_ttl` | Indirect | `app/api/routes/users.py:23` |  |
| 12 | `authorization_prefix` | Direct | `app/core/settings/app.py:29` |  |
| 13 | `authorization_prefix` | Indirect | `app/api/dependencies/authentication.py:57` |  |
| 14 | `article_author_comment_delete` | Direct | `app/services/comments.py:5` |  |
| 15 | `article_author_comment_delete` | Direct | `app/api/dependencies/comments.py:39` |  |
| 16 | `article_author_comment_delete` | Indirect | `app/api/routes/comments.py:64` |  |
| 17 | `article_author_comment_delete` | Indirect | `tests/test_api/test_routes/test_comments.py:61` |  |
| 18 | `comment_body_blank` | Direct | `app/models/schemas/comments.py:15` |  |
| 19 | `comment_body_blank` | Indirect | `app/api/routes/comments.py:47` |  |
| 20 | `favorite_post_idempotency` | Direct | `app/api/routes/articles/articles_common.py:71` |  |
| 21 | `favorite_post_idempotency` | Indirect | `tests/test_api/test_routes/test_articles.py:222` |  |
| 22 | `profile_bio_length` | Direct | `app/models/schemas/users.py:22` |  |
| 23 | `profile_bio_length` | Indirect | `app/api/routes/users.py:40` |  |

The candidate's 42 case/path retrieval-relevant entries and seven case/path potential entries remain separate from the 23 confirmed impact labels. A reviewer should decide whether each remains context-only or whether source evidence supports a label change. Do not promote model predictions to gold labels.

## Design questions to resolve or explicitly leave open

1. `article_title_length`: API request validation is in scope; whether the domain `Article.title` must also enforce the limit is unspecified.
2. `article_slug_separator`: the requirement does not ask to migrate old hyphenated slugs. Existing duplicate-slug behavior may change; inspect `tests/test_api/test_routes/test_articles.py:18-29`.
3. `api_default_page_size`: repository method defaults remain 20 for non-API callers; decide whether those callers are in scope.
4. `authorization_prefix`: a dual-prefix compatibility period would change the header dependency directly, but is not requested.
5. `article_author_comment_delete`: article-owner context is needed for permission evaluation; the existing 403 test exercises this case, while the exact function signature is a design choice.
6. `favorite_post_idempotency`: only repeated POST changes; the DELETE expectation does not.
7. `access_token_ttl`, `comment_body_blank`, `profile_bio_length`: current tests do not assert the requested new boundaries. Consider new boundary tests without relabeling old assertions automatically.
8. `invoice_rounding_negative`: confirm the empty impact set only for this selected pinned source tree.

## Reviewer checklist

- [ ] Confirm the pinned source commit, 103-file selected-tree manifest, fixture hash, and 10 scenario requirements.
- [ ] Inspect every proposed direct/indirect label at its source path and line; record a decision for **each of 23 labels**, including the 10th no-impact case.
- [ ] Review retrieval-relevant, context-only, potential, ambiguity, and negative evidence without using model predictions as labels.
- [ ] Record any missing label, disagreement, and unresolved design interpretation with source-backed reasoning.
- [ ] If changes are needed, approve a new versioned fixture; do not edit the candidate in place.
- [ ] Record the reviewer identity, date, final decisions, and explicit approval or rejection below.

## Human review record — leave blank until completed by a human

**Reviewer name and team/role:**

**Review date and timezone:**

**Per-label decisions (complete the 23-row table above, or give a signed attachment path):**

**Per-scenario decisions, including negative case:**

**Disagreements or proposed missing labels, with source path:line and rationale:**

**Ambiguities resolved or left open:**

**Final fixture version and SHA-256 after any approved changes:**

**Decision (approve / reject / request changes):**

**Reviewer signature or recorded approval reference:**

Until these fields are completed and any disagreements resolved, the evaluation gate is **BLOCKED: HUMAN_SIGNOFF_REQUIRED**. Do not freeze this candidate or publish final holdout benchmark claims.
