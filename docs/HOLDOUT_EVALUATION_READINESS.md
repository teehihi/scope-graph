# SG-AI-09B — holdout validation and evaluation readiness

Updated: 2026-10-28 (Asia/Bangkok). **Gate: BLOCKED: HUMAN_SIGNOFF_REQUIRED.** This is technical readiness evidence, not a holdout model evaluation or a final benchmark. No holdout inference, paid Meta request, label change, fixture freeze, or tuning was performed.

## Dataset and source validation

| Check | Result |
| --- | --- |
| Candidate dataset | [holdout_realworld_cases_v1.json](../services/api/tests/evaluation/holdout_realworld_cases_v1.json), version `2026-10-28-realworld-holdout-v1-candidate`; SHA-256 `5892974d49b89a735104d6857aacc4314599d2a3eec544bcc76d4599a00f5615` |
| Scenario and label counts | **10 scenarios; 10 direct, 13 indirect, 23 total impact labels and 23 corresponding impact annotations**. One negative scenario has zero impact labels. |
| Source identity | `nsidnev/fastapi-realworld-example-app` commit `029eb7781c60d5f563ee8990a0cbfb79b244538c`; selected snapshot is complete `app/` and `tests/` trees plus `LICENSE`, not a full upstream checkout. |
| Snapshot integrity | [Manifest](../services/api/tests/evaluation/holdout_realworld_snapshot_v1.json) lists 103 files (95 Python); every local byte count and SHA-256 matched. An additional read-only `git show <commit>:<path>` comparison against the existing local upstream clone matched **all 103 upstream Git blobs**. [`.gitattributes`](../.gitattributes) disables line-ending conversion for the selected subtree. Aggregate tree SHA-256: `f112558f9f09dd0bb426e33e2c628851fe6561ba1365487c7336098f463ab51b`. |
| Source annotations | Every retrieval and evidence path exists within the selected snapshot; all annotated lines are in bounds. No duplicate scenario IDs, retrieval paths, direct/indirect labels, or cross-type label overlap. No cross-repository path was found. |
| Negative case | `invoice_rounding_negative` has no retrieval or impact labels. The selected-tree router inventory at `app/api/routes/api.py:7` registers authentication, users, profiles, articles, comments, and tags; a text search of the complete selected `app/` and `tests/` trees found no `invoice`, `billing`, or banker's-rounding implementation. This conclusion applies only to the pinned selected tree. |
| Static indexing | In-memory SQLite `IndexingEngine` smoke returned `ready`, **103 indexed files, 340 symbols**, and all **28 distinct retrieval-relevant paths** present. This did not invoke `AnalysisOrchestrator` or a model. |

The existing [AI-assisted decision record](HOLDOUT_AI_ASSISTED_REVIEW_V1.md) covers all 23 labels with KEEP 23, CHANGE 0, REMOVE 0, source references, and design-dependent notes. The project owner approved that **AI-assisted proposal only** in chat on 2026-10-28 and explicitly said they had not independently checked all 23 labels against source. The [human sign-off form](HOLDOUT_HUMAN_SIGNOFF.md) is blank. No named independent human has approved the labels, so the candidate remains unchanged and unfrozen.

## Evaluation harness readiness

| Capability | Evidence | Readiness limit |
| --- | --- | --- |
| Load holdout fixture | [`evaluate_ai_core.py`](../scripts/evaluate_ai_core.py) accepts `--dataset`; the candidate has the required `repository`, `cases`, `requirement`, `retrieval_relevant`, and `impact` fields. The fixture was parsed and its selected source indexed in the static smoke. | A full holdout evaluation was deliberately not run before sign-off. |
| Index pinned snapshot | The evaluator constructs a fresh in-memory SQLite repository from `dataset['repository']` and calls `IndexingEngine`; the separate holdout smoke indexed all 103 selected files. | The evaluator does not itself verify the 103 file hashes before inference; run the integrity test at evaluation time. |
| Retrieval and impact metrics | [`replay_evaluation`](../services/api/app/analysis/evaluation.py) computes per-case, macro, and micro retrieval/impact metrics and separate raw versus source-supported impact scores. [Metric tests](../services/api/tests/test_evaluation_metrics.py) passed. | Empty gold labels yield undefined ratios where appropriate; report denominators, including 10 direct and 13 indirect labels. |
| Raw, rejected, supported, potential claims | The [orchestrator](../services/api/app/analysis/orchestrator.py) records actual interpretation/reasoning context, ranked retrieval, raw impact, existence-valid/rejected claims, final validated claims, and potential impacts in schema-v2 traces. [Replay tests](../services/api/tests/test_evaluation_replay.py) passed. | Existence validation is not proof of causal edit impact. |
| Deterministic replay | [`replay_ai_core.py`](../scripts/replay_ai_core.py) calls the pure replay function on saved schema-v2 traces. Regression tests covered identical replay, duplicate accounting, empty labels, and CLI replay with a live-provider environment but no key/network request. | Replay requires a schema-v2 per-case trace; aggregate-only legacy artifacts cannot be fully replayed. |
| Provider/model and provenance | The evaluator records dataset version, repository snapshot identifier, mode, timestamp, ScopeGraph HEAD SHA, requested provider/model, and actual per-case provider/model metadata. | It does **not** automatically record the candidate fixture SHA-256, source-tree digest, or dirty-tree contents. Record these separately and run from a reviewed, reproducible code checkout for an official evaluation. |

**Readiness conclusion:** the input shape, exact source snapshot, indexer, metrics, trace, and replay paths are technically supported by code and focused tests. Integrated evaluation against this holdout remains **unexecuted** under the human-review gate. No holdout precision, recall, F1, or model-generalization claim exists.

## Commands executed in this validation

All commands ran at `D:\scope-graph` with Python 3.13.13 and `META_AI_PROVIDER=offline_demo` on branch HEAD `2f01a7b`.

| Command or check | Exit code | Result |
| --- | ---: | --- |
| `python -m pytest services/api/tests/test_holdout_dataset.py services/api/tests/test_evaluation_replay.py services/api/tests/test_evaluation_metrics.py services/api/tests/test_evaluation_dataset.py services/api/tests/test_evaluation_dataset_v3.py -v -p no:cacheprovider --basetemp data/pytest-holdout-readiness-20261028-01 --tb=short` | 0 | **18 passed**; includes 2 holdout integrity tests. |
| `python -m pytest services/api/tests/ -v -p no:cacheprovider --basetemp data/pytest-holdout-readiness-full-20261028-01 --tb=short` | 0 | **108 passed, 1 skipped** (opt-in live Meta smoke). |
| In-memory `IndexingEngine.index_repository` smoke against the selected snapshot | 0 | `ready`; 103 files, 340 symbols, 28/28 distinct retrieval paths indexed. |
| `Get-FileHash` on the candidate and 103 manifest file-hash assertions | 0 | Candidate SHA-256 and tree digest match the values above. |
| Read-only `git show` comparison for all 103 manifest paths at the pinned upstream commit | 0 | **103/103 Git blobs matched** manifest size and SHA-256; no download or network request. |

The full pytest invocations used `.\.venv\Scripts\python.exe`, `$env:PYTHONPATH='services/api'`, and `$env:PYTHONDONTWRITEBYTECODE='1'`. The saved evaluation/replay regression tests used only development or synthetic fixtures. They did **not** run holdout analysis.

## Final offline evaluation procedure — execute only after human sign-off

1. Complete [HOLDOUT_HUMAN_SIGNOFF.md](HOLDOUT_HUMAN_SIGNOFF.md) with a named independent reviewer, all per-label decisions, disagreements, date, and explicit approval. Resolve changes in a **new versioned fixture**, preserving the candidate. Freeze and record its hash. If all labels remain unchanged, `holdout_realworld_cases_v1_frozen.json` is a suggested approved copy; if labels change, choose the next versioned name and update `$fixture` below.
2. Use an exact reviewed ScopeGraph code commit and verify the working tree used for evaluation. Run the source-integrity tests again. Record the approved fixture hash, source-tree digest, dataset version, selected upstream commit, and ScopeGraph code SHA with the result artifact.
3. From the repository root, run the following **offline-only** commands after the approved frozen fixture exists. Replace `$fixture` only if the approved file has a different versioned name; use a new unused pytest `--basetemp` directory.

```powershell
$env:PYTHONPATH='services/api'
$env:PYTHONDONTWRITEBYTECODE='1'
$env:META_AI_PROVIDER='offline_demo'
$fixture='services/api/tests/evaluation/holdout_realworld_cases_v1_frozen.json'
$output='data/holdout_realworld_v1_frozen_offline.json'
if (-not (Test-Path -LiteralPath $fixture)) { throw 'Approved frozen fixture is missing; stop before evaluation.' }
.\.venv\Scripts\python.exe -m pytest services/api/tests/test_holdout_dataset.py -v -p no:cacheprovider --basetemp data/pytest-holdout-final-NEW-UNUSED-DIR --tb=short
Get-FileHash -Algorithm SHA256 $fixture
git rev-parse HEAD
.\.venv\Scripts\python.exe scripts/evaluate_ai_core.py --mode offline --dataset $fixture --output $output
.\.venv\Scripts\python.exe scripts/replay_ai_core.py --input $output
```

The current integrity test is pinned to the **candidate** fixture and source manifest. Before an approved frozen run, compare the frozen fixture's version, 10 case IDs, 10/13 label denominators **or approved revised counts**, source paths, and line annotations against the signed decision record; add a frozen-fixture integrity check if its schema or labels change. Record the source manifest's `tree_sha256` alongside the output because the evaluator currently stores only the snapshot identifier. Compare saved and replayed macro/micro scores before reporting anything. Keep the output under Git-ignored `data/`; do not expose trace snippets or credentials.

**Current stop condition:** `HUMAN_SIGNOFF_REQUIRED`. Do not execute the future commands above, run paid Meta inference, optimize retrieval/reasoning against the holdout, or publish final benchmark scores until the human review and freeze are complete.
