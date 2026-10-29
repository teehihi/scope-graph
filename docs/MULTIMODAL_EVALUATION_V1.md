# SG-AI-18 synthetic screenshot evaluation v1

Run date: 2026-10-29. **This is an offline, scripted-visual-intent diagnostic, not a Muse Spark vision benchmark.** The evaluator does not inspect pixels to produce intent. It verifies each image's SHA-256, then looks up an authored `StructuredVisualIntent` and runs the existing evidence-grounded orchestrator. It makes no network or paid inference call.

## Dataset and provenance

- Fixture: [multimodal_cases_v1.json](../services/api/tests/evaluation/multimodal_cases_v1.json), version `2026-10-29-synthetic-v1`, SHA-256 `74ff34a3be2bc29cdf2a5a5a2e36c519d7a6b4c1b8ee9aff26e9d99afa286071`.
- Six original synthetic 960×560 PNG screenshots, generated locally by [generate_multimodal_fixture.ps1](../scripts/generate_multimodal_fixture.ps1). No third-party screenshot or private user repository data is included. Visual concepts and visual intents are AI-authored fixture data; human visual review is pending.
- Source repository: `examples/sample-repository`, pinned commit `f413b0b90d6157d5493a5603fb1245a7f4681eb6`. The 14-file source inventory and hashes are in [multimodal_snapshot_manifest_v1.json](../services/api/tests/evaluation/multimodal_snapshot_manifest_v1.json), tree SHA-256 `df4ae5819afd5c8572f4975961c9e081aa97a6e3a9975da1a98eebeea7ab66bc`.
- Requirements, retrieval labels, 8 direct and 5 indirect labels, and source-line rationales are copied unchanged from [AI Core v3](../services/api/tests/evaluation/ai_core_cases_v3.json). The v3 review is AI-assisted and **has no independent human sign-off**. The six-case subset is reused from the development sample, not the separate RealWorld holdout.
- Evaluation code commit: `033cede3e8c2b966397296c289b75ae5f930a82e`; the working tree was clean at the recorded run. Saved predictions are local at Git-ignored `data/multimodal_evaluation_v1.json`.

| Scenario | Image SHA-256 | Relationship | Source evidence for impact labels |
| --- | --- | --- | --- |
| `email_confirmation` | `e63ab13ea4f9b56ded558fdd6b1a73e18e002f25eb92ce87fa5881e140ac071a` | Clear account email page | `app/api/users.py:27`, `app/services/user_service.py:31`, `app/api/verification.py:20`, `app/services/notification_service.py:15`, `tests/test_users.py:24` |
| `password_hashing` | `41c38af3e30ebc3bf0afbe110a113e4ed0513750fa009ece70e26277539b8c7d` | Clear sign-in page | `app/core/security.py:6`, `tests/test_auth.py:5` |
| `token_expiry` | `f9b60c3077b19f6b82cab149b0956bac202965d931798987456fe2283132ad6f` | Ambiguous verification notice | `app/core/config.py:7`, `app/services/verification_service.py:10`, `tests/test_verification.py:18` |
| `smtp_host` | `d410250ca519075f9fe3a3d100559c98aadd7279d18a2c52349e1333f565e2e8` | Irrelevant project board | `app/core/config.py:8`, `app/services/notification_service.py:12` |
| `profile_response` | `23dae4037e8115ab6affd52058ee5bc63aa29fcfebbcc75d3d8c2973a2410487` | Password-reset page conflicts with profile requirement | `app/api/users.py:10` |
| `billing_negative` | `9e2cd8d4487e059d6865b9cce1434f61bdf2bf0a552c4c41e2678f004023700e` | Invoice page; no matching source | Empty impact/retrieval labels; sample contains no billing implementation. |

## Method

For each case, the runner indexes the same pinned sample once and executes the **same requirement** twice: A uses `OfflineDemoProvider` with no image; B uses the same text methods plus a `fixture_mock` visual response keyed by the validated image hash. Both follow the same retriever, graph, evidence and causal gates. Retrieval scores use the first 8 ranked paths; impact scores use unique `(file_path, impact_type)` pairs in final `affected_items`. A reported “unsupported impact claim” is a prediction outside the provisional gold labels, **not** necessarily a nonexistent source file or a proven wrong edit. The negative case has undefined recall when gold is empty. Macro metrics omit undefined ratios; micro metrics pool case counts.

The reported visual concept agreement compares scripted `functional_concepts` with authored expected concepts. It validates scoring and shows one deliberate overreach (`token expiry` is absent from the visible notice); it does **not** measure image recognition accuracy. The offline provider reports no tokens. No price estimate for live Muse Spark is inferred; actual paid inference cost for this run was **$0**.

## Paired results

| Metric | A: text only | B: screenshot + scripted intent |
| --- | ---: | ---: |
| Micro retrieval precision@8 | 0.313 | 0.333 |
| Micro retrieval recall@8 | 0.789 (15/19) | 0.842 (16/19) |
| Macro retrieval recall@8 | 0.858 | 0.925 |
| Micro impact precision / recall / F1 | 0.345 / 0.769 / 0.476 | 0.370 / 0.769 / 0.500 |
| Direct / indirect recall | 0.750 / 0.800 | 0.750 / 0.800 |
| Impact TP / FP / FN | 10 / 19 / 3 | 10 / 17 / 3 |
| Mean local analysis latency | 18.6 ms | 18.8 ms |
| Model-reported tokens | unavailable | unavailable |

Scripted visual concept agreement was macro precision **0.944**, recall **1.000**; these values reflect the authored fixture mapping. Local latency excludes real image inference and is not a prediction of live latency. The small timing difference is noise at this sample size.

| Case | Retrieval hits A → B | Impact TP/FP/FN A → B | Visual retrieval status |
| --- | ---: | --- | --- |
| `email_confirmation` | 5/8 → 5/8 | 3/4/2 → 3/4/2 | `active` |
| `password_hashing` | 2/3 → 3/3 | 2/4/0 → 2/4/0 | `active` |
| `token_expiry` | 4/4 → 4/4 | 2/4/1 → 2/3/1 | `active` |
| `smtp_host` | 2/2 → 2/2 | 2/4/0 → 2/4/0 | `unanchored` |
| `profile_response` | 2/2 → 2/2 | 1/3/0 → 1/2/0 | `active` |
| `billing_negative` | 0/0 → 0/0 | 0/0/0 → 0/0/0 | `no_index_match` |

## Failure examples and interpretation

- `password_hashing`: the sign-in intent adds `app/api/auth.py` to the top-eight retrieval context, producing the only extra retrieval hit. Both modes still retain four claims outside the source labels. Better retrieval did not increase impact recall.
- `email_confirmation`: both modes miss the direct `app/api/verification.py` and indirect `app/services/notification_service.py` labels, while reporting four other file/type pairs outside the provisional labels. The image does not repair the indirect-dependency gap.
- `token_expiry`: the ambiguous screenshot does not display a duration. The scripted intent nevertheless says `token expiry`, causing visual concept precision 2/3. Both modes miss `app/core/config.py` as a supported direct impact; screenshot context removes one `app/api/users.py` claim outside labels but not the miss.
- `profile_response`: the password-reset screenshot conflicts with the profile-response request. The lexical anchor still activates visual hints because both mention email. One outside-label claim disappears, but this is not evidence that conflict handling is semantically reliable.
- `smtp_host`: the project-board image is suppressed as `unanchored`; the clear text requirement controls retrieval. `billing_negative` returns no indexed billing context or supported impact even though its synthetic screenshot shows invoices.

## Reproduce and verify

From the repository root, with the existing `.venv` and no API key required:

```powershell
$env:PYTHONPATH='services/api'
$env:META_AI_PROVIDER='offline_demo'
$env:META_AI_API_KEY=''
$env:MODEL_API_KEY=''
.\.venv\Scripts\python.exe -m pytest services/api/tests/test_multimodal_evaluation.py -q
.\.venv\Scripts\python.exe scripts/evaluate_multimodal.py --output data/multimodal_evaluation_v1.json
.\.venv\Scripts\python.exe scripts/evaluate_multimodal.py --replay data/multimodal_evaluation_v1.json
```

`validate_fixture` checks all image hashes and PNG structure, source inventory/hash against the pinned commit, exact inheritance of v3 labels, label uniqueness, source paths and annotation line bounds. Replay recalculates per-case and aggregate metrics from saved paths and predictions without opening images or invoking a provider. Regenerate the original images on Windows with `scripts/generate_multimodal_fixture.ps1`; rebuild the fixture and source manifest with `scripts/build_multimodal_fixture.py`. Review any resulting hash change before replacing the pinned dataset.

## Limits and next gate

Six synthetic pages over one tiny Python backend cannot establish real screenshot understanding, improvement on an independent repository, production latency, cost or generalization. The visual response is scripted from the fixture; the screenshot is used for identity validation, not pixel inference. Existing v3 source labels and the new visual concepts need independent human review before a frozen benchmark. A live Muse Spark vision comparison requires separate explicit authorization and should use rights-cleared, reviewed screenshots without tuning on the final RealWorld holdout. No frontend upload or public backend route was added.
