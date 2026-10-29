# FastAPI RealWorld holdout v2: provisional offline evaluation

Updated 2026-10-29 (Asia/Bangkok). **Status: technical workstream closed by project-owner acceptance of the AI-assisted decision; independent human source sign-off remains pending.** This is an exploratory run of `OfflineDemoProvider`, not a final independently verified benchmark, a paid Meta result, or evidence of production accuracy. No AI Core retrieval, reasoning, or causal-gate behavior was tuned after viewing these scores.

## Reproduction identity and review history

| Item | Exact value |
| --- | --- |
| Source repository | `nsidnev/fastapi-realworld-example-app`, MIT license; pinned commit `029eb7781c60d5f563ee8990a0cbfb79b244538c` |
| Local source | `examples/holdout-fastapi-realworld/`, selected upstream `LICENSE`, complete `app/` and `tests/` trees only; 103 files, 95 Python files |
| Source tree SHA-256 | `f112558f9f09dd0bb426e33e2c628851fe6561ba1365487c7336098f463ab51b` |
| Source manifest SHA-256 | `e0bbb5b0e958b118426261cc72ebd0b705928a7b61be6fa76c3b7a8e7be73e22` |
| v1 fixture | `services/api/tests/evaluation/holdout_realworld_cases_v1.json`, SHA-256 `5892974d49b89a735104d6857aacc4314599d2a3eec544bcc76d4599a00f5615`; 10 cases, 10 direct + 13 indirect labels; unchanged |
| v2 candidate | `services/api/tests/evaluation/holdout_realworld_cases_v2.json`, version `2026-10-28-realworld-holdout-v2-candidate`, SHA-256 `af39df5af8ae431b74952efbe5921317347e54b53fadc885477a0289cb5cde6e`; 10 cases, 10 direct + 15 indirect = **25** labels |
| ScopeGraph code | Branch `ai/evidence-grounding-v2`, HEAD `aa780fc39db196dc9e420840d5eb7a17e1dea2a8` plus the uncommitted fixture, evaluator-provenance and test changes documented here. HEAD alone does not identify this complete run state. |
| Artifact | Git-ignored `data/holdout_realworld_v2_candidate_offline_verified_20261028.json`, SHA-256 `0e6a2dd7e89717fd774f3ca5ce4ecd9b6ae3b56fb50a85de42b3b54c8653bba0`; replay CLI output `data/holdout_realworld_v2_candidate_replay_verified_20261028.json` |
| Run timestamp | `2026-10-28T15:06:18.186937+00:00` (22:06:18 Asia/Bangkok) |

The earlier [AI-assisted review](HOLDOUT_AI_ASSISTED_REVIEW_V1.md) retained all 23 v1 labels. A separate [source review](HOLDOUT_CODEX_SOURCE_REVIEW.md) rechecked those labels and identified two additional indirect relationships: `api_default_page_size` → `app/api/routes/articles/articles_resource.py:30-42`, and `access_token_ttl` → `app/api/dependencies/authentication.py:78-91`. V2 preserves all v1 scenarios and labels and adds only those two paths, their retrieval entries and source annotations. A subsequent [25-label AI-assisted decision record](HOLDOUT_V2_AI_ASSISTED_DECISIONS.md) checked each v2 label against the pinned source and recommends **KEEP 25, CHANGE 0, REMOVE 0**. The project owner accepted this AI-assisted technical disposition on 2026-10-29 and closed the preparation workstream for handoff. The [v2 human sign-off form](HOLDOUT_HUMAN_SIGNOFF_V2.md) has no reviewer identity, date, per-label decisions or approval. **V2 is not frozen or independently human-approved.**

## Evaluation configuration and artifact contents

The evaluator verified **all 103 source files against the pinned manifest before indexing**, then indexed them in a fresh in-memory SQLite database: **103 indexed files**. It used `--mode offline`, actual per-case provider `offline_demo` and model `deterministic-semantic-matcher`, retrieval `top_k=8`, and a 3,000-token configured context budget. The artifact records the requested Meta model setting `muse-spark-1.3` for configuration provenance; **that model was not called**. API keys were cleared in the run process. No persistent repository database, cache, frontend code, or paid endpoint was touched.

Each of the 10 saved cases has its requirement, labels, interpretation, ranked retrieval context, raw impact claims, existence-validated/rejected claims, final supported claims, potential items, completeness review, latency, provider/model, and exact true/false-positive and missed file/type pairs. The top level records dataset/manifest hashes, source-tree digest, **103 verified source files**, source and code SHAs, label counts, review status, config, per-case results, and macro/micro metrics. The raw traces are local diagnostic data and remain in Git-ignored `data/`.

## Measured results

Ratios below are from **one** local offline pass. Empty denominators are `null` in the artifact, not perfect scores. Macro means average defined per-case ratios; micro pools counts across cases. The negative case has zero gold retrieval and impact labels.

| Retrieval at K=8 | Macro | Micro/counts |
| --- | ---: | ---: |
| Hybrid Precision@8 | 0.225 | **18 / 80** slots = 0.225 |
| Hybrid Recall@8 | 0.424 | **18 / 44** relevant case/path labels = 0.409 |
| Hybrid MRR@8 | 0.725 | Not defined as a pooled rank metric |
| Keyword baseline Precision@8 | 0.050 | **4 / 80** = 0.050 |
| Keyword baseline Recall@8 | 0.087 | **4 / 44** = 0.091 |
| Keyword baseline MRR@8 | 0.068 | Not defined as a pooled rank metric |

| Impact classification | Macro | Micro/counts |
| --- | ---: | ---: |
| Final **supported strict file/type** precision / recall / F1 | 0 / 0 / 0 | **0 TP, 5 FP, 25 FN**; 0/5 precision, 0/25 recall, F1 0 |
| Final direct / indirect recall | 0 / 0 | **0 / 10** direct; **0 / 15** indirect |
| Final **file-only** precision / recall / F1 | 0.625 / 0.083 / 0.367 | **2 hits / 5 predicted files / 25 gold files**; 0.400 precision, 0.080 recall, 0.133 F1 |
| Raw existence-gated strict precision / recall / F1 | 0.183 / 0.167 / 0.181 | **4 TP / 28 unique predicted / 25 gold**; 0.143 precision, 0.160 recall, 0.151 F1 |

The macro file-only figures average the evaluator's defined per-case ratios, so they differ substantially from pooled file-only values. Strict scoring requires both the file **and** `direct`/`indirect` type to match. All 25 gold impact labels are distinct file/type pairs within their own scenarios.

| Grounding and potential | Observed denominator |
| --- | ---: |
| Raw claims / existence-accepted / rejected | **28 / 28 / 0** |
| Invalid-file / invalid-symbol claims | **0 / 28** and **0 / 28** |
| Unique raw file/type pairs / duplicate raw claims | **28 / 0** |
| Raw predictions unsupported by candidate labels | **24 / 28** unique and **24 / 28** raw claims |
| Final source-supported predictions | **5** file/type pairs; **0 / 5** strict gold matches |
| `potential_impacts` entries | **309** total: **23** typed `direct`/`indirect` candidates, **286** untyped contextual entries. Typed potential pairs cover **3 / 25** gold pairs; macro potential coverage **0.139**. Untyped entries are not confirmed impact predictions. |
| Analysis latency | Mean **0.144 s/case**, p50 **0.146 s**, p95 **0.218 s**; aggregate per-case analysis time about **1.438 s**. This excludes indexing and CLI startup. |
| Hybrid / keyword retrieval time | Mean **93.1 ms** / **101.0 ms** per case in this single run; not a stable latency benchmark. |
| Model token usage / cost | `null` for all 10 offline cases; no billed token or cost figure exists. |

The existence gate's 0 invalid-file/symbol count means the raw paths/symbols were grounded in the index. It does **not** mean the proposed change relationships were correct. In this run, the causal gate moved most raw claims out of the confirmed set, but the five retained predictions still missed all 25 strict labels. The offline provider is a deterministic demo matcher originally centered on the sample authentication workflow, so these figures are diagnostic of this configuration, not of Meta inference.

## Per-scenario failure summary

| Scenario | Hybrid retrieved / gold | Raw predictions; raw strict hits | Final supported; strict hits | Concrete observation |
| --- | ---: | ---: | ---: | --- |
| `article_title_length` | 2/4 | 3; 1 | 0; 0 | Raw finds the article route as indirect but mis-types the request schema as indirect; all are removed from confirmed impact. |
| `article_slug_separator` | 1/5 | 3; 0 | 0; 0 | Raw focuses on SQL/table/repository files, missing `app/services/articles.py` and the existing slug regression test. |
| `api_default_page_size` | 3/6 | 2; 1 | 1; 0 | The supported `articles_common.py` file is right, but marked direct where gold is indirect; default constant and list route are missed. |
| `access_token_ttl` | 2/5 | 4; 0 | 0; 0 | Raw sees `app/services/jwt.py` but marks it indirect instead of direct; the auth dependency and token-issuing routes are missed. |
| `authorization_prefix` | 3/4 | 5; 1 | 0; 0 | Raw identifies `app/api/dependencies/authentication.py` as indirect; it does not survive the support gate and the direct setting is missed. |
| `article_author_comment_delete` | 1/6 | 4; 1 | 0; 0 | Raw identifies the existing comment test as indirect, but misses the permission predicate and dependency. |
| `comment_body_blank` | 3/5 | 0; 0 | 0; 0 | Retrieval finds comment route/test context; reasoning emits no raw impact claim. |
| `favorite_post_idempotency` | 2/4 | 0; 0 | 0; 0 | Retrieval finds route and test context; reasoning emits no raw impact claim. |
| `profile_bio_length` | 1/5 | 7; 0 | 4; 0 | The supported set includes `app/api/routes/users.py` but marks it direct instead of indirect, plus three unrelated auth/profile files. |
| `invoice_rounding_negative` | 0/0 | 0; 0 | 0; 0 | Correctly emits no confirmed impact for the selected source; two untyped contextual potential entries are not impact claims. |

This table describes observed outputs only. It is **not** a tuning plan and does not establish that a different inference provider would make the same errors.

## Deterministic replay and quality checks

The verified saved artifact was replayed by `scripts/replay_ai_core.py` with no inference. A separate comparison asserted exact equality of every saved case's retrieval, impact, grounding and scoring details, plus macro and micro summaries. Calling the pure replay function on the saved artifact also returned the **identical artifact**; the dataset SHA, version, source SHA, 103 verified source files and 10/15/25 counts matched the current v2 fixture. Replay exit code: **0**. An earlier redirect of a *prior* artifact's CLI output with PowerShell produced UTF-16 text and failed the comparison reader; Python subprocess produced UTF-8 output and all comparisons passed. The prior artifact remains untouched as an earlier diagnostic run; this report uses only the verified artifact identified above.

| Check | Result |
| --- | --- |
| v2-only label delta and source references | `test_holdout_dataset.py`: **3 passed**, exit **0**; exact v1 SHA asserted; only two specified indirect labels, matching retrieval paths and valid annotations added. |
| Pinned snapshot | The same tests checked all **103** local file byte hashes and aggregate tree digest, path containment, line bounds, duplicate labels and selected-tree negative-case evidence. The earlier source review additionally compared all 103 manifest paths to the pinned upstream Git blobs. |
| Evaluator provenance tests | Two targeted tests: **2 passed**, exit **0**, after red-phase failures for missing `dataset_sha256`. |
| Evaluator source-verification regression | A corrupted-manifest test first failed because evaluation proceeded despite a wrong file hash; after the fix, it and the positive provenance test **2 passed**, exit **0**. The evaluator now rejects a mismatched inventory, file size/hash, tree digest or source identity before indexing. |
| Full backend suite | Final run after source verification: `python -m pytest services/api/tests/ -v -p no:cacheprovider --basetemp data/pytest-holdout-v2-final-20261028 --tb=short`: **111 passed, 1 skipped**, exit **0**. The skipped test is the opt-in paid Meta full-pipeline smoke. |
| Replay | CLI and pure replay: **10/10 cases, macro and micro equal**, exit **0**. |

No frontend build was run because no frontend file changed. The artifact contains no billed token usage. Full backend tests and the evaluation used the configured local Python 3.13 environment with `META_AI_PROVIDER=offline_demo`, empty process API-key variables and no dependency installation.

## Remaining gates and next actions

1. If the team later needs a **final independently verified benchmark**, an independent human should inspect all **25** v2 labels, including the two additions, and record identity, date, per-label decisions, disagreements and explicit approval on the blank [v2 sign-off form](HOLDOUT_HUMAN_SIGNOFF_V2.md). The historical [v1 form](HOLDOUT_HUMAN_SIGNOFF.md) remains unchanged. This gate does not prevent moving to a new feature.
2. After any human-approved corrections, create an immutable frozen fixture under a **new versioned filename**, record its SHA-256 and repeat integrity validation. Preserve v1 and v2 candidates. If a later evaluation is authorized, label it separately from this provisional run.
3. Use additional repositories and human-reviewed cases to assess generalization. One selected subtree, ten provisional cases, one deterministic offline run and a demo matcher do not support a generalization or production-accuracy claim. Do not tune AI Core against this provisional holdout result.

### Reproduce the provisional local run

From repository root in PowerShell, using the existing environment and a **new** artifact filename to preserve this run:

```powershell
$env:PYTHONPATH='services/api'
$env:PYTHONDONTWRITEBYTECODE='1'
$env:META_AI_PROVIDER='offline_demo'
$env:META_AI_API_KEY=''
$env:MODEL_API_KEY=''
.\.venv\Scripts\python.exe -m pytest services/api/tests/test_holdout_dataset.py -v -p no:cacheprovider --basetemp data/pytest-holdout-v2-NEW --tb=short
.\.venv\Scripts\python.exe scripts/evaluate_ai_core.py --mode offline --dataset services/api/tests/evaluation/holdout_realworld_cases_v2.json --output data/holdout_realworld_v2_candidate_offline_NEW.json
.\.venv\Scripts\python.exe scripts/replay_ai_core.py --input data/holdout_realworld_v2_candidate_offline_NEW.json
```

The evaluation and replay recompute metrics from the same source and labels; latency can vary between runs. `data/` is Git-ignored. Do not publish the artifact as a final human-verified benchmark.
