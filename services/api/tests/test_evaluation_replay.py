import hashlib
import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

from app.analysis import evaluation
from app.ai.provider import OfflineDemoProvider
from scripts import evaluate_ai_core


def _case(case_id, labels, retrieved, accepted, rejected=(), baseline=()):
    return {
        "id": case_id,
        "retrieval": {"baseline_paths_at_k": list(baseline), "baseline_latency_ms": 0.1},
        "trace": {
            "scenario_id": case_id,
            "requirement": "A concrete change",
            "labels": labels,
            "interpretation": {"search_keywords": ["change"], "affected_layers": ["service"]},
            "retrieval": {
                "ranked_files": [
                    {"rank": rank, "path": path, "score": 10 - rank, "reasons": ["path:change"]}
                    for rank, path in enumerate(retrieved, 1)
                ],
                "latency_seconds": 0.001,
            },
            "reasoning_context": {
                "requirement_interpretation": {"search_keywords": ["change"], "affected_layers": ["service"]},
                "retrieved_files": [{"path": path} for path in retrieved],
                "dependency_context": {"direct": [], "upstream": [], "downstream": [], "paths": {}},
            },
            "raw_impact": {"affected_items": [*accepted, *(
                {"file_path": item["claimed_path"], "impact_type": "direct"} for item in rejected
            )]},
            "validated_impact": {"affected_items": list(accepted), "rejected_hallucinations": list(rejected)},
            "potential_impacts": [],
            "completeness_review": {"additional_files_to_check": []},
            "provider": "offline_demo", "model": "deterministic-semantic-matcher",
            "token_usage": None, "analysis_latency_seconds": 0.02,
        },
        "impact": {"precision": 999},  # Saved summaries must never replace replayed claim-level scores.
    }


def test_replay_recomputes_metrics_and_separates_raw_duplicates_from_unique_predictions():
    a = {"file_path": "a.py", "impact_type": "direct"}
    b = {"file_path": "b.py", "impact_type": "indirect"}
    d = {"file_path": "d.py", "impact_type": "direct"}
    artifact = {
        "schema_version": 2,
        "config": {"top_k": 2},
        "cases": [
            _case("first", {"retrieval_relevant": ["a.py", "c.py"],
                            "impact": {"direct": ["a.py"], "indirect": ["c.py"]}},
                  ["a.py", "b.py"], [a, a, b],
                  [{"claimed_path": "missing.py", "reason": "File does not exist in indexed repository"}],
                  ["b.py", "c.py"]),
            _case("second", {"retrieval_relevant": ["d.py"],
                             "impact": {"direct": ["d.py"], "indirect": []}},
                  ["d.py"], [d], baseline=["d.py"]),
        ],
    }

    replayed = evaluation.replay_evaluation(artifact)

    first = replayed["cases"][0]
    assert first["retrieval"]["hybrid"] == {
        "precision_at_k": 0.5, "recall_at_k": 0.5, "mrr": 1.0,
        "retrieved": 2, "relevant": 2, "hits": 1,
    }
    assert first["impact"]["precision"] == 0.5
    assert first["impact"]["recall"] == 0.5
    assert first["scoring_details"]["true_positives"] == [{"file_path": "a.py", "impact_type": "direct"}]
    assert first["scoring_details"]["false_positives"] == [{"file_path": "b.py", "impact_type": "indirect"}]
    assert first["scoring_details"]["false_negatives"] == [{"file_path": "c.py", "impact_type": "indirect"}]
    assert first["grounding"]["total_claims"] == 4
    assert first["grounding"]["accepted_claims"] == 3
    assert first["grounding"]["unique_accepted_predictions"] == 2
    assert first["grounding"]["duplicate_accepted_claims"] == 1
    assert first["grounding"]["raw_unsupported_claims"] == 1
    assert first["grounding"]["unique_unsupported_predictions"] == 1
    assert replayed["macro"]["impact"]["precision"] == 0.75
    assert replayed["macro"]["impact"]["recall"] == 0.75
    assert replayed["micro"]["impact"]["precision"] == pytest.approx(2 / 3)
    assert replayed["micro"]["impact"]["recall"] == pytest.approx(2 / 3)
    assert replayed["micro"]["impact"]["true_positives"] == 2
    assert replayed["micro"]["impact"]["false_positives"] == 1
    assert replayed["micro"]["impact"]["false_negatives"] == 1
    assert replayed["macro"]["grounding"]["total_claims"] == 5
    assert replayed["macro"]["grounding"]["duplicate_accepted_claims"] == 1
    assert replayed == evaluation.replay_evaluation(replayed)


def test_replay_handles_empty_labels_and_predictions_without_inventing_perfect_scores():
    artifact = {
        "schema_version": 2, "config": {"top_k": 2},
        "cases": [_case("empty", {"retrieval_relevant": [], "impact": {"direct": [], "indirect": []}},
                        [], [], baseline=[])],
    }

    replayed = evaluation.replay_evaluation(artifact)

    assert replayed["cases"][0]["impact"]["precision"] is None
    assert replayed["cases"][0]["impact"]["recall"] is None
    assert replayed["cases"][0]["grounding"]["unique_unsupported_rate"] is None
    assert replayed["micro"]["impact"]["f1"] is None
    assert replayed["cases"][0]["retrieval"]["hybrid"]["mrr"] == 0.0


def test_replay_scores_supported_impacts_separately_from_existence_gate():
    direct = {"file_path": "a.py", "impact_type": "direct"}
    weak = {"file_path": "b.py", "impact_type": "direct"}
    reviewed = {"file_path": "c.py", "impact_type": "indirect"}
    case = _case("causal", {"retrieval_relevant": ["a.py", "c.py"],
                            "impact": {"direct": ["a.py"], "indirect": ["c.py"]}},
                 ["a.py", "c.py"], [direct, weak])
    case["trace"]["existence_validated_impact"] = {
        "affected_items": [direct, weak], "rejected_hallucinations": [],
    }
    case["trace"]["validated_impact"] = {
        "affected_items": [direct, reviewed], "potential_claims": [weak],
        "rejected_hallucinations": [],
    }
    case["trace"]["potential_impacts"] = [{"file_path": "b.py", "impact_status": "potential"}]

    replayed = evaluation.replay_evaluation({"schema_version": 2, "config": {"top_k": 2}, "cases": [case]})

    assert replayed["cases"][0]["impact"]["precision"] == 1.0
    assert replayed["cases"][0]["raw_impact"]["precision"] == 0.5
    assert replayed["cases"][0]["file_only_impact"]["recall"] == 1.0
    assert replayed["cases"][0]["grounding"]["unique_unsupported_predictions"] == 1
    assert replayed["cases"][0]["potential_impact_coverage"] == 0.0
    assert replayed == evaluation.replay_evaluation(replayed)


def test_replay_rejects_legacy_summaries_without_saved_claims():
    with pytest.raises(ValueError, match="replayable traces"):
        evaluation.replay_evaluation({"cases": [{"impact": {"precision": 0.2}}]})


def test_offline_evaluation_records_one_interpretation_and_replayable_scenario_traces(tmp_path, monkeypatch):
    calls = []
    original = OfflineDemoProvider.interpret_requirement

    def count_interpretations(self, requirement):
        calls.append(requirement)
        return original(self, requirement)

    monkeypatch.setattr(OfflineDemoProvider, "interpret_requirement", count_interpretations)
    output = tmp_path / "evaluation.json"
    result = evaluate_ai_core.run("offline", output, allow_paid_request=False)
    saved = json.loads(output.read_text(encoding="utf-8"))

    assert result == saved
    assert result["schema_version"] == 2
    fixture = evaluate_ai_core.ROOT / "services/api/tests/evaluation/ai_core_cases.json"
    assert result["dataset_sha256"] == hashlib.sha256(fixture.read_bytes()).hexdigest()
    assert result["repository"] == "examples/sample-repository"
    assert result["label_counts"] == {"direct": 7, "indirect": 5, "total": 12}
    assert len(calls) == result["dataset_size"] == 3
    assert result == evaluation.replay_evaluation(result)
    for case in result["cases"]:
        trace = case["trace"]
        assert trace["scenario_id"] == case["id"]
        assert trace["requirement"] in calls
        assert trace["interpretation"] == trace["reasoning_context"]["requirement_interpretation"]
        assert case["retrieval"]["hybrid_paths"] == [
            item["path"] for item in trace["reasoning_context"]["retrieved_files"]
        ]
        assert trace["labels"]["impact"]["direct"]
        existence = trace.get("existence_validated_impact", trace["validated_impact"])
        assert len(trace["raw_impact"]["affected_items"]) == (
            len(existence["affected_items"]) + len(existence["rejected_hallucinations"])
        )
        assert isinstance(trace["potential_impacts"], list)
        assert "additional_files_to_check" in trace["completeness_review"]
        assert "true_positives" in case["scoring_details"]


def test_holdout_offline_evaluation_records_exact_fixture_and_source_provenance(tmp_path):
    fixture = evaluate_ai_core.ROOT / "services/api/tests/evaluation/holdout_realworld_cases_v2.json"
    manifest_path = evaluate_ai_core.ROOT / "services/api/tests/evaluation/holdout_realworld_snapshot_v1.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    result = evaluate_ai_core.run("offline", tmp_path / "holdout.json", allow_paid_request=False, dataset_path=fixture)

    assert result["dataset_size"] == 10
    assert result["dataset_sha256"] == hashlib.sha256(fixture.read_bytes()).hexdigest()
    assert result["source_manifest_sha256"] == hashlib.sha256(manifest_path.read_bytes()).hexdigest()
    assert result["source_tree_sha256"] == manifest["tree_sha256"]
    assert result["verified_source_file_count"] == 103
    assert result["repository_snapshot"] == manifest["upstream_commit"]
    assert result["label_counts"] == {"direct": 10, "indirect": 15, "total": 25}
    assert "human" in result["review_status"]
    assert result["config"]["provider"] == "offline_demo"
    assert result == evaluation.replay_evaluation(result)


def test_holdout_evaluation_rejects_snapshot_that_does_not_match_recorded_manifest(tmp_path):
    root = evaluate_ai_core.ROOT
    fixture = json.loads((root / "services/api/tests/evaluation/holdout_realworld_cases_v2.json").read_text(encoding="utf-8"))
    manifest = json.loads((root / fixture["snapshot_manifest"]).read_text(encoding="utf-8"))
    manifest["files"][0]["sha256"] = "0" * 64
    bad_manifest = tmp_path / "bad-manifest.json"
    bad_manifest.write_text(json.dumps(manifest), encoding="utf-8")
    fixture["snapshot_manifest"] = str(bad_manifest)
    bad_fixture = tmp_path / "bad-fixture.json"
    bad_fixture.write_text(json.dumps(fixture), encoding="utf-8")

    with pytest.raises(ValueError, match="Snapshot file hash mismatch"):
        evaluate_ai_core.run("offline", tmp_path / "should-not-exist.json", allow_paid_request=False, dataset_path=bad_fixture)
    assert not (tmp_path / "should-not-exist.json").exists()


def test_replay_cli_recalculates_saved_artifact_with_live_provider_environment(tmp_path):
    artifact = {"schema_version": 2, "config": {"top_k": 2}, "cases": [
        _case("offline", {"retrieval_relevant": ["a.py"],
                           "impact": {"direct": ["a.py"], "indirect": []}},
              ["a.py"], [{"file_path": "a.py", "impact_type": "direct"}]),
    ]}
    source = tmp_path / "saved.json"
    source.write_text(json.dumps(artifact), encoding="utf-8")
    root = Path(__file__).resolve().parents[3]
    env = {**os.environ, "META_AI_PROVIDER": "meta_model_api", "META_AI_API_KEY": "", "PYTHONDONTWRITEBYTECODE": "1"}

    process = subprocess.run(
        [sys.executable, str(root / "scripts/replay_ai_core.py"), "--input", str(source)],
        cwd=root, env=env, capture_output=True, text=True, check=False,
    )

    assert process.returncode == 0, process.stderr
    replayed = json.loads(process.stdout)
    assert replayed["cases"][0]["impact"]["precision"] == 1.0
    assert replayed["micro"]["impact"]["true_positives"] == 1


def test_evaluation_trace_redacts_credentials_without_erasing_token_usage():
    artifact = {
        "trace": {"reason": "Authorization: Bearer abc123 META_AI_API_KEY=top-secret-value "
                            "SECRET_KEY: str = 'private-value'"},
        "token_usage": {"total_tokens": 42},
    }

    redacted = evaluation.redact_evaluation_artifact(artifact)

    assert "abc123" not in json.dumps(redacted)
    assert "top-secret-value" not in json.dumps(redacted)
    assert "private-value" not in json.dumps(redacted)
    assert "Authorization:" not in json.dumps(redacted)
    assert redacted["token_usage"] == {"total_tokens": 42}
    assert "top-secret-value" in artifact["trace"]["reason"]
    assert "private-value" in artifact["trace"]["reason"]


def test_evaluation_rejects_trace_output_outside_ignored_data_directory():
    root = Path(__file__).resolve().parents[3]
    with pytest.raises(ValueError, match="ignored data directory"):
        evaluate_ai_core.run("offline", root / "docs" / "public-trace.json", allow_paid_request=False)
