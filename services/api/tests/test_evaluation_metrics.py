from app.analysis.evaluation import retrieval_metrics, impact_metrics, grounding_metrics


def test_retrieval_metrics_use_explicit_denominators_and_first_relevant_rank():
    result = retrieval_metrics(["noise", "target", "also"], {"target", "missing"}, 3)
    assert result == {
        "precision_at_k": 1 / 3, "recall_at_k": 1 / 2, "mrr": 1 / 2,
        "retrieved": 3, "relevant": 2, "hits": 1,
    }
    assert retrieval_metrics([], set(), 3)["recall_at_k"] is None
    assert retrieval_metrics(["target"], {"target"}, 3)["precision_at_k"] == 1 / 3


def test_impact_metrics_distinguish_direct_indirect_and_empty_gold():
    result = impact_metrics(
        [{"file_path": "a.py", "impact_type": "direct"},
         {"file_path": "b.py", "impact_type": "indirect"}],
        {"direct": ["a.py", "c.py"], "indirect": ["b.py"]},
    )
    assert result["precision"] == 1
    assert result["recall"] == 2 / 3
    assert result["f1"] == 0.8
    assert result["direct_recall"] == 0.5
    assert result["indirect_recall"] == 1
    assert impact_metrics([], {"direct": [], "indirect": []})["recall"] is None


def test_grounding_metrics_count_invalid_and_unsupported_claims():
    result = grounding_metrics(
        [{"file_path": "a.py", "symbol": "real", "impact_type": "direct"},
         {"file_path": "a.py", "symbol": "fake", "impact_type": "direct"},
         {"file_path": "missing.py", "symbol": None, "impact_type": "direct"},
         {"file_path": "b.py", "symbol": None, "impact_type": "indirect"}],
        [{"file_path": "a.py", "symbol": "real", "impact_type": "direct"},
         {"file_path": "b.py", "symbol": None, "impact_type": "indirect"}],
        [{"claimed_path": "a.py", "claimed_symbol": "fake", "reason": "Symbol is missing or ambiguous in the claimed file"},
         {"claimed_path": "missing.py", "claimed_symbol": None, "reason": "File does not exist in indexed repository"}],
        {"direct": ["a.py"], "indirect": []},
    )
    assert result["total_claims"] == 4
    assert result["hallucinated_file_rate"] == 0.25
    assert result["invalid_symbol_rate"] == 0.25
    assert result["unsupported_claim_rate"] == 0.25
    assert result["unsupported_claims"] == 1
