import json
from pathlib import Path

from scripts import evaluate_ai_core


ROOT = Path(__file__).resolve().parents[3]
DATASET = ROOT / "services/api/tests/evaluation/ai_core_cases_v2.json"


def test_expanded_labels_have_source_backed_annotations_and_negative_case():
    dataset = json.loads(DATASET.read_text(encoding="utf-8"))
    assert 15 <= len(dataset["cases"]) <= 25
    assert dataset["repository_snapshot"]
    ids = [case["id"] for case in dataset["cases"]]
    assert len(ids) == len(set(ids))
    assert any(not case["impact"]["direct"] and not case["impact"]["indirect"] for case in dataset["cases"])
    root = ROOT / dataset["repository"]
    for case in dataset["cases"]:
        labels = set(case["impact"]["direct"] + case["impact"]["indirect"])
        annotated = {item["path"] for item in case["annotations"]}
        assert annotated == labels, case["id"]
        for item in case["annotations"]:
            source = root / item["path"]
            assert source.is_file(), item
            assert 1 <= item["line"] <= len(source.read_text(encoding="utf-8").splitlines())
            assert item["rationale"].strip()
        for path in case["retrieval_relevant"]:
            assert (root / path).is_file(), (case["id"], path)


def test_expanded_dataset_runs_offline_and_replays_without_network(tmp_path):
    output = tmp_path / "expanded.json"
    result = evaluate_ai_core.run("offline", output, allow_paid_request=False, dataset_path=DATASET)

    assert result["dataset_size"] == 17
    assert result["dataset_version"] == "2026-10-28-manual-v2"
    assert result["macro"]["impact"]["precision"] is not None
    assert result["macro"]["file_only_impact"]["recall"] is not None
    assert result["macro"]["context_reduction_vs_full_source"] is not None
    assert result["macro"]["analysis_latency_p50_seconds"] >= 0
    assert result["macro"]["analysis_latency_p95_seconds"] >= result["macro"]["analysis_latency_p50_seconds"]
    assert all(case["trace"]["labels"]["annotations"] ==
               next(label["annotations"] for label in json.loads(DATASET.read_text(encoding="utf-8"))["cases"]
                    if label["id"] == case["id"])
               for case in result["cases"])
