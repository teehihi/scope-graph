"""A scripted stage split must be replayable without contacting providers."""

from pathlib import Path

from app.analysis.evaluation import replay_evaluation
from scripts.evaluate_ai_core import run


ROOT = Path(__file__).resolve().parents[3]


def test_mock_multi_ai_uses_same_development_labels_and_replays(tmp_path):
    dataset = ROOT / "services/api/tests/evaluation/ai_core_cases.json"
    artifact = run("offline", tmp_path / "multi.json", False, dataset, mock_multi_ai=True)

    assert artifact["dataset_size"] == 3
    assert len(artifact["observed_source_tree_sha256"]) == 64
    assert artifact["mode"] == "mock"
    assert artifact["config"]["profile"] == "multi_ai_mock"
    assert all([entry["provider"] for entry in case["trace"]["stage_execution"]] == [
        "mock_meta", "mock_modal_reasoning", "mock_meta", "mock_meta",
    ] for case in artifact["cases"])
    assert replay_evaluation(artifact)["micro"]["impact"] == artifact["micro"]["impact"]
