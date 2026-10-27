# ScopeGraph AI Core evaluation

Updated 2026-10-27. These are **offline demo** results, not Meta Model API results. The [labeled dataset](../services/api/tests/evaluation/ai_core_cases.json) has three manually reviewed requirements over the checked-in `examples/sample-repository` (14 indexed files on this Windows run). Labels distinguish *retrieval relevance* from *actual impact* and direct from indirect impact. They are a small diagnostic set, not a statistical estimate of production quality.

## Reproduce

From the repository root with the existing backend requirements installed:

```powershell
.\.venv\Scripts\python.exe scripts/evaluate_ai_core.py --mode offline --output data/ai_core_evaluation.json
```

The ignored JSON result records dataset version and size, UTC timestamp, current Git SHA, provider and requested model, config, per-case labels/paths/scores, denominators, latency, and reported token usage. `null` means a denominator is zero or the provider supplied no token count; it does not mean zero tokens. The script creates an in-memory SQLite index and does not modify the sample repository.

For the **approved, billable** live run, put an authorized `META_AI_API_KEY` in the root Git-ignored `.env` (or use an environment variable) and add `--mode live --allow-paid-request`. Live results go to a separate output path; never combine them with offline results. The live run and `test_live_meta_smoke.py` have not been executed because the key has not yet been supplied locally.

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

Context reduction compares approximate character counts of selected JSON file summaries with summaries of all indexed files, not raw source code or actual billed prompt tokens. The selected summaries include ranking metadata, so this benchmark does not support the old 78% token reduction claim. Retrieval improves recall on this fixture but costs more CPU than the simple baseline. Offline impact reasoning performs poorly on the two requirements outside its original email-change demo; do not present it as live model performance. No cache throughput, Redis behavior, or paid-model latency was measured here.
