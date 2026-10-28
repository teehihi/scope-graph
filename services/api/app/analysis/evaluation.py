"""Pure metric calculations and replay for labeled AI Core evaluations."""

import copy
import json
import re
from typing import Any


def _ratio(numerator: int, denominator: int) -> float | None:
    return numerator / denominator if denominator else None


def retrieval_metrics(paths: list[str], relevant: set[str], k: int) -> dict[str, Any]:
    selected = paths[:k]
    hits = len(set(selected) & relevant)
    first_rank = next((rank for rank, path in enumerate(selected, 1) if path in relevant), None)
    return {
        "precision_at_k": _ratio(hits, k),
        "recall_at_k": _ratio(hits, len(relevant)),
        "mrr": 1 / first_rank if first_rank else 0.0,
        "retrieved": len(selected), "relevant": len(relevant), "hits": hits,
    }


def impact_metrics(items: list[dict[str, Any]], gold: dict[str, list[str]]) -> dict[str, Any]:
    predicted = {(item["file_path"], item["impact_type"]) for item in items}
    expected = {(path, kind) for kind in ("direct", "indirect") for path in gold[kind]}
    hits = len(predicted & expected)
    precision = _ratio(hits, len(predicted))
    recall = _ratio(hits, len(expected))
    if precision is None or recall is None:
        f1 = None
    elif precision + recall:
        f1 = 2 * precision * recall / (precision + recall)
    else:
        f1 = 0.0
    return {
        "precision": precision, "recall": recall, "f1": f1,
        "predicted": len(predicted), "relevant": len(expected), "hits": hits,
        "direct_recall": _ratio(len({(p, "direct") for p in gold["direct"]} & predicted), len(gold["direct"])),
        "indirect_recall": _ratio(len({(p, "indirect") for p in gold["indirect"]} & predicted), len(gold["indirect"])),
    }


def file_only_metrics(items: list[dict[str, Any]], gold: dict[str, list[str]]) -> dict[str, Any]:
    predicted = {item["file_path"] for item in items}
    expected = set(gold["direct"]) | set(gold["indirect"])
    hits = len(predicted & expected)
    precision, recall = _ratio(hits, len(predicted)), _ratio(hits, len(expected))
    f1 = (2 * precision * recall / (precision + recall) if precision is not None
          and recall is not None and precision + recall else
          (None if precision is None or recall is None else 0.0))
    return {"precision": precision, "recall": recall, "f1": f1,
            "predicted": len(predicted), "relevant": len(expected), "hits": hits}


def grounding_metrics(
    raw: list[dict[str, Any]], accepted: list[dict[str, Any]],
    rejected: list[dict[str, Any]], gold: dict[str, list[str]],
) -> dict[str, Any]:
    count = len(raw)
    hallucinated = sum("does not exist" in item["reason"] or "Invalid or empty file path" in item["reason"] for item in rejected)
    invalid_symbol = sum("Symbol is missing or ambiguous" in item["reason"] for item in rejected)
    expected = {(path, kind) for kind in ("direct", "indirect") for path in gold[kind]}
    unsupported = sum((item["file_path"], item["impact_type"]) not in expected for item in accepted)
    unique_accepted = {(item["file_path"], item["impact_type"]) for item in accepted}
    unique_unsupported = len(unique_accepted - expected)
    return {
        "total_claims": count, "accepted_claims": len(accepted), "rejected_claims": len(rejected),
        "hallucinated_files": hallucinated, "invalid_symbols": invalid_symbol,
        "unsupported_claims": unique_unsupported, "raw_unsupported_claims": unsupported,
        "unique_accepted_predictions": len(unique_accepted),
        "duplicate_accepted_claims": len(accepted) - len(unique_accepted),
        "unique_unsupported_predictions": unique_unsupported,
        "hallucinated_file_rate": _ratio(hallucinated, count),
        "invalid_symbol_rate": _ratio(invalid_symbol, count),
        "unsupported_claim_rate": _ratio(unique_unsupported, len(unique_accepted)),
        "raw_unsupported_claim_rate": _ratio(unsupported, count),
        "unique_unsupported_rate": _ratio(unique_unsupported, len(unique_accepted)),
    }


def _average(values: list[float | None]) -> float | None:
    present = [value for value in values if value is not None]
    return sum(present) / len(present) if present else None


def _percentile(values: list[float], fraction: float) -> float | None:
    ordered = sorted(values)
    return ordered[min(len(ordered) - 1, max(0, int((len(ordered) - 1) * fraction + 0.5)))] if ordered else None


def _pairs(items: list[dict[str, Any]]) -> set[tuple[str, str]]:
    return {(item["file_path"], item["impact_type"]) for item in items}


def _pair_records(pairs: set[tuple[str, str]]) -> list[dict[str, str]]:
    return [{"file_path": path, "impact_type": kind} for path, kind in sorted(pairs)]


def _score_case(case: dict[str, Any], k: int) -> dict[str, Any]:
    trace = case["trace"]
    if trace["scenario_id"] != case["id"]:
        raise ValueError(f"Scenario ID does not match trace: {case['id']}")
    labels = trace["labels"]
    context = trace["reasoning_context"]
    if context["requirement_interpretation"] != trace["interpretation"]:
        raise ValueError(f"Interpretation does not match reasoning input: {case['id']}")
    ranked = trace["retrieval"]["ranked_files"]
    paths = [item["path"] for item in ranked]
    if paths != [item["path"] for item in context["retrieved_files"]]:
        raise ValueError(f"Retrieval ranking does not match reasoning input: {case['id']}")

    raw = trace["raw_impact"]["affected_items"]
    accepted = trace["validated_impact"]["affected_items"]
    existence = trace.get("existence_validated_impact", trace["validated_impact"])
    existence_accepted = existence["affected_items"]
    rejected = existence["rejected_hallucinations"]
    if len(raw) != len(existence_accepted) + len(rejected):
        raise ValueError(f"Raw and validated claim counts differ: {case['id']}")
    predicted = _pairs(accepted)
    expected = {(path, kind) for kind in ("direct", "indirect") for path in labels["impact"][kind]}
    scoring_details = {
        "true_positives": _pair_records(predicted & expected),
        "false_positives": _pair_records(predicted - expected),
        "false_negatives": _pair_records(expected - predicted),
    }

    result = copy.deepcopy(case)
    retrieval = result.setdefault("retrieval", {})
    relevant = set(labels["retrieval_relevant"])
    baseline_paths = retrieval.get("baseline_paths_at_k", [])
    retrieval["hybrid"] = retrieval_metrics(paths, relevant, k)
    retrieval["keyword_baseline"] = retrieval_metrics(baseline_paths, relevant, k)
    retrieval["hybrid_paths"] = paths
    retrieval["baseline_paths_at_k"] = baseline_paths[:k]
    retrieval["hybrid_latency_ms"] = trace["retrieval"]["latency_seconds"] * 1000
    selected_chars = len(json.dumps(context["retrieved_files"], sort_keys=True))
    full_chars = retrieval.get("full_summary_chars")
    retrieval["estimated_selected_tokens"] = (selected_chars + 3) // 4
    retrieval["estimated_full_summary_tokens"] = (full_chars + 3) // 4 if full_chars is not None else None
    retrieval["context_reduction_vs_full_summary"] = 1 - selected_chars / full_chars if full_chars else None
    result["impact"] = impact_metrics(accepted, labels["impact"])
    result["raw_impact"] = impact_metrics(existence_accepted, labels["impact"])
    result["file_only_impact"] = file_only_metrics(accepted, labels["impact"])
    result["grounding"] = grounding_metrics(raw, existence_accepted, rejected, labels["impact"])
    potential_pairs = {
        (item["file_path"], item["impact_type"])
        for item in trace.get("potential_impacts", []) if item.get("impact_type") in {"direct", "indirect"}
    }
    result["potential_impact_coverage"] = _ratio(len(potential_pairs & expected), len(expected))
    full_source_chars = retrieval.get("full_source_chars")
    retrieval["context_reduction_vs_full_source"] = (
        1 - selected_chars / full_source_chars if full_source_chars else None
    )
    result["scoring_details"] = scoring_details
    result["analysis_latency_seconds"] = trace["analysis_latency_seconds"]
    result["reported_token_usage"] = trace["token_usage"]
    result["provider"] = trace["provider"]
    result["model"] = trace["model"]
    return result


def replay_evaluation(artifact: dict[str, Any]) -> dict[str, Any]:
    """Recompute every score from saved claims and labels; never create a provider."""
    if artifact.get("schema_version") != 2 or any("trace" not in case for case in artifact.get("cases", [])):
        raise ValueError("Evaluation artifact lacks replayable traces (schema_version 2 required)")
    k = artifact["config"]["top_k"]
    if not isinstance(k, int) or k <= 0:
        raise ValueError("top_k must be a positive integer")
    result = copy.deepcopy(artifact)
    cases = [_score_case(case, k) for case in artifact["cases"]]
    result["cases"] = cases
    result["dataset_size"] = len(cases)
    result["macro"] = {
        method: {metric: _average([case["retrieval"][method][metric] for case in cases])
                 for metric in ("precision_at_k", "recall_at_k", "mrr")}
        for method in ("hybrid", "keyword_baseline")
    }
    result["macro"].update({
        "impact": {metric: _average([case["impact"][metric] for case in cases])
                   for metric in ("precision", "recall", "f1", "direct_recall", "indirect_recall")},
        "raw_impact": {metric: _average([case["raw_impact"][metric] for case in cases])
                       for metric in ("precision", "recall", "f1", "direct_recall", "indirect_recall")},
        "file_only_impact": {metric: _average([case["file_only_impact"][metric] for case in cases])
                             for metric in ("precision", "recall", "f1")},
        "grounding": {
            **{count: sum(case["grounding"][count] for case in cases) for count in (
                "total_claims", "accepted_claims", "rejected_claims", "hallucinated_files", "invalid_symbols",
                "unsupported_claims", "raw_unsupported_claims", "unique_accepted_predictions",
                "duplicate_accepted_claims", "unique_unsupported_predictions",
            )},
        },
        "hybrid_latency_ms": _average([case["retrieval"]["hybrid_latency_ms"] for case in cases]),
        "baseline_latency_ms": _average([case["retrieval"].get("baseline_latency_ms") for case in cases]),
        "context_reduction_vs_full_summary": _average([
            case["retrieval"]["context_reduction_vs_full_summary"] for case in cases
        ]),
        "context_reduction_vs_full_source": _average([
            case["retrieval"]["context_reduction_vs_full_source"] for case in cases
        ]),
        "analysis_latency_seconds": _average([case["analysis_latency_seconds"] for case in cases]),
        "analysis_latency_p50_seconds": _percentile([case["analysis_latency_seconds"] for case in cases], 0.5),
        "analysis_latency_p95_seconds": _percentile([case["analysis_latency_seconds"] for case in cases], 0.95),
        "potential_impact_coverage": _average([case["potential_impact_coverage"] for case in cases]),
    })
    grounding = result["macro"]["grounding"]
    for count, rate, denominator in (
        ("hallucinated_files", "hallucinated_file_rate", "total_claims"),
        ("invalid_symbols", "invalid_symbol_rate", "total_claims"),
        ("unsupported_claims", "unsupported_claim_rate", "unique_accepted_predictions"),
        ("raw_unsupported_claims", "raw_unsupported_claim_rate", "total_claims"),
        ("unique_unsupported_predictions", "unique_unsupported_rate", "unique_accepted_predictions"),
    ):
        grounding[rate] = _ratio(grounding[count], grounding[denominator])

    hits = sum(case["impact"]["hits"] for case in cases)
    predicted = sum(case["impact"]["predicted"] for case in cases)
    relevant = sum(case["impact"]["relevant"] for case in cases)
    precision, recall = _ratio(hits, predicted), _ratio(hits, relevant)
    f1 = 2 * precision * recall / (precision + recall) if precision is not None and recall is not None and precision + recall else (
        None if precision is None or recall is None else 0.0
    )
    direct_count = sum(len(case["trace"]["labels"]["impact"]["direct"]) for case in cases)
    indirect_count = sum(len(case["trace"]["labels"]["impact"]["indirect"]) for case in cases)
    direct_hits = sum(sum(item["impact_type"] == "direct" for item in case["scoring_details"]["true_positives"])
                      for case in cases)
    indirect_hits = hits - direct_hits
    result["micro"] = {
        "impact": {
            "precision": precision, "recall": recall, "f1": f1,
            "direct_recall": _ratio(direct_hits, direct_count),
            "indirect_recall": _ratio(indirect_hits, indirect_count),
            "true_positives": hits, "false_positives": predicted - hits, "false_negatives": relevant - hits,
        },
        "retrieval": {
            method: {
                "precision_at_k": _ratio(sum(case["retrieval"][method]["hits"] for case in cases), k * len(cases)),
                "recall_at_k": _ratio(sum(case["retrieval"][method]["hits"] for case in cases),
                                      sum(case["retrieval"][method]["relevant"] for case in cases)),
            }
            for method in ("hybrid", "keyword_baseline")
        },
    }
    return result


_CREDENTIAL_ASSIGNMENT = re.compile(
    r"(?i)\b(META_AI_API_KEY|MODEL_API_KEY|GITHUB_CLIENT_SECRET|OPENAI_API_KEY|DATABASE_URL)\s*([=:])\s*[^\s,;]+"
)
_AUTH_HEADER = re.compile(r"(?i)\bAuthorization\s*:\s*[^\s,;]+(?:\s+[^\s,;]+)?")
_BEARER_TOKEN = re.compile(r"(?i)\bBearer\s+[^\s,;]+")
_KEY_LITERAL = re.compile(r"\bsk-[A-Za-z0-9_-]{12,}\b")
_SOURCE_SECRET_ASSIGNMENT = re.compile(
    r"(?i)\b(SECRET_KEY|API_KEY|PASSWORD)\b[^\n=]{0,30}=\s*(['\"]).*?\2"
)
_SENSITIVE_KEYS = {"authorization", "api_key", "client_secret", "secret_key", "password", "access_token", "refresh_token"}


def redact_evaluation_artifact(value: Any) -> Any:
    """Copy a trace while masking common credentials; never capture HTTP headers."""
    if isinstance(value, dict):
        return {
            key: "[REDACTED]" if key.lower() in _SENSITIVE_KEYS else redact_evaluation_artifact(item)
            for key, item in value.items()
        }
    if isinstance(value, list):
        return [redact_evaluation_artifact(item) for item in value]
    if isinstance(value, str):
        masked = _CREDENTIAL_ASSIGNMENT.sub(lambda match: f"{match.group(1)}{match.group(2)}[REDACTED]", value)
        masked = _SOURCE_SECRET_ASSIGNMENT.sub(lambda match: f"{match.group(1)} = [REDACTED]", masked)
        masked = _AUTH_HEADER.sub("[REDACTED AUTH HEADER]", masked)
        masked = _BEARER_TOKEN.sub("Bearer [REDACTED]", masked)
        return _KEY_LITERAL.sub("[REDACTED]", masked)
    return value
