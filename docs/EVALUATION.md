# ScopeGraph AI Core evaluation

Updated 2026-10-27. This document records separate offline demo and authorized Meta Model API runs. The [labeled dataset](../services/api/tests/evaluation/ai_core_cases.json) has three manually reviewed requirements over the checked-in `examples/sample-repository` (14 indexed files on this Windows run). Labels distinguish *retrieval relevance* from *actual impact* and direct from indirect impact. They are a small diagnostic set, not a statistical estimate of production quality.

## Reproduce

From the repository root with the existing backend requirements installed:

```powershell
.\.venv\Scripts\python.exe scripts/evaluate_ai_core.py --mode offline --output data/ai_core_evaluation.json
```

The ignored JSON result records dataset version and size, UTC timestamp, current Git SHA, provider and requested model, config, per-case labels/paths/scores, denominators, latency, and reported token usage. `null` means a denominator is zero or the provider supplied no token count; it does not mean zero tokens. The script creates an in-memory SQLite index and does not modify the sample repository.

For a **billable** live run, put an authorized `META_AI_API_KEY` in the root Git-ignored `.env` (or use an environment variable) and run `scripts/evaluate_ai_core.py --mode live --allow-paid-request --output data/ai_core_live_evaluation.json`. Live results use a separate ignored output path. The opt-in `test_live_meta_smoke.py::test_real_meta_full_pipeline` and this evaluation both passed on 2026-10-27. The live run used the 6,000-token completion limit introduced locally after the initial 3,000-token smoke reached `finish_reason=length`. Its recorded Git SHA (`ae2ce19`) identifies the starting HEAD, not the then-uncommitted token-limit patch; the finalized branch includes that patch.

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
