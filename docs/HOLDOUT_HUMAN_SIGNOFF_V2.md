# FastAPI RealWorld holdout v2: independent human sign-off

**Status: PENDING INDEPENDENT HUMAN REVIEW.** This form is blank. The v2 fixture is AI-assisted reviewed and provisional; the offline evaluation in [HOLDOUT_EVALUATION_REPORT.md](HOLDOUT_EVALUATION_REPORT.md) is exploratory, not human-approved evidence. Do not infer approval from that result or from the earlier AI-assisted reviews.

The [25-label AI-assisted decision record](HOLDOUT_V2_AI_ASSISTED_DECISIONS.md) recommends KEEP 25, CHANGE 0, REMOVE 0 with source reasons. It is reference material for the human reviewer; no field below is completed by that record.

On 2026-10-29, the project owner accepted the AI-assisted technical decision and closed this preparation workstream for handoff. The owner did not attest to personally checking all source references, so the independent human-review fields below remain blank. This form is needed only if the team later wants to freeze an independently verified benchmark.

## Material

- Candidate: [holdout_realworld_cases_v2.json](../services/api/tests/evaluation/holdout_realworld_cases_v2.json), `2026-10-28-realworld-holdout-v2-candidate`, SHA-256 `af39df5af8ae431b74952efbe5921317347e54b53fadc885477a0289cb5cde6e`.
- Source: FastAPI RealWorld selected `LICENSE`, `app/` and `tests/` snapshot at `029eb7781c60d5f563ee8990a0cbfb79b244538c`; 103 files, tree SHA-256 `f112558f9f09dd0bb426e33e2c628851fe6561ba1365487c7336098f463ab51b`.
- Counts: 10 scenarios, 10 direct and 15 indirect labels, 25 total. V1 remains unchanged with 23 labels.
- Review history: [first AI-assisted review](HOLDOUT_AI_ASSISTED_REVIEW_V1.md) and [second source review](HOLDOUT_CODEX_SOURCE_REVIEW.md). The second review proposed the two added indirect labels. Neither document is human sign-off.

Use the fixture requirement, `retrieval_relevant`, annotations, context annotations, potential impacts, ambiguities and negative evidence. Paths and lines below are relative to `examples/holdout-fastapi-realworld/`. Direct means likely implementation edit; indirect means dependent behavior or an existing regression test. Retrieval-only and potential paths are not automatically impacted.

## Per-scenario and per-label decisions

For each row, inspect the cited source and record **KEEP**, **CHANGE** or **REMOVE** with a reason. Resolve any proposed missing labels against source rather than model predictions. Record one case-level decision for all 10 cases, including the no-impact case.

| # | Scenario | Type | Source path:line | Human decision and source-backed reason |
| ---: | --- | --- | --- | --- |
| 1 | `article_title_length` | Direct | `app/models/schemas/articles.py:21` |  |
| 2 | `article_title_length` | Indirect | `app/api/routes/articles/articles_resource.py:60` |  |
| 3 | `article_slug_separator` | Direct | `app/services/articles.py:18` |  |
| 4 | `article_slug_separator` | Indirect | `app/api/routes/articles/articles_resource.py:64` |  |
| 5 | `article_slug_separator` | Indirect | `tests/test_api/test_routes/test_articles.py:94` |  |
| 6 | `api_default_page_size` | Direct | `app/models/schemas/articles.py:8` |  |
| 7 | `api_default_page_size` | Indirect | `app/api/dependencies/articles.py:25` |  |
| 8 | `api_default_page_size` | Indirect | `app/api/routes/articles/articles_common.py:28` |  |
| 9 | `api_default_page_size` | Indirect | `app/api/routes/articles/articles_resource.py:30` |  |
| 10 | `access_token_ttl` | Direct | `app/services/jwt.py:12` |  |
| 11 | `access_token_ttl` | Indirect | `app/api/routes/authentication.py:41` |  |
| 12 | `access_token_ttl` | Indirect | `app/api/routes/users.py:23` |  |
| 13 | `access_token_ttl` | Indirect | `app/api/dependencies/authentication.py:78` |  |
| 14 | `authorization_prefix` | Direct | `app/core/settings/app.py:29` |  |
| 15 | `authorization_prefix` | Indirect | `app/api/dependencies/authentication.py:57` |  |
| 16 | `article_author_comment_delete` | Direct | `app/services/comments.py:5` |  |
| 17 | `article_author_comment_delete` | Direct | `app/api/dependencies/comments.py:39` |  |
| 18 | `article_author_comment_delete` | Indirect | `app/api/routes/comments.py:64` |  |
| 19 | `article_author_comment_delete` | Indirect | `tests/test_api/test_routes/test_comments.py:61` |  |
| 20 | `comment_body_blank` | Direct | `app/models/schemas/comments.py:15` |  |
| 21 | `comment_body_blank` | Indirect | `app/api/routes/comments.py:47` |  |
| 22 | `favorite_post_idempotency` | Direct | `app/api/routes/articles/articles_common.py:71` |  |
| 23 | `favorite_post_idempotency` | Indirect | `tests/test_api/test_routes/test_articles.py:222` |  |
| 24 | `profile_bio_length` | Direct | `app/models/schemas/users.py:22` |  |
| 25 | `profile_bio_length` | Indirect | `app/api/routes/users.py:40` |  |

**Negative scenario:** `invoice_rounding_negative` has no proposed impact paths; inspect the selected-tree router inventory `app/api/routes/api.py:3-16` and complete manifest before deciding KEEP/CHANGE/REMOVE for its empty label set.

**Two v2 additions needing explicit review:** `api_default_page_size` ? `app/api/routes/articles/articles_resource.py:30-42`; `access_token_ttl` ? `app/api/dependencies/authentication.py:78-91`. The source reasoning and limits are in [HOLDOUT_CODEX_SOURCE_REVIEW.md](HOLDOUT_CODEX_SOURCE_REVIEW.md).

## Reviewer checklist

- [ ] Verify the pinned source commit, 103-file hashes, tree digest, v2 fixture SHA, and all 10 requirements.
- [ ] Record a source-backed decision for each of the 25 labels and the empty-impact negative scenario.
- [ ] Review retrieval-only and potential paths, ambiguities, and any missing-label proposals.
- [ ] Resolve or explicitly defer slug migration, non-API validation/defaults, old-token handling and other design-dependent questions.
- [ ] Record identity, review date, disagreement resolution, final decision, and approval reference below.
- [ ] If any label changes, approve a new versioned fixture; never edit v1 or v2 in place.

## Human review record ? leave blank until completed by a human

**Reviewer name and team/role:**

**Review date and timezone:**

**Per-label decisions (complete the 25-row table above or attach a signed decision record):**

**Per-scenario decisions, including the negative case:**

**Disagreements or missing labels, with source path:line and rationale:**

**Ambiguities resolved or left open:**

**Final approved fixture filename and SHA-256 after any approved changes:**

**Decision (approve / reject / request changes):**

**Reviewer signature or recorded approval reference:**

Until these fields and all 25 label decisions are completed, the dataset is provisional and cannot be called independently human-approved or frozen.
