# ScopeGraph AI Core evaluation

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
| Strict impact precision | — | — | 0.170 | 0.263 |
| Strict impact recall | — | — | 0.453 | 0.247 |
| Strict impact F1 | — | — | 0.240 | 0.264 |
| Direct recall | — | — | 0.427 | 0.365 |
| Indirect recall | — | — | 0.458 | **0.021** |
| File-only precision / recall / F1 | — | — | — | 0.292 / 0.263 / 0.286 |

Strict metrics compare distinct `(file_path, impact_type)` pairs. The final micro strict score is **12 true positives, 33 false positives, 29 false negatives**, yielding precision **0.267**, recall **0.293**, and F1 **0.279**. Macro impact metrics average the 16 cases with nonempty gold impact labels; the empty billing case has `null` impact precision/recall and contributes no false positive from the offline provider. Macro retrieval precision includes that case; its recall is `null` and excluded from macro recall. Precision@8 always uses K=8 as denominator. The 17-case source review contains 41 labeled file/type pairs, including 15 indirect pairs.

Of **111** raw offline claims, all 111 passed file/symbol existence checks, but **91** unique claims fell outside the manual file/type labels (unsupported-label rate **0.820**). This is a label comparison, not proof those 91 claims are false. The causal gate reduced confirmed claims, raising macro precision, but cut macro indirect recall from **0.458 to 0.021** and direct recall from **0.427 to 0.365**. **The required quality gate is not met.** Confirmed impact still has 33 micro false positives. The static gate's `supported` label means a source symbol/reason match or a concrete call edge was found; it does not establish runtime causality or a calibrated probability. Potential-impact coverage of gold file/type pairs was **0.206** macro. The deterministic offline provider remains heavily tailored to email-related prompts, so its impact results are a poor proxy for Muse Spark.

Mean hybrid retrieval latency was **16.4 ms** in this single local run versus **17.2 ms** for the simple keyword baseline; these tiny timing differences are not stable benchmarks. Mean full-analysis latency was **0.035 s**, p50 **0.034 s**, p95 **0.045 s** over 17 offline scenarios. The context reduction estimate against all raw sample source characters was **12.8%**. Against the older symbol-summary baseline it was **−41.7%** because the new context includes bounded source snippets and signatures; neither character proxy is actual billed tokens. The offline provider reported no token usage, and inference cost was not measured. Explanation fields passed structural tests, but factual consistency, readability, and usefulness need independent human review; no LLM judge score was used.

The next quality work should audit the 91 label-mismatched raw claims and the lost indirect cases with a second reviewer, broaden repositories and no-impact scenarios, improve non-email reasoning, and refine the static support gate before a new authorized live evaluation. The earlier three-case Meta numbers below remain historical and cannot be compared as a controlled before/after experiment against this new dataset.

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
