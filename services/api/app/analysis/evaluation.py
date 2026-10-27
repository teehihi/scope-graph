"""Pure metric calculations for labeled AI Core evaluations."""

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


def grounding_metrics(
    raw: list[dict[str, Any]], accepted: list[dict[str, Any]],
    rejected: list[dict[str, Any]], gold: dict[str, list[str]],
) -> dict[str, Any]:
    count = len(raw)
    hallucinated = sum("does not exist" in item["reason"] or "Invalid or empty file path" in item["reason"] for item in rejected)
    invalid_symbol = sum("Symbol is missing or ambiguous" in item["reason"] for item in rejected)
    expected = {(path, kind) for kind in ("direct", "indirect") for path in gold[kind]}
    unsupported = sum((item["file_path"], item["impact_type"]) not in expected for item in accepted)
    return {
        "total_claims": count, "accepted_claims": len(accepted), "rejected_claims": len(rejected),
        "hallucinated_files": hallucinated, "invalid_symbols": invalid_symbol,
        "unsupported_claims": unsupported,
        "hallucinated_file_rate": _ratio(hallucinated, count),
        "invalid_symbol_rate": _ratio(invalid_symbol, count),
        "unsupported_claim_rate": _ratio(unsupported, count),
    }
