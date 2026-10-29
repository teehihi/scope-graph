"""Offline SG-AI-18 fixture and paired evaluation checks; no live inference."""

import copy
import json
from pathlib import Path

import pytest

from scripts.evaluate_multimodal import replay_artifact, run_offline, validate_fixture


ROOT = Path(__file__).resolve().parents[3]
FIXTURE = ROOT / "services/api/tests/evaluation/multimodal_cases_v1.json"


def test_synthetic_fixture_is_source_and_image_verified():
    fixture = validate_fixture(FIXTURE)

    assert len(fixture["cases"]) == 6
    assert fixture["repository_snapshot"] == "f413b0b90d6157d5493a5603fb1245a7f4681eb6"
    assert {case["screenshot"]["relationship"] for case in fixture["cases"]} == {
        "clear", "ambiguous", "irrelevant", "conflicting", "no_match",
    }
    assert all(case["source_case_id"] and case["annotation_provenance"] == "AI-assisted; human sign-off pending"
               for case in fixture["cases"])


def test_modified_image_is_rejected_before_evaluation(tmp_path):
    fixture = json.loads(FIXTURE.read_text(encoding="utf-8"))
    fixture["cases"][0]["screenshot"]["sha256"] = "0" * 64
    tampered = tmp_path / "tampered.json"
    tampered.write_text(json.dumps(fixture), encoding="utf-8")

    with pytest.raises(ValueError, match="Screenshot hash mismatch"):
        validate_fixture(tampered)


def test_paired_offline_evaluation_replays_without_provider_or_image_access(tmp_path, monkeypatch):
    output = tmp_path / "paired.json"
    result = run_offline(FIXTURE, output)

    assert output.is_file()
    assert result["mode"] == "scripted_mock_offline"
    assert len(result["cases"]) == 6
    assert all(case["text_only"]["provider"] == "offline_demo" for case in result["cases"])
    assert all(case["with_screenshot"]["visual_context"]["provider"] == "fixture_mock"
               for case in result["cases"])
    assert all(case["with_screenshot"]["reported_token_usage"] is None for case in result["cases"])
    assert all(case["text_only"]["requirement"] == case["with_screenshot"]["requirement"]
               for case in result["cases"])
    assert result["aggregate"]["text_only"]["impact"]
    assert result["aggregate"]["with_screenshot"]["retrieval"]

    def no_inference(*args, **kwargs):
        raise AssertionError("Replay must not invoke an inference provider")

    monkeypatch.setattr("scripts.evaluate_multimodal.AnalysisOrchestrator.run_analysis", no_inference)
    monkeypatch.setattr(Path, "read_bytes", no_inference)
    replayed = replay_artifact(json.loads(output.read_text(encoding="utf-8")))
    assert replayed["aggregate"] == result["aggregate"]
    assert [case["metrics"] for case in replayed["cases"]] == [case["metrics"] for case in result["cases"]]


def test_replay_detects_changed_predictions(tmp_path):
    result = run_offline(FIXTURE, tmp_path / "paired.json")
    corrupted = copy.deepcopy(result)
    corrupted["cases"][0]["with_screenshot"]["retrieved_paths"] = ["missing.py"]

    with pytest.raises(ValueError, match="Saved metrics differ"):
        replay_artifact(corrupted)
