# AI Core response contract for frontend consumers

Updated 2026-10-28. This describes additive fields in the existing analysis report. No frontend source changed. `POST /api/v1/repositories/{id}/analyze` with `run_sync: true` returns `{analysis_id, status, result, brief}`; `GET /api/v1/analyses/{id}/report` returns `result` directly. MCP `analyze_change` wraps the same `result` in `{status, analysis_id, result, brief}`.

## Report fields

| Field | Shape | Meaning |
| --- | --- | --- |
| `requirement_summary` | string | Submitted requirement, unchanged. |
| `interpretation` | object | Provider interpretation; treat semantic statements as model output. |
| `affected_items` | array of impact items | Source-supported direct or indirect candidates. Static evidence supports the relation; runtime behavior remains unproven. |
| `potential_impacts` | array of impact items | Unconfirmed model claims, graph neighbors, and completeness suggestions. Never present as confirmed impact. |
| `affected_functional_areas` | string[] | Names derived from supported symbols. Empty when none are supported. |
| `risks`, `suggested_tests`, `assumptions` | string[] | Existing provider output; suggestions, not verified facts. |
| `risk_explanations` | `{summary, evidence_status}[]` | Existing risks labeled `potential`. |
| `recommended_checks` | string[] | Mirrors `suggested_tests`. |
| `coverage_review` | object | Existing review fields plus `promoted_files` and `rejected_file_suggestions`. |
| `validation_metrics` | object | Existence counts plus `impact_supported_claims`, `potential_claims`, `duplicate_claims`, `promoted_suggestions`, and `promoted_graph_tests`. |
| `rejected_hallucinations` | array | Invalid or ambiguous file/symbol claims with rejection reasons. |
| `retrieval_metadata`, `operational_metadata` | object | Context budget, retrieval counts, provider/model, timing, and token usage when reported. |

An impact item preserves legacy `file_path`, `symbol`, `impact_type`, `category`, `reason`, `confidence`, `is_verified_fact`, `evidence_snippet`, and line fields. New fields are:

| Field | Shape | Meaning |
| --- | --- | --- |
| `existence_verified` | boolean | Indexed file and optional symbol exist in the selected repository. |
| `impact_supported` | boolean | Conservative static support was found. This is not a probability or runtime proof. |
| `evidence_status` | `supported` or `potential` | Presentation label. Invalid claims are in `rejected_hallucinations`, not an impact item. |
| `support_reason` | string, when available | Why the static gate supported or deferred this claim. |
| `original_impact_type` | `direct` or `indirect`, when available | Model classification before a source-supported direct/indirect correction. The current `impact_type` is used for scoring and display. |
| `dependency_path` | string[], when available | Direct target to dependent for a supported indirect call. |
| `sources`, `dependency_paths` | object fields on potential items | Origin and graph paths for review. |
| `technical_explanation` | object | `component`, `reason`, `dependency_path`, `evidence_refs`, `regression_considerations`. |
| `simple_explanation` | object | `functional_area`, `summary`, `why_it_matters`, `possible_risk`, `recommended_check`, `uncertainty`. |

`evidence_refs` contain `{file_path, symbol, line_start, line_end}`. They are empty when a safe source snippet or line number is unavailable. `symbol` and line fields may be `null`. Plain-language explanations use deterministic wording and explicitly state uncertainty; no extra model call is made. The legacy `confidence` is provider output and must not be shown as calibrated certainty. `is_verified_fact` is a legacy alias for existence verification only.

## Sanitized example

```json
{
  "requirement_summary": "Strengthen password hashing",
  "affected_functional_areas": ["Password protection"],
  "affected_items": [{
    "file_path": "app/core/security.py",
    "symbol": "hash_password",
    "impact_type": "direct",
    "reason": "Change password hashing",
    "existence_verified": true,
    "impact_supported": true,
    "evidence_status": "supported",
    "technical_explanation": {
      "component": "app/core/security.py::hash_password",
      "reason": "Requirement terms match an indexed source symbol and cited reason",
      "dependency_path": [],
      "evidence_refs": [{"file_path": "app/core/security.py", "symbol": "hash_password", "line_start": 6, "line_end": 7}],
      "regression_considerations": ["Check callers and relevant tests"]
    },
    "simple_explanation": {
      "functional_area": "Password protection",
      "summary": "The proposed change may affect password protection.",
      "why_it_matters": "The indexed source contains a matching code element.",
      "possible_risk": "Related behavior could change unexpectedly if this part is edited incorrectly.",
      "recommended_check": "Review the cited source lines and run relevant tests.",
      "uncertainty": "Static source evidence does not prove every runtime effect."
    }
  }],
  "potential_impacts": [{
    "file_path": "app/api/auth.py",
    "impact_status": "potential",
    "impact_supported": false,
    "evidence_status": "potential",
    "sources": ["dependency_graph"],
    "dependency_paths": {"downstream": ["app/core/security.py", "app/api/auth.py"]},
    "technical_explanation": {"component": "app/api/auth.py", "reason": "Causal effect has not been established", "dependency_path": ["app/core/security.py", "app/api/auth.py"], "evidence_refs": [], "regression_considerations": []},
    "simple_explanation": {"functional_area": "Auth", "summary": "Review auth for possible effects of the change.", "why_it_matters": "This part was suggested for review; a causal effect has not been established.", "possible_risk": "Related behavior could change unexpectedly if this part is edited incorrectly.", "recommended_check": "Inspect this part before treating it as affected.", "uncertainty": "The effect on this part has not been established by source evidence."}
  }],
  "risk_explanations": [{"summary": "Check password comparison behavior", "evidence_status": "potential"}],
  "recommended_checks": ["Run password verification tests"],
  "operational_metadata": {"provider": "offline_demo", "model": "deterministic-semantic-matcher"}
}
```

Consumers may display indexed paths, symbols, and cited lines as source facts. Label supported impacts as **source-supported predictions**, and all `potential_impacts`, risks, and suggested tests as items to review. An empty evidence reference list means the explanation has no safe source citation. Preserve unknown values and the uncertainty text rather than filling them with inferred behavior. Existing fields and REST/MCP envelopes retain their meaning; this is an additive contract. The frontend TypeScript interfaces have not yet been extended to type the new fields. A test recovered from a source call can appear in `affected_items` even when the model did not name it; `promoted_graph_tests` counts such additions.
