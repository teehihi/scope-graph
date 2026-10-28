# ScopeGraph AI Core evaluation

## SG-AI-09 label-only v3 replay (2026-10-28)

The [v3 fixture](../services/api/tests/evaluation/ai_core_cases_v3.json) applies **exactly six removals** to the frozen v2 labels: 17 scenarios, **25 direct + 10 indirect = 35** impact pairs, versus 26 direct + 15 indirect = 41 in v2. The [review decision record](AI_CORE_LABEL_REVIEW_V3.md) gives the six rationales and source lines. This was an **AI-assisted source review**, not independent human sign-off. Both fixtures refer to sample repository snapshot `f413b0b90d6157d5493a5603fb1245a7f4681eb6`; the sample source in this checkout matches that snapshot. No evaluation false positive was promoted into ground truth.

We replaced only `trace.labels` in the saved offline schema-v2 artifact `data/ai_core_evaluation_v2_setting_reads.json` with the corresponding v3 labels, then ran the existing pure `replay_evaluation` function. The local, Git-ignored result is `data/ai_core_evaluation_v3_label_replay.json`; it records `prediction_source` and `label_revision`, including the source artifact's `commit_sha` (`6e4a0cbddbdcda92ac2dca9df2baf2d6679687ef`) and the label-review checkout HEAD (`897b930887dc13a60ac037f9c41ae7ef93bb17c7`). The artifact's top-level `commit_sha` remains the **original inference run's** SHA, not a new inference run. The original artifact replayed to identical stored macro and micro metrics before relabeling. The v3 replay was checked with:

```powershell
$env:PYTHONPATH='services/api'
.\.venv\Scripts\python.exe scripts/replay_ai_core.py --input data/ai_core_evaluation_v3_label_replay.json
```

| Metric on unchanged saved offline predictions | v2 labels | v3 labels |
| --- | ---: | ---: |
| Macro strict impact precision / recall / F1 | 0.352 / 0.552 / 0.427 | 0.309 / 0.579 / 0.395 |
| Macro direct / indirect recall | 0.573 / 0.542 | 0.583 / 0.500 |
| Micro strict TP / FP / FN | 23 / 42 / 18 | 20 / 45 / 15 |
| Micro strict precision / recall / F1 | 0.354 / 0.561 / 0.434 | 0.308 / 0.571 / 0.400 |
| Micro direct / indirect recall | 0.577 / 0.533 | 0.600 / 0.500 |
| Macro raw impact precision / recall / F1 | 0.170 / 0.453 / 0.240 | 0.154 / 0.511 / 0.229 |
| Unique raw claims outside labels | 91 / 111 | 93 / 111 |
| Hybrid retrieval Recall@8 | 0.956 | 0.956 |

Three removed labels were true positives under v2 and became false positives under v3; three were false negatives under v2 and disappeared from the denominator. Raw claims matched two removed labels. These score changes are **entirely caused by label revision**, with identical predictions, retrieval context, provider, and inference latency. The macro strict score averages only the 16 cases with nonempty gold impact labels; micro strict scores pool 35 v3 gold pairs. Retrieval labels and rankings did not change. No offline inference rerun was needed for this controlled label comparison, and no paid Meta request was made. The 17 cases come from one small Python sample; they cannot establish production accuracy, generalization, or a model improvement. Human sign-off and a separate repository holdout remain open.

## SG-AI-07B/07C/08/09 offline checkpoint (2026-10-28)

The [expanded v2 fixture](../services/api/tests/evaluation/ai_core_cases_v2.json) has **17** source-annotated scenarios over one 14-file Python sample, including authentication, authorization, API responses, a model-field change, configuration, security, cross-module behavior, tests, and one no-impact billing case. Each impact label has a checked-in path, line, and written rationale; the billing case has a negative rationale. These labels were reviewed against sample source during implementation but **have not received independent team adjudication**. The fixture is diagnostic and is not a production accuracy estimate. The repository snapshot identifier is recorded in the dataset; the ignored output also records the Git HEAD at run time.

Reproduce the **offline** run and pure replay from the repository root:

```powershell
$env:PYTHONPATH='services/api'
.\.venv\Scripts\python.exe scripts/evaluate_ai_core.py --mode offline --dataset services/api/tests/evaluation/ai_core_cases_v2.json --output data/ai_core_evaluation_v2.json
.\.venv\Scripts\python.exe scripts/replay_ai_core.py --input data/ai_core_evaluation_v2.json
```

No Meta request was made for this checkpoint. The saved schema-v2 trace includes actual reasoning context, existence-gated claims, supported claims, potential items, review suggestions, and annotations. Replay re-scores both the existence-gated model output (`raw_impact`) and the final supported output (`impact`); `file_only_impact` ignores direct/indirect type. The keyword baseline measures retrieval selection only. It does **not** constitute a comparable impact baseline because its predictions were never generated for this 17-case fixture.

| Macro metric | Keyword retrieval | Hybrid retrieval | Existence-gated model claims | Full static gate |
| --- | ---: | ---: | ---: | ---: |
| Precision@8 | 0.191 | 0.331 | — | — |
| Recall@8 | 0.591 | 0.956 | — | — |
| MRR@8 | 0.266 | 0.778 | — | — |
| Strict impact precision | — | — | 0.170 | 0.352 |
| Strict impact recall | — | — | 0.453 | 0.552 |
| Strict impact F1 | — | — | 0.240 | 0.427 |
| Direct recall | — | — | 0.427 | 0.573 |
| Indirect recall | — | — | 0.458 | 0.542 |
| File-only precision / recall / F1 | — | — | — | 0.382 / 0.576 / 0.456 |

Strict metrics compare distinct `(file_path, impact_type)` pairs. The final micro strict score is **23 true positives, 42 false positives, 18 false negatives**, yielding precision **0.354**, recall **0.561**, and F1 **0.434**. Macro impact metrics average the 16 cases with nonempty gold impact labels; the empty billing case has `null` impact precision/recall and contributes no false positive from the offline provider. Macro retrieval precision includes that case; its recall is `null` and excluded from macro recall. Precision@8 always uses K=8 as denominator. The 17-case source review contains 41 labeled file/type pairs, including 15 indirect pairs.

Of **111** raw offline claims, all 111 passed file/symbol existence checks, but **91** unique claims fell outside the manual file/type labels (unsupported-label rate **0.820**). This is a label comparison, not proof those 91 claims are false. The static gate corrects some direct/indirect type mistakes, recovers indexed regression tests, and follows imported reads of a uniquely matched configuration attribute. The indexer creates a `reads` edge only when the target symbol resolves in the imported module. On this **same frozen fixture**, macro strict precision rises from **0.170 to 0.352**, direct recall from **0.427 to 0.573**, and indirect recall from **0.458 to 0.542**. The mechanical quality comparison is met without more invalid file/symbol claims; the separate **independent-label-adjudication condition remains open**. Confirmed impact still has **42** micro false positives. The static `supported` label means a source symbol/reason match or a concrete call/read edge was found; it does not establish runtime causality or a calibrated probability. Potential-impact coverage of gold file/type pairs was **0.135** macro. The deterministic offline provider remains heavily tailored to email-related prompts, so its impact results are a poor proxy for Muse Spark.

Mean hybrid retrieval latency was **10.4 ms** in this single local run versus **9.8 ms** for the simple keyword baseline; these tiny timing differences are not stable benchmarks. Mean full-analysis latency was **0.021 s**, p50 **0.021 s**, p95 **0.024 s** over 17 offline scenarios. The context reduction estimate against all raw sample source characters was **12.8%**. Against the older symbol-summary baseline it was **−41.7%** because the new context includes bounded source snippets and signatures; neither character proxy is actual billed tokens. The offline provider reported no token usage, and inference cost was not measured. Explanation fields passed structural tests, but factual consistency, readability, and usefulness need independent human review; no LLM judge score was used.

The [review packet](AI_CORE_LABEL_REVIEW.md) identifies every scenario and the ambiguous labels for an independent teammate. The next quality work should audit the 91 label-mismatched raw claims and 42 confirmed-claim false positives, broaden repositories and no-impact scenarios, and improve non-email reasoning. The earlier three-case Meta numbers below remain historical and cannot be compared as a controlled before/after experiment against this new dataset.

## New authorized three-case Meta evaluation (2026-10-28)

The opted-in live evaluator ran the **original three-case fixture** once with the current source changes and `muse-spark-1.3`, saving a replayable schema-v2 artifact at the Git-ignored `data/ai_core_live_evaluation_post_07c_20261028.json`. The run was made with uncommitted local code after HEAD `6e4a0cb`; the artifact's `commit_sha` alone does not fully identify its source state. A later local edit changed only the text of a read-edge support reason, not the classifier decisions. No key value was found in the saved artifact. Replay completed without another model request.

| Macro metric | Raw existence-gated claims | Final source-supported claims |
| --- | ---: | ---: |
| Strict impact precision | 0.274 | 0.690 |
| Strict impact recall | 0.579 | 0.746 |
| Strict impact F1 | 0.363 | 0.714 |
| Direct recall | 0.917 | 0.917 |
| Indirect recall | 0.111 | 0.444 |

Hybrid retrieval Recall@8 was **0.905** versus **0.532** for keyword selection. The final micro strict impact count was **8 true positives, 5 false positives, 4 false negatives** (precision **0.615**, recall **0.667**, F1 **0.640**). The existence gate accepted **30/30** raw claims, which represent **25** unique file/type pairs; **18/25** unique raw pairs were outside the manual labels. Mean analysis latency was **47.9 s** (p50 **46.2 s**, p95 **54.5 s**). The provider reported **78,870** total tokens across the three analysis pipelines; this excludes any billing details and is not a price estimate. These results are one stochastic pass on three cases, and should not be called a production accuracy estimate or a controlled comparison with the older live run.

Updated 2026-10-28. This document records separate offline demo and authorized Meta Model API runs. The [labeled dataset](../services/api/tests/evaluation/ai_core_cases.json) has three manually reviewed requirements over the checked-in `examples/sample-repository` (14 indexed files on this Windows run). Labels distinguish *retrieval relevance* from *actual impact* and direct from indirect impact. They are a small diagnostic set, not a statistical estimate of production quality.

## SG-AI-07A replayable evaluation (added 2026-10-28)

Schema-v2 evaluation output now includes a `trace` for each scenario. The trace records the requirement and labels; the **actual** interpretation, ranked retrieval paths/scores, full bounded file-summary context and dependency paths passed to impact reasoning; raw model output; accepted and rejected claims; raw and validated completeness suggestions; potential impacts; provider/model; reported token usage; and analysis latency. `scoring_details` beside each trace lists exact true-positive, false-positive, and missed `(file_path, impact_type)` pairs. Evaluation data stays in the Git-ignored `data/` directory. The evaluator does not capture HTTP request headers and masks common credential strings before writing. Traces may still contain repository symbol names and short docstrings, so treat them as local diagnostic data.

The evaluator now scores the retrieval context from the **same orchestrator run** as the impact report. It computes the keyword baseline afterward using that run's interpretation, avoiding the former extra interpretation call. The orchestrator's normal REST/MCP report and database schema are unchanged; trace capture is an optional in-memory evaluation hook.

From the repository root in PowerShell, create a new offline artifact and replay it with no provider call:

```powershell
.\.venv\Scripts\python.exe scripts/evaluate_ai_core.py --mode offline --output data/ai_core_evaluation_sg_ai_07a.json
.\.venv\Scripts\python.exe scripts/replay_ai_core.py --input data/ai_core_evaluation_sg_ai_07a.json
```

The replay command reads saved schema-v2 predictions and labels, recalculates per-case, macro, and micro scores, and prints metric details without printing the full trace. It does not import or instantiate an inference provider. Earlier schema-v1 summary artifacts, including the historical live Meta JSON below, **cannot** be fully replayed: their individual predictions were never saved. They remain unchanged as historical measurements. The new offline run on the same three-case fixture reproduced macro retrieval Recall@8 **0.758**, impact precision/recall/F1 **0.274/0.516/0.343**, and **17/24** raw label-unsupported claims. These figures are from offline demo behavior, not a new Meta evaluation.

Impact precision/recall use distinct file/type pairs as before. In schema v2, `grounding.unsupported_claims` and `unsupported_claim_rate` use **unique accepted file/type predictions**; `raw_unsupported_claims` and `raw_unsupported_claim_rate` retain the historical raw-claim calculation. `unique_accepted_predictions` and `duplicate_accepted_claims` expose the denominator difference. `micro.impact` pools true/false positives and misses across scenarios; `macro.impact` averages per-scenario ratios. Empty denominators produce `null`, not perfect scores. A case whose retrieved paths or interpretation differ from its recorded reasoning input is rejected during replay.

## Run a new evaluation

From the repository root with the existing backend requirements installed:

```powershell
.\.venv\Scripts\python.exe scripts/evaluate_ai_core.py --mode offline --output data/ai_core_evaluation_sg_ai_07a.json
```

The ignored JSON result records dataset version and size, UTC timestamp, current Git SHA, provider and requested model, config, per-case labels/paths/scores, denominators, latency, and reported token usage. `null` means a denominator is zero or the provider supplied no token count; it does not mean zero tokens. The script creates an in-memory SQLite index and does not modify the sample repository.

For a **billable** live run, put an authorized `META_AI_API_KEY` in the root Git-ignored `.env` (or use an environment variable) and run `scripts/evaluate_ai_core.py --mode live --allow-paid-request --output data/ai_core_live_evaluation_sg_ai_07a.json` only with fresh approval. Use a new filename to preserve the historical live artifact. The opt-in `test_live_meta_smoke.py::test_real_meta_full_pipeline` and the historical evaluation both passed on 2026-10-27. That live run used the 6,000-token completion limit introduced locally after the initial 3,000-token smoke reached `finish_reason=length`. Its recorded Git SHA (`ae2ce19`) identifies the starting HEAD, not the then-uncommitted token-limit patch; the finalized branch includes that patch.

## Observed live Meta result

One authorized `meta_model_api` run with reported model `muse-spark-1.3`, three cases, one pass per case, no retry. The exact local JSON is Git-ignored. Values below are rounded only for display.

| Metric | Keyword selection baseline | Hybrid retrieval / live analysis |
| --- | ---: | ---: |
| Macro Precision@8 | 0.292 | 0.458 |
| Macro Recall@8 | 0.532 | 0.758 |
| Macro MRR@8 | 0.344 | 0.833 |
| Mean retrieval latency | 0.249 ms | 14.809 ms |
| Mean impact precision / recall / F1 | — | 0.197 / 0.516 / 0.282 |
| Mean direct / indirect recall | — | 0.833 / 0.111 |
| Invalid file / symbol claims | — | 0/38 / 0/38 |
| Accepted impact claims unsupported by labels | — | 27/38 (0.711) |
| Mean full-analysis latency | — | 42.637 s |
| Mean context reduction vs all indexed **file summaries** | — | 6.4% |
| Analysis-pipeline model-reported tokens, three cases | — | 67,044 total |

The token total sums the per-case `reported_token_usage` fields from the analysis pipeline only. The evaluator also makes a separate interpretation call per case to choose retrieval keywords; those three calls are excluded, so **67,044 is a lower bound on model-reported usage for this evaluation**, not a billing total. Per-case analysis totals were 25,366, 20,158, and 21,520 tokens. Zero invalid file/symbol references means the existence gate accepted the claims; it does not establish causal correctness. In fact, 27 of 38 raw accepted impact claims did not match the manual file/type labels. The F1 and recall figures are macro case metrics based on distinct `(file_path, impact_type)` pairs, so their denominators differ from the raw claim count. Live indirect recall was especially weak; expand labels and fixtures before generalizing.

## Observed offline result

One run on 2026-10-27, branch `ai/evidence-grounding-v2`, before this workstream's final commit. The JSON file contains the exact input SHA. These numbers have only three cases and timing is a single in-process sample per case.

| Metric | Previous keyword selection | Hybrid retrieval / offline analysis |
| --- | ---: | ---: |
| Macro Precision@8 | 0.292 | 0.458 |
| Macro Recall@8 | 0.532 | 0.758 |
| Macro MRR@8 | 0.344 | 0.833 |
| Mean retrieval latency | about 0.08 ms | about 3 ms |
| Mean impact precision / recall / F1 | — | 0.274 / 0.516 / 0.343 |
| Mean direct / indirect recall | — | 0.500 / 0.444 |
| File hallucination / invalid symbol rate | — | 0/24 / 0/24 raw claims |
| Impact claims unsupported by manual labels | — | 17/24 (0.708) |
| Mean analysis latency | — | about 0.01 s |
| Mean context reduction vs all indexed **file summaries** | — | 4.5% |
| Model-reported token usage | — | unavailable (offline demo) |

The keyword baseline reproduces the pre-SG-AI-03 rule: match interpretation keywords against paths or symbol names, plus the unconditional first-eight-file fallback. Both methods use the same interpreted keywords, labeled cases, index, and K=8. Precision@K divides hits by K; Recall@K divides by the count of relevant labels; MRR is the reciprocal rank of the first relevant file. Empty denominators become `null`. Impact metrics compare `(file_path, impact_type)` pairs to manual labels. The unsupported-claim rate counts validator-accepted file/type pairs absent from those labels; it is **not** a model-reported confidence score. The validator verifies existence, not causal impact.

Context reduction compares approximate character counts of selected JSON file summaries with summaries of all indexed files, not raw source code or actual billed prompt tokens. The selected summaries include ranking metadata, so this benchmark does not support the old 78% token reduction claim. Retrieval improves recall on this fixture but costs more CPU than the simple baseline. Offline impact reasoning performs poorly on the two requirements outside its original email-change demo; do not present it as live model performance. The offline run did not measure cache throughput, Redis behavior, or paid-model latency; live latency appears above.
