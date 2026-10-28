# SG-AI-09B: FastAPI RealWorld holdout label review

Updated 2026-10-28. **Candidate dataset; independent human sign-off pending.** No ScopeGraph model predictions or scores were used to create these labels. Do not evaluate or tune AI reasoning against this candidate before a reviewer resolves the decisions below.

## Source and scope

- Upstream: [nsidnev/fastapi-realworld-example-app](https://github.com/nsidnev/fastapi-realworld-example-app), commit `029eb7781c60d5f563ee8990a0cbfb79b244538c`. The upstream repository is archived and is read only.
- License: MIT; the exact upstream [LICENSE](../examples/holdout-fastapi-realworld/LICENSE) is included with the source.
- Local source: [examples/holdout-fastapi-realworld](../examples/holdout-fastapi-realworld). This is an exact **selected subtree** of that commit: all `app/` and `tests/` files plus `LICENSE`, 103 files total, 95 Python files. It is not represented as a full upstream checkout.
- Byte-level provenance: [holdout_realworld_snapshot_v1.json](../services/api/tests/evaluation/holdout_realworld_snapshot_v1.json) records each included path, SHA-256, size, and an aggregate tree digest. Git's Windows `core.autocrlf` checkout previously changed line endings, so the local snapshot was written from the upstream commit's Git blobs. The repository [`.gitattributes`](../.gitattributes) now disables line-ending conversion for this pinned subtree on future checkouts.
- Candidate labels: [holdout_realworld_cases_v1.json](../services/api/tests/evaluation/holdout_realworld_cases_v1.json), version `2026-10-28-realworld-holdout-v1-candidate`.

## Review policy

`direct` means a likely implementation edit target. `indirect` means dependent behavior or an existing regression test that exercises the affected behavior. `retrieval_relevant` is useful context without a confirmed edit. `potential_impacts` records plausible relationships that depend on a design choice. A file can be useful for retrieval without being an impact label. Review the requirement **as written**, not a broader imagined feature.

Each case has a requirement, the same pinned commit SHA, retrieval paths, direct and indirect paths, a source line and rationale for every impact label, context-only evidence, potential items, and ambiguity notes. The negative case has a route inventory reference and a rationale grounded in the selected subtree's complete file manifest; absence cannot be inferred from a single source line alone.

## Review queue

| Case | Area | Direct | Indirect | Human decision |
| --- | --- | ---: | ---: | --- |
| `article_title_length` | Article API request schema | 1 | 1 | Pending |
| `article_slug_separator` | Slug service, create/update, test | 1 | 2 | Pending |
| `api_default_page_size` | Shared API default, list/feed | 1 | 2 | Pending |
| `access_token_ttl` | JWT issuance, login/user responses | 1 | 2 | Pending |
| `authorization_prefix` | Auth setting and header dependency | 1 | 1 | Pending |
| `article_author_comment_delete` | Delete authorization and regression test | 2 | 2 | Pending |
| `comment_body_blank` | Comment create request schema | 1 | 1 | Pending |
| `favorite_post_idempotency` | Favorite API contract and regression test | 1 | 1 | Pending |
| `profile_bio_length` | User update request schema | 1 | 1 | Pending |
| `invoice_rounding_negative` | No billing component in selected snapshot | 0 | 0 | Pending |
| **Total** | **10 scenarios** | **10** | **13** | **Pending** |

For each case, choose **KEEP**, **CHANGE**, or **REMOVE** for every impact label, citing the source path and line. Also confirm that context-only paths should remain retrieval-relevant. The reviewer should propose missing labels only from source evidence, never from a model prediction. Record reviewer name, date, rationale, and any disagreement in a separate decision record before changing this candidate fixture.

## Ambiguities to resolve

1. `article_title_length`: the requirement limits API inputs. Decide whether the domain `Article.title` should also enforce 120 characters for internal constructors. It is currently potential only.
2. `article_slug_separator`: new slugs use underscores, but the requirement does not specify migration or compatible lookup for existing hyphenated slugs. SQL storage is potential only.
3. `api_default_page_size`: the two API query parameters share the constant, while repository methods retain their own `20` defaults. Decide whether internal callers are in scope.
4. `authorization_prefix`: replacing `Token` with `Bearer` is a setting change. A dual-prefix transition would additionally make the header comparison a direct edit target.
5. `article_author_comment_delete`: the permission predicate needs article-owner context. The existing 403 test uses an article authored by the requesting user and should change under the proposed rule; the exact function signature remains a design choice.
6. `favorite_post_idempotency`: the current test covers both POST and DELETE; only the repeated POST expectation changes.
7. `access_token_ttl`, `comment_body_blank`, `profile_bio_length`: existing tests exercise nearby valid paths but do not assert the new boundaries. New tests should be recommended rather than treating those old files as confirmed changed regression labels.

## Reproduce and validate

From the ScopeGraph repository root, the checked-in selected snapshot is sufficient for **static** validation; no holdout application dependencies or database are needed:

```powershell
$env:PYTHONPATH='services/api'
$env:PYTHONDONTWRITEBYTECODE='1'
$env:META_AI_PROVIDER='offline_demo'
.\.venv\Scripts\python.exe -m pytest services/api/tests/test_holdout_dataset.py -v -p no:cacheprovider --basetemp data/pytest-holdout-REPLACE-ME --tb=short
```

The test verifies the pinned commit identifier, all 103 file hashes and aggregate digest, path containment, existing files, valid line numbers, distinct labels, retrieval/context separation, scenario coverage, and 23/23 impact annotations. Choose a new `--basetemp` path for another run because pytest replaces that directory.

A separate in-memory SQLite indexing check indexed all **103** selected files and found all **28** distinct referenced retrieval paths. This check runs static indexing only; no orchestrator analysis or model inference was run.

To independently obtain the upstream commit before comparing it with the manifest:

```powershell
git clone https://github.com/nsidnev/fastapi-realworld-example-app.git data/holdout-fastapi-realworld-upstream
git -C data/holdout-fastapi-realworld-upstream checkout --detach 029eb7781c60d5f563ee8990a0cbfb79b244538c
git -C data/holdout-fastapi-realworld-upstream rev-parse HEAD
```

The local snapshot was produced from `git show <commit>:<path>` for each manifest path. Compare the SHA-256 of those blob bytes with the manifest; ordinary Windows checkout files can have different bytes due to CRLF conversion. The upstream clone is kept inside Git-ignored `data/`; do not add its `.git`, `.env`, caches, or dependencies to the holdout snapshot.

## Holdout protection after review

Once an independent human signs off, record the reviewer and all decisions, create a new immutable dataset version if any labels change, and record the final fixture hash. Do not modify the frozen version in place. Keep future model predictions and score artifacts separate from the labels. Do not tune retrieval weights or reasoning rules against the final holdout scores, use evaluated predictions as gold labels, or put holdout results in development prompts. Any future evaluation should report this exact repository SHA, fixture version, source manifest digest, ScopeGraph code SHA, and direct/indirect denominators.

**Current decision record:** the [AI-assisted source review](HOLDOUT_AI_ASSISTED_REVIEW_V1.md) records KEEP for all 23 existing impact labels across 10 cases (10 direct, 13 indirect), CHANGE 0, REMOVE 0, and preserves retrieval-relevant and potential entries. It does not constitute independent human sign-off. The candidate fixture remains unchanged and unfrozen; a human reviewer, review date, and final human decisions are still pending.

Use the blank [human sign-off form](HOLDOUT_HUMAN_SIGNOFF.md) for independent decisions. The [technical readiness report](HOLDOUT_EVALUATION_READINESS.md) records validation, harness checks, and offline commands to use only after approval and freezing.
