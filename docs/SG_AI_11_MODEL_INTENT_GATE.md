# SG-AI-11 — model edit intent gate

Date: 2026-10-30. Scope: the first narrow SG-AI-11 correction to causal support. The [SG-AI-10 audit](SG_AI_10_FALSE_POSITIVE_ANALYSIS.md) found repeated false positives where a model class or existing field was promoted to a confirmed direct edit solely because a requirement mentioned the same domain word. This change leaves those claims visible as `potential` unless the requirement explicitly concerns a model, schema, field, persistence, uniqueness or related data constraint.

## Implementation and test

`services/api/app/analysis/causal.py` now checks model edit intent before the existing symbol/reason support rule. It uses indexed symbol type and repository path, not the model's rationale alone, to identify model claims. A behavior-only request does not prove an existing model needs editing. A request explicitly adding a persisted field still permits the ordinary source-evidence gate. There is no change to `EvidenceValidator`, retrieval, graph construction, provider prompts, gold labels, frontend or holdout.

The synthetic regression in `services/api/tests/test_causal_impact.py` uses a neutral `Ticket` model. It first failed because “Close a ticket after payment” was incorrectly confirmed as a model edit. It now stays potential, as does “Restore a ticket after payment”; the latter prevents substring matching of `store` inside `restore`. “Add a persisted closure reason field to the Ticket model” remains a supported direct target. Existing causal tests still cover real setting reads and downstream calls.

## Paired offline development replay

Both arms used the unchanged `ai_core_cases_v3.json`: dataset `2026-10-28-ai-assisted-v3`, **17 cases, 25 direct and 10 indirect labels**, claimed repository snapshot `f413b0b90d6157d5493a5603fb1245a7f4681eb6`. Fixture SHA-256 `d40728b3225ac7f366c239256c1e320491dbf5e65b3f85884762ffe5cd60f497`; observed local source-tree SHA-256 `09fb310f523774d9a02a48266bf3d5aab3a5e304dc57c84494578445e1d842d4`. As noted in [Multi-AI evaluation](MULTI_AI_EVALUATION.md), v3 has no source manifest, so this digest proves the same local bytes were used in both arms but does not independently authenticate the upstream snapshot commit.

| Strict micro metric | Baseline | Model gate | Change |
| --- | ---: | ---: | ---: |
| True positives | 20 | 20 | 0 |
| False positives | 45 | 31 | −14 |
| False negatives | 15 | 15 | 0 |
| Precision | 0.308 | 0.392 | +0.084 |
| Recall | 0.571 | 0.571 | 0 |
| F1 | 0.400 | 0.465 | +0.065 |
| Direct / indirect recall | 0.600 / 0.500 | 0.600 / 0.500 | 0 / 0 |
| Potential claims | 48 | 62 | +14 |

The 14 demotions are 12 direct `app/models/verification_token.py` pairs across behavior-only scenarios and two dependent `tests/test_verification.py` indirect pairs in `email_confirmation` and `access_token_setting`. No new false-positive pair was added; retrieval micro Recall@8 and both dataset/source digests matched. Raw existence-validated predictions remain 111. These results measure the deterministic offline demo and provisional AI-assisted labels, not Meta or partner accuracy. The fixture is too small and auth-focused to estimate generalization.

Artifacts are saved locally in ignored `data/sg_ai_11_baseline.json` and `data/sg_ai_11_model_gate_final.json`. Reproduce from the repository root with `META_AI_PROVIDER=offline_demo`, `META_AI_API_KEY=''` and `AI_PROVIDER_PROFILE=meta_only`:

```powershell
$env:PYTHONPATH='services/api'
.\.venv\Scripts\python.exe scripts/evaluate_ai_core.py --mode offline --dataset services/api/tests/evaluation/ai_core_cases_v3.json --output data/sg_ai_11_model_gate_final.json
.\.venv\Scripts\python.exe scripts/replay_ai_core.py --input data/sg_ai_11_model_gate_final.json
```

To reproduce the baseline score after this code change, use the saved baseline artifact rather than rerunning evaluation on new code. Both saved artifacts replay without inference. No holdout case was used to choose the rule or assess the delta.

The targeted causal tests passed (3 passed). The full backend suite passed with **211 passed, 1 opt-in live test skipped** on 2026-10-31 using the offline provider. A direct replay comparison matched all 17 cases, micro and macro scores, and per-case scoring details. No paid request was made.

## Limits and next work

This gate is conservative but lexical. A behavior request can imply a necessary migration without saying “schema” or “field”; in that case the model claim becomes potential until reviewed. It cannot determine whether an existing field already satisfies a future design. The remaining **31** strict false-positive pairs include service, API and downstream call claims; the SG-AI-10 plan's operation-specific direct support, behavior-specific call checks and offline provider improvements remain open. Any next change must preserve direct and indirect recall on the development fixture and use independent synthetic regressions. Keep the RealWorld holdout out of tuning.
