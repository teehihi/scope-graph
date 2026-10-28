# SG-AI-07 — Investigation of low impact analysis accuracy

Status: **Analysis complete; implementation subsequently approved**
Date: 2026-10-27
Scope: three labeled scenarios in `examples/sample-repository`, the saved offline and Meta evaluation artifacts, and the current indexing, retrieval, graph, reasoning, and evidence code. This investigation made no paid API calls and changed no application code.

## Executive finding

The reported Meta scores are arithmetically consistent with the saved per-case summaries: macro impact precision **0.197**, recall **0.516**, F1 **0.282**, direct recall **0.833**, and indirect recall **0.111**. All 38 raw impact claims passed the file/symbol existence gate, while 27 did not match the manual `(file_path, impact_type)` labels. Existence is not evidence that a change affects a file.

The clearest implementation causes are thin retrieval context, a validation gate that does not verify causal impact, and a completeness pass whose suggestions remain potential impacts. The indexer also has a proven global-name resolution defect, but the 14-file evaluation fixture has no duplicate indexed symbol names; that defect cannot be assigned a share of this live result. The saved Meta artifact omits individual predictions and the actual orchestrator context, so individual live false positives and their model-versus-context causes cannot be reconstructed.

## Evidence and reproduction without paid requests

Sources inspected:

- `data/ai_core_live_evaluation.json` and `data/ai_core_evaluation.json` — existing, Git-ignored local outputs; neither contains raw impact items.
- [`EVALUATION.md`](EVALUATION.md), [`AI_CORE_PLAN_AND_PROGRESS.md`](AI_CORE_PLAN_AND_PROGRESS.md), and [`ai_core_cases.json`](../services/api/tests/evaluation/ai_core_cases.json).
- [`evaluation.py`](../services/api/app/analysis/evaluation.py), [`evaluate_ai_core.py`](../scripts/evaluate_ai_core.py), [`retriever.py`](../services/api/app/analysis/retriever.py), [`orchestrator.py`](../services/api/app/analysis/orchestrator.py), [`provider.py`](../services/api/app/ai/provider.py), [`validator.py`](../services/api/app/evidence/validator.py), [`parser.py`](../services/api/app/indexing/parser.py), [`indexing/engine.py`](../services/api/app/indexing/engine.py), and [`graph/engine.py`](../services/api/app/graph/engine.py).

I recalculated the macro averages and raw unsupported count from the saved JSON in memory. I also rebuilt the sample index in SQLite `:memory:` using the existing indexer: **14 files, 32 symbols, 28 dependency edges, no parse errors, and no duplicate indexed symbol names**. This procedure reads the sample workspace and does not contact an inference provider. It confirms the current index/graph behavior, not the exact index snapshot or model responses used in the earlier live run.

The saved live artifact identifies Git SHA `ae2ce19`; the live run also used a then-uncommitted 6,000-token completion limit, as recorded in `EVALUATION.md`. The current branch includes that limit. The artifact is therefore a historical run, not a byte-for-byte replay record of the current HEAD.

### Recalculated live results

| Scenario | Gold file/type pairs | Distinct predicted pairs | Correct pairs | False positives | Missed pairs | Raw accepted claims outside labels | Retrieval labels missed in saved top 8 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| `email_confirmation` | 7 | 15 | 5 | 10 | 2 | 11/18 | `tests/test_verification.py` |
| `password_hashing` | 2 | 6 | 1 | 5 | 1 | 6/8 | `app/api/auth.py` |
| `token_expiry` | 3 | 11 | 1 | 10 | 2 | 10/12 | `app/core/config.py` |
| **Total** | **12** | **32** | **7** | **25** | **5** | **27/38** | — |

The aggregate reported metrics are **macro averages of three per-scenario ratios**, not ratios of the total row. The total row would instead yield micro precision `7/32 = 0.219` and micro recall `7/12 = 0.583`. Direct and indirect macro recall are likewise averaged per scenario. The live claim count is 38 but only 32 distinct predicted file/type pairs: six raw claims repeat a pair. Eleven raw accepted claims match labels, versus seven distinct correct pairs. The evaluator's unsupported count therefore cannot be used interchangeably with the number of distinct false positives.

Metric behavior is explicit in [`evaluation.py`](../services/api/app/analysis/evaluation.py): `retrieval_metrics` divides hits by K and label count; `impact_metrics` compares sets of `(file_path, impact_type)`; `grounding_metrics` counts every accepted claim whose file/type pair is absent from labels. A correct file with the wrong direct/indirect type creates both a false positive and a false negative. These formulas have no arithmetic discrepancy in the saved summaries. The artifact does **not** retain the individual pairs needed to independently recalculate impact metrics from first principles.

## Failure analysis by stage

### 1. Ground truth and evaluation

All labeled paths exist in the 14-file index; the evaluator checks this before scoring. The label policy says direct means a likely edit target, indirect means a caller or regression test to inspect, and retrieval relevance is broader than impact. That is a defensible diagnostic convention, but it must be applied consistently and is not a proof that unlisted files are irrelevant.

Concrete ambiguities to adjudicate:

- `tests/test_users.py::test_update_user_email_direct` asserts the old immediate email mutation. Implementing email confirmation would likely require changing that test, although the fixture labels all tests indirect.
- `tests/test_verification.py::test_token_verification_expired` uses a token that expired **one hour ago**; it does not check the requested 30-minute boundary. Its indirect label is reasonable as a regression test to inspect, but a new or edited test is likely needed.
- `app/services/notification_service.py::send_email_changed_alert` is called after the immediate mutation in `UserService.update_user_email`. A new confirmation flow may change when the alert is sent. This file is retrieved in the email case but is not labeled as impact. Whether it belongs in the gold set needs a human decision.
- `app/api/auth.py` imports `hash_password` and `verify_password`, but its dummy endpoint bodies do not call either. Labeling it retrieval-relevant without labeling it impacted is plausible. Its omission from saved top-8 retrieval is still a retrieval miss, not necessarily an impact miss.

[`evaluate_ai_core.py`](../scripts/evaluate_ai_core.py) obtains an interpretation for its retrieval benchmark, then runs `AnalysisOrchestrator`, which obtains **another** interpretation. For live inference these can differ. Consequently, `hybrid_paths` in the saved JSON are the benchmark retrieval paths, not guaranteed to be the context actually supplied to the impact-reasoning call. The JSON also omits raw claims, accepted claim details, rejected claim details, actual retrieval paths, graph paths, completeness suggestions, and model interpretations. It cannot support a path-by-path attribution of the 25 distinct live false positives.

### 2. Indexing and graph construction

The parser indexes Python classes, methods, functions, imports, and calls, but does not index class attributes or references to them. `app/core/config.py::Settings.EMAIL_VERIFICATION_TOKEN_EXPIRE_HOURS` holds the 24-hour setting; `app/services/verification_service.py::VerificationService.create_verification_token` reads it to calculate `expires_at`. The symbol summary does not expose that config field or its use. This is a concrete information gap for `token_expiry`.

Calls through imported instances are recorded in a different form from the indexed method names. For example, `app/api/users.py::update_current_user_email` produces the call name `user_service.update_user_email`, while the indexed method is `UserService.update_user_email`. `app/api/verification.py::confirm_verification_token` similarly produces `verification_service.verify_token`, while the indexed method is `VerificationService.verify_token`. The indexer's exact-name lookup does not resolve those call edges; file-level import edges still connect the modules. Conversely, `tests/test_auth.py::test_password_hashing` directly calls `hash_password` and `verify_password`, and the in-memory index contains the expected call edges to `app/core/security.py`.

The indexer stores symbols in one `symbol_records_by_name` dictionary for the whole repository, overwriting earlier records with the same name. Both source-symbol and target-symbol resolution use this dictionary. ScopeGraph's own `services/api/tests/test_graph.py`, `test_validator.py`, and `test_e2e_analysis.py` each define `test_db`; indexing such files together can attach a symbol ID from the wrong file. A same-named call target can also create a wrong cross-file dependency. **This is a code-level defect and a regression-test target, not an observed cause in the sample evaluation**: the sample index had no duplicate symbol names.

`GraphEngine` correctly traverses persisted edges backward for downstream dependents. The in-memory sample graph gives `app/core/security.py` downstream `app/api/auth.py` and `tests/test_auth.py`; `app/services/verification_service.py` downstream includes `app/api/verification.py`, `app/services/user_service.py`, and `tests/test_verification.py`. The graph therefore contains useful indirect candidates. File-level paths alone do not establish that every dependent needs modification. `networkx.DiGraph` also collapses multiple persisted edges between the same two files into one graph edge, reducing displayed call/import evidence.

### 3. Retrieval and reasoning

Hybrid retrieval uses substring matches in paths, symbol names, signatures, docstrings, and metadata, then adds one-hop graph neighbors. It ranks up to eight files under a context budget. It sends symbol summaries, not source bodies, call sites, or config values. Per-symbol additive scoring can favor files with many broad token matches. A graph-only neighbor gets a low score and can fall outside top K.

In the saved live benchmark, `token_expiry` retrieves `app/services/verification_service.py`, `app/api/verification.py`, and `tests/test_verification.py`, but misses `app/core/config.py`, one of the two direct gold edit targets. It also retrieves `app/core/security.py`, whose `generate_signed_token` uses a separate signed-token mechanism; this is a concrete **retrieval noise** example, not a confirmed live impact prediction. For `password_hashing`, `app/services/verification_service.py` ranks ahead of `app/core/security.py`, while `app/api/auth.py` is absent from top 8. These observations show context quality problems; because of the duplicate interpretation call, they do not prove which context the Meta reasoning call saw.

The live reasoning prompt tells the model to separate direct, indirect, and potential impact, but receives only the thin file summaries and file-level dependency paths. The completeness prompt receives the proposed impact and a list of repository paths, with no source snippets. In the orchestrator, verified completeness suggestions and unused graph neighbors are placed in `potential_impacts`; they are never re-reasoned and promoted to `affected_items`. The impact evaluator scores only `affected_items`. This design helps avoid asserting graph neighbors as certain impact, while leaving a path for missed indirect files to remain unscored potential candidates.

### 4. Evidence validation

`EvidenceValidator` checks that an asserted path and optional symbol resolve within the indexed repository, then attaches a safe source snippet. It does not check whether the snippet supports the model's reason or whether a file is actually affected. The returned `impact_supported` value remains `false`. The 38/38 acceptance rate demonstrates an effective **existence** check on this run, not causal precision. No claim-level live artifact survives to decide which of the 27 label-unsupported claims are model overreach, wrong impact type, plausible unlabelled impact, or duplicate predictions.

## Ranked root causes

| Rank | Cause | Severity | Evidence strength | Expected benefit of a narrow fix |
| --- | --- | --- | --- | --- |
| 1 | Existence-only validation allows plausible but unproven direct/indirect claims | High | Direct code evidence plus 27/38 label-unsupported raw claims | Better precision and honest `potential` classification; must avoid hiding real impacts |
| 2 | Thin source context and missed configuration/call-site facts | High | Direct code and sample-source evidence; saved retrieval miss for `config.py` | Better target selection for token expiry and more specific causal reasons |
| 3 | Completeness candidates are not verified into scored impact | High for indirect recall | Direct orchestrator behavior plus 0.111 macro indirect recall; exact share unknown | Recover justified indirect tests/callers without promoting every graph neighbor |
| 4 | Global symbol-name resolution and unresolved instance-method calls | Medium to high | Direct indexer/parser evidence; global-name collision absent from sample | More accurate dependency graph in broader repositories |
| 5 | Narrow labels, strict type matching, and incomplete saved traces | Medium | Direct fixture/evaluator evidence | Reliable diagnosis and fair comparison; measured score may change after adjudication |

The offline demo's 17/24 unsupported raw claims show that poor impact classification is not unique to the Meta run. The offline provider is tailored to email-change examples, so its scores are not an estimate of Meta behavior.

## Proposed implementation plan — pending approval

1. **P0: Make evaluations replayable.** Save each case's raw and validated claim list, file/type pair, interpretation, actual orchestrator retrieval paths, graph paths, completeness output, and scoring explanation in an ignored, redacted evaluation artifact. Add a no-inference replay/scoring command. Do not persist API keys or authorization headers.
2. **P0: Adjudicate labels before optimizing to them.** Record a source-backed reason for each direct, indirect, and retrieval-relevant label. Resolve the notification/test ambiguities, add file-only metrics beside strict file/type metrics, and expand the frozen fixture beyond three scenarios, including negative and cross-module cases.
3. **P1: Fix edge resolution.** Resolve symbols within module/import scope, account for aliases and instance methods where static evidence permits, and leave uncertain calls unresolved. Preserve multiple underlying edge records/evidence even if the traversal graph remains file-level.
4. **P1: Improve bounded context.** Index or extract referenced config attributes and concise call-site snippets; prioritize the actual setting, function, test, and dependency path relevant to a requirement. Keep strict source-path sandboxing and token limits.
5. **P2: Separate demonstrated impact from candidates.** Deduplicate claims; require a source-backed explanation for direct and indirect impact. Review completeness suggestions against retrieved source/graph evidence, then either promote them with a reason or retain them as potential. Avoid treating every graph edge as causal proof.

### Required regression tests and acceptance criteria

- **Evaluation:** deterministic replay reproduces all published per-case and macro metrics from saved claims, reports duplicate raw claims separately, and distinguishes file-only from file/type matches. The benchmark and orchestrator use the same recorded interpretation when comparing retrieval to impact.
- **Labels:** every gold item has a source reference and reviewer rationale; all paths resolve in the checked-in fixture. Cases cover config constants, instance-method calls, same-named symbols, unrelated token mechanisms, downstream tests, and absent impact.
- **Index/graph:** same-named functions in different modules never attach a source/target symbol ID belonging to another file; imported instance calls resolve only when supported; unresolved calls create no speculative edge. Existing sample import and direct-call edges remain correct.
- **Retrieval:** the `token_expiry` context includes the 24-hour config field and its use in `VerificationService.create_verification_token`; password hashing context retains `security.py::hash_password`, `verify_password`, and `tests/test_auth.py`. Top-K and context-budget limits continue to hold.
- **Impact/validation:** a real indexed path alone cannot set `impact_supported=true`; duplicate claims do not inflate counts; completeness suggestions enter confirmed impact only after causal review. Replayed known unsupported claims remain visible as rejected or potential with an explicit reason.
- **Quality gate:** compare the same frozen, adjudicated cases before and after change; require improved strict precision **and** indirect recall without loss of direct recall or an increase in nonexistent-file/symbol claims. Use a larger holdout fixture before setting a production quality threshold. Any new live run remains separately authorized because it is billable.

## Risks, compatibility, and limits

- Correcting edge resolution can change dependency graphs and cached analysis results. Reindex/version caches when the edge semantics change; preserve current REST/MCP response contracts where possible.
- More source context can raise prompt tokens, latency, and cost. Bound snippets and measure actual model-reported usage, not only JSON character estimates.
- A stricter impact gate can improve precision while suppressing real indirect effects. Keep a visible potential category and measure recall alongside precision.
- Revising labels can change reported scores without changing the model. Publish old and revised scores with dataset versions.
- Three scenarios from one Python sample, one live pass per case, and no raw live claim trace cannot establish production accuracy, model variance, the exact identity of live false-positive files, or how much each stage contributed to the 27/38 count. The sample has no same-named symbol collision, so the identified collision bug does not explain this particular sample by itself.

**Later status:** implementation was authorized after this investigation. See [AI_CORE_PLAN_AND_PROGRESS.md](AI_CORE_PLAN_AND_PROGRESS.md) for the current workstream state. A new paid evaluation still requires explicit opt-in.
