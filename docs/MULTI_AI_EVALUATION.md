# Multi-AI offline development evaluation

Date: 2026-10-29. **This is a routing and replay comparison using deterministic local providers. It is not a Baseten, Modal or Meta model-quality comparison.** The official partner deployments and credentials were not used, and no paid request was made.

## Design and identities

Both arms use `services/api/tests/evaluation/ai_core_cases_v3.json`: dataset `2026-10-28-ai-assisted-v3`, 17 requirements, 25 direct and 10 indirect labels, repository snapshot identifier `f413b0b90d6157d5493a5603fb1245a7f4681eb6`. Dataset SHA-256: `d40728b3225ac7f366c239256c1e320491dbf5e65b3f85884762ffe5cd60f497`. Both runs used code commit `006e79a68edd2dd78fe462734cd98d4962f3b687` and indexed 14 files. The v3 fixture has **no snapshot manifest**. The evaluator records the SHA-256 digest of actual selected source bytes (`09fb310f523774d9a02a48266bf3d5aab3a5e304dc57c84494578445e1d842d4`) and builds a fresh in-memory index for each arm; equal observed digests verify the two arms used identical local source bytes, but do **not** independently verify that those bytes equal the upstream snapshot SHA. The labels are AI-assisted and have no independent human sign-off.

| Arm | Profile and execution | Impact predictions |
| --- | --- | --- |
| A | `meta_only`, `OfflineDemoProvider` for all four text stages | Deterministic offline matcher |
| B | `multi_ai_mock`, separate local scripted instances for Meta, Modal and Baseten stage identities; text cases skip Vision | The **same** deterministic offline matcher |

The retained raw predictions, labels, actual interpretation, retrieved context, validated claims and per-stage traces are in ignored local artifacts `data/multi_ai_meta_only_v3.json` and `data/multi_ai_mock_v3.json`. Replays use only these saved traces and no provider. Baseten Vision is not exercised by this text-only 17-case comparison; its request shape/schema and screenshot orchestration are covered by mocked HTTP and local browser tests. Vision correctness, hallucinated UI details, missing elements and uncertainty quality cannot be estimated for a real Baseten model from these artifacts.

## Results

| Metric | A: Meta-only offline | B: Multi-AI mock | Denominator / interpretation |
| --- | ---: | ---: | --- |
| Strict impact precision | 0.308 | 0.308 | 20 true positives / 65 unique supported predictions |
| Strict impact recall | 0.571 | 0.571 | 20 / 35 impact labels |
| Strict impact F1 | 0.400 | 0.400 | Harmonic mean of micro precision and recall |
| Direct recall | 0.600 | 0.600 | 15 / 25 direct labels |
| Indirect recall | 0.500 | 0.500 | 5 / 10 indirect labels |
| Strict false positives / negatives | 45 / 15 | 45 / 15 | Provisional AI-assisted labels |
| Hybrid retrieval macro Recall@8 | 0.956 | 0.956 | Per-case macro mean |
| Hybrid retrieval macro Precision@8 | 0.331 | 0.331 | Per-case macro mean |
| Hybrid retrieval macro MRR | 0.778 | 0.778 | Per-case macro mean |
| Model requests | 0 | 0 | Four deterministic local text stage calls per case; no HTTP inference |
| Fallbacks / provider errors | 0 / 0 | 0 / 0 | Tested failure/fallback paths separately with mocks |

The exact equality is expected: the mock Multi-AI arm deliberately reuses `OfflineDemoProvider` behavior. It demonstrates compatible stage routing and deterministic replay, **not** a quality improvement. Per-stage wall-clock values are local test timings, unsuitable for estimating cloud latency or cost. No provider reported billable usage or actual cost. The existing offline matcher still produces 45 strict false positives on this provisional fixture; routing alone does not address the SG-AI-10 accuracy findings.

## Reproduction and limitations

Run the four evaluation/replay commands in [integration instructions](MULTI_AI_INTEGRATION.md#reproduce-without-network-inference). Confirm both artifacts report the same dataset SHA, observed source-tree SHA, repository snapshot identifier and labels. The replayed micro metrics must equal the saved micro metrics. The `--mock-multi-ai` CLI rejects holdout dataset paths to avoid using the provisional RealWorld holdout for development comparisons.

Live Baseten/Modal request validity, actual served model IDs, latency distributions, token/cost usage, vision accuracy, provider failure rates and cross-provider quality deltas remain unverified. The 17-case authentication fixture is too small and narrow to establish generalization. A live comparison would require separately approved credentials, deployments, destination review and request budget; it must not tune against the holdout.
