"""Paired, no-network SG-AI-18 evaluation with scripted visual observations.

The scripted provider maps an already validated image SHA-256 to fixture intent.
It does not inspect pixels and cannot estimate real vision-model accuracy.
"""

import argparse
import copy
import datetime as dt
import hashlib
import json
import subprocess
import sys
from pathlib import Path
from unittest.mock import patch


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "services/api"))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.ai.image_input import ValidatedScreenshot
from app.ai.provider import AIProviderResponse, OfflineDemoProvider
from app.ai.schemas import StructuredVisualIntent
from app.analysis import orchestrator as orchestrator_module
from app.analysis.evaluation import impact_metrics, retrieval_metrics
from app.analysis.orchestrator import AnalysisOrchestrator
from app.core.config import settings
from app.db.database import Base
from app.db.models import IndexedFile, Repository
from app.indexing.engine import IndexingEngine
from scripts.evaluate_ai_core import verify_snapshot_manifest


FIXTURE = ROOT / "services/api/tests/evaluation/multimodal_cases_v1.json"


def _ratio(numerator: int, denominator: int) -> float | None:
    return numerator / denominator if denominator else None


def _mean(values: list[float | None]) -> float | None:
    present = [value for value in values if value is not None]
    return sum(present) / len(present) if present else None


def _f1(precision: float | None, recall: float | None) -> float | None:
    if precision is None or recall is None:
        return None
    return 2 * precision * recall / (precision + recall) if precision + recall else 0.0


def validate_fixture(path: Path) -> dict:
    """Check exact local source, inherited labels, image identity and annotations."""
    fixture = json.loads(path.read_text(encoding="utf-8"))
    if not 5 <= len(fixture["cases"]) <= 8:
        raise ValueError("Multimodal fixture must contain 5 to 8 scenarios")
    source_path = ROOT / fixture["source_label_dataset"]
    source_bytes = source_path.read_bytes()
    source_shas = {
        hashlib.sha256(source_bytes).hexdigest(),
        hashlib.sha256(source_bytes.replace(b"\r\n", b"\n")).hexdigest(),
        hashlib.sha256(source_bytes.replace(b"\n", b"\r\n")).hexdigest(),
    }
    if fixture["source_label_dataset_sha256"] not in source_shas:
        raise ValueError("Source label dataset hash mismatch")
    source = json.loads(source_bytes)
    if (fixture["repository"] != source["repository"]
            or fixture["repository_snapshot"] != source["repository_snapshot"]):
        raise ValueError("Fixture repository identity differs from source labels")
    sample = (ROOT / fixture["repository"]).resolve()
    manifest = json.loads((ROOT / fixture["snapshot_manifest"]).read_text(encoding="utf-8"))
    verify_snapshot_manifest(fixture, sample, manifest)
    tracked = subprocess.check_output(
        ["git", "ls-tree", "-r", "--name-only", fixture["repository_snapshot"], "--", fixture["repository"]],
        cwd=ROOT, text=True,
    ).splitlines()
    actual = sorted(f"{fixture['repository']}/{item['path']}" for item in manifest["files"])
    if sorted(tracked) != actual or subprocess.run(
        ["git", "diff", "--quiet", fixture["repository_snapshot"], "--", fixture["repository"]],
        cwd=ROOT, check=False,
    ).returncode != 0:
        raise ValueError("Sample repository differs from the pinned commit")

    source_cases = {item["id"]: item for item in source["cases"]}
    seen_ids = set()
    relationships = set()
    for case in fixture["cases"]:
        case_id = case["id"]
        if case_id in seen_ids or case_id != case["source_case_id"]:
            raise ValueError(f"Duplicate or mismatched scenario ID: {case_id}")
        seen_ids.add(case_id)
        original = source_cases.get(case_id)
        if original is None or any(case[key] != original[key] for key in
                                   ("requirement", "retrieval_relevant", "impact", "annotations")):
            raise ValueError(f"Inherited source labels changed: {case_id}")
        if case["repository_snapshot"] != fixture["repository_snapshot"]:
            raise ValueError(f"Cross-snapshot scenario: {case_id}")
        if case.get("negative_rationale") != original.get("negative_rationale"):
            raise ValueError(f"Negative rationale changed: {case_id}")
        if not case["expected_visual_concepts"] or len(set(case["expected_visual_concepts"])) != len(case["expected_visual_concepts"]):
            raise ValueError(f"Invalid visual concept labels: {case_id}")
        StructuredVisualIntent.model_validate(case["mock_visual_intent"])
        screenshot = case["screenshot"]
        relationships.add(screenshot["relationship"])
        image_path = (ROOT / screenshot["path"]).resolve()
        image_root = (ROOT / "services/api/tests/evaluation/screenshots_v1").resolve()
        if image_path.parent != image_root or screenshot["mime_type"] != "image/png":
            raise ValueError(f"Screenshot path or MIME outside fixture boundary: {case_id}")
        image_bytes = image_path.read_bytes()
        if hashlib.sha256(image_bytes).hexdigest() != screenshot["sha256"]:
            raise ValueError(f"Screenshot hash mismatch: {case_id}")
        ValidatedScreenshot.from_bytes(image_bytes, screenshot["mime_type"])
        expected_paths = set(case["retrieval_relevant"])
        direct, indirect = case["impact"]["direct"], case["impact"]["indirect"]
        if (len(set(direct)) != len(direct) or len(set(indirect)) != len(indirect)
                or set(direct) & set(indirect)):
            raise ValueError(f"Duplicate impact labels: {case_id}")
        expected_paths.update(direct)
        expected_paths.update(indirect)
        source_paths = {item["path"] for item in manifest["files"]}
        if not expected_paths <= source_paths:
            raise ValueError(f"Missing source path in labels: {case_id}")
        if {item["path"] for item in case["annotations"]} != set(direct) | set(indirect):
            raise ValueError(f"Impact annotation coverage mismatch: {case_id}")
        for annotation in case["annotations"]:
            lines = (sample / annotation["path"]).read_text(encoding="utf-8").splitlines()
            if not 1 <= annotation["line"] <= len(lines) or not annotation["rationale"]:
                raise ValueError(f"Invalid source evidence line: {case_id}")
    if relationships != {"clear", "ambiguous", "irrelevant", "conflicting", "no_match"}:
        raise ValueError("Multimodal scenario categories are incomplete")
    return fixture


class ScriptedVisualProvider(OfflineDemoProvider):
    """Deterministic hash lookup; never calls an external service or parses pixels."""

    def __init__(self, by_hash: dict[str, dict]):
        self.by_hash = by_hash

    def interpret_screenshot(self, requirement: str, image: ValidatedScreenshot) -> AIProviderResponse:
        entry = self.by_hash.get(image.sha256)
        if entry is None or requirement != entry["requirement"]:
            raise ValueError("Screenshot is not part of the paired offline fixture")
        return AIProviderResponse(
            data=entry["mock_visual_intent"], provider="fixture_mock",
            model="scripted-visual-intent-v1", latency_seconds=0.0,
            is_mock_or_demo=True, token_usage=None,
        )


def _capture_run(session, repo_id: str, requirement: str, screenshot: ValidatedScreenshot | None) -> dict:
    trace = {}
    run = AnalysisOrchestrator(session).run_analysis(
        repo_id, requirement, screenshot=screenshot, evaluation_trace=trace,
    )
    if run.status != "completed":
        raise RuntimeError(f"Offline analysis failed: {run.error_message}")
    report = run.result_json
    return {
        "requirement": requirement,
        "provider": run.provider, "model": run.model,
        "retrieved_paths": [item["path"] for item in trace["retrieval"]["ranked_files"]],
        "predicted_items": [
            {"file_path": item["file_path"], "impact_type": item["impact_type"]}
            for item in report["affected_items"]
        ],
        "potential_paths": sorted({item["file_path"] for item in report["potential_impacts"]}),
        "rejected_claim_count": len(report["rejected_hallucinations"]),
        "visual_context": report.get("visual_context"),
        "latency_seconds": run.execution_time_seconds,
        "reported_token_usage": report["operational_metadata"]["token_usage"],
    }


def run_offline(fixture_path: Path, output: Path) -> dict:
    """Run paired text and scripted-image analyses; save small replayable predictions."""
    fixture = validate_fixture(fixture_path)
    sample = ROOT / fixture["repository"]
    by_hash = {case["screenshot"]["sha256"]: case for case in fixture["cases"]}
    if len(by_hash) != len(fixture["cases"]):
        raise ValueError("Each scenario must use a distinct screenshot")
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine)()
    previous_provider, previous_key = settings.META_AI_PROVIDER, settings.META_AI_API_KEY
    settings.META_AI_PROVIDER, settings.META_AI_API_KEY = "offline_demo", ""
    try:
        repo = Repository(id="multimodal-evaluation-repo", name="Multimodal fixture",
                          workspace_path=str(sample), status="pending")
        session.add(repo)
        session.commit()
        indexed = IndexingEngine(session).index_repository(repo.id)
        if indexed.status != "ready":
            raise RuntimeError("Sample repository indexing failed")
        indexed_paths = {item.path for item in session.query(IndexedFile).filter_by(repository_id=repo.id)}
        cases = []
        for case in fixture["cases"]:
            labels = set(case["retrieval_relevant"]) | set(case["impact"]["direct"]) | set(case["impact"]["indirect"])
            if not labels <= indexed_paths:
                raise ValueError(f"Fixture labels not indexed: {case['id']}")
            image_meta = case["screenshot"]
            image = ValidatedScreenshot.from_bytes((ROOT / image_meta["path"]).read_bytes(), image_meta["mime_type"])
            with patch.object(orchestrator_module, "get_ai_provider", OfflineDemoProvider):
                text_result = _capture_run(session, repo.id, case["requirement"], None)
            with patch.object(orchestrator_module, "get_ai_provider", lambda: ScriptedVisualProvider(by_hash)):
                image_result = _capture_run(session, repo.id, case["requirement"], image)
            cases.append({
                "id": case["id"], "screenshot": image_meta,
                "labels": {"retrieval_relevant": case["retrieval_relevant"], "impact": case["impact"]},
                "expected_visual_concepts": case["expected_visual_concepts"],
                "scripted_visual_concepts": case["mock_visual_intent"]["functional_concepts"],
                "text_only": text_result, "with_screenshot": image_result,
            })
        artifact = {
            "schema_version": 1,
            "dataset_version": fixture["dataset_version"],
            "dataset_sha256": hashlib.sha256(fixture_path.read_bytes()).hexdigest(),
            "repository_snapshot": fixture["repository_snapshot"],
            "source_tree_sha256": json.loads((ROOT / fixture["snapshot_manifest"]).read_text(encoding="utf-8"))["tree_sha256"],
            "mode": "scripted_mock_offline", "provider": "offline_demo + fixture_mock",
            "model": "deterministic-semantic-matcher + scripted-visual-intent-v1",
            "code_commit_sha": subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip(),
            "worktree_dirty": bool(subprocess.check_output(["git", "status", "--porcelain"], cwd=ROOT, text=True).strip()),
            "timestamp_utc": dt.datetime.now(dt.timezone.utc).isoformat(),
            "top_k": settings.AI_RETRIEVAL_TOP_K,
            "actual_paid_inference_cost_usd": 0.0,
            "reported_token_usage": None,
            "cases": cases,
        }
        scored = replay_artifact(artifact)
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(json.dumps(scored, indent=2) + "\n", encoding="utf-8")
        return scored
    finally:
        settings.META_AI_PROVIDER, settings.META_AI_API_KEY = previous_provider, previous_key
        session.close()
        engine.dispose()


def _case_metrics(case: dict, k: int) -> dict:
    relevant = set(case["labels"]["retrieval_relevant"])
    gold = case["labels"]["impact"]
    expected_visual = set(case["expected_visual_concepts"])
    scripted_visual = set(case["scripted_visual_concepts"])
    results = {}
    for mode in ("text_only", "with_screenshot"):
        run = case[mode]
        retrieval = retrieval_metrics(run["retrieved_paths"], relevant, k)
        impact = impact_metrics(run["predicted_items"], gold)
        predicted = {(item["file_path"], item["impact_type"]) for item in run["predicted_items"]}
        expected = {(path, kind) for kind in ("direct", "indirect") for path in gold[kind]}
        results[mode] = {
            "retrieval": retrieval, "impact": impact,
            "unsupported_impact_claims": len(predicted - expected),
            "false_positive_pairs": [list(pair) for pair in sorted(predicted - expected)],
            "missed_pairs": [list(pair) for pair in sorted(expected - predicted)],
            "latency_seconds": run["latency_seconds"],
            "reported_token_usage": run["reported_token_usage"],
        }
    visual_hits = len(scripted_visual & expected_visual)
    results["scripted_visual_concept_agreement"] = {
        "precision": _ratio(visual_hits, len(scripted_visual)),
        "recall": _ratio(visual_hits, len(expected_visual)),
        "expected": sorted(expected_visual), "scripted": sorted(scripted_visual),
    }
    return results


def _aggregate(cases: list[dict], k: int) -> dict:
    aggregate = {}
    for mode in ("text_only", "with_screenshot"):
        metrics = [case["metrics"][mode] for case in cases]
        retrieval = [item["retrieval"] for item in metrics]
        impacts = [item["impact"] for item in metrics]
        hits = sum(item["hits"] for item in impacts)
        predicted = sum(item["predicted"] for item in impacts)
        relevant = sum(item["relevant"] for item in impacts)
        precision, recall = _ratio(hits, predicted), _ratio(hits, relevant)
        direct_count = sum(len(case["labels"]["impact"]["direct"]) for case in cases)
        indirect_count = sum(len(case["labels"]["impact"]["indirect"]) for case in cases)
        direct_hits = sum(len({(item["file_path"], item["impact_type"]) for item in case[mode]["predicted_items"]}
                              & {(path, "direct") for path in case["labels"]["impact"]["direct"]}) for case in cases)
        aggregate[mode] = {
            "retrieval": {
                "macro_precision_at_k": _mean([item["precision_at_k"] for item in retrieval]),
                "macro_recall_at_k": _mean([item["recall_at_k"] for item in retrieval]),
                "micro_precision_at_k": _ratio(sum(item["hits"] for item in retrieval), k * len(cases)),
                "micro_recall_at_k": _ratio(sum(item["hits"] for item in retrieval),
                                            sum(item["relevant"] for item in retrieval)),
            },
            "impact": {
                "macro_precision": _mean([item["precision"] for item in impacts]),
                "macro_recall": _mean([item["recall"] for item in impacts]),
                "macro_f1": _mean([item["f1"] for item in impacts]),
                "micro_precision": precision, "micro_recall": recall, "micro_f1": _f1(precision, recall),
                "direct_recall": _ratio(direct_hits, direct_count),
                "indirect_recall": _ratio(hits - direct_hits, indirect_count),
                "true_positives": hits, "false_positives": predicted - hits,
                "false_negatives": relevant - hits,
            },
            "unsupported_impact_claims": sum(item["unsupported_impact_claims"] for item in metrics),
            "mean_latency_seconds": _mean([item["latency_seconds"] for item in metrics]),
            "reported_token_usage": None,
        }
    aggregate["scripted_visual_concept_agreement"] = {
        "macro_precision": _mean([case["metrics"]["scripted_visual_concept_agreement"]["precision"] for case in cases]),
        "macro_recall": _mean([case["metrics"]["scripted_visual_concept_agreement"]["recall"] for case in cases]),
        "meaning": "Fixture-script agreement only; not real vision-model accuracy",
    }
    return aggregate


def replay_artifact(artifact: dict) -> dict:
    """Recalculate scores from saved predictions only, with no provider or image access."""
    if artifact.get("schema_version") != 1 or artifact.get("mode") != "scripted_mock_offline":
        raise ValueError("Unsupported multimodal evaluation artifact")
    result = copy.deepcopy(artifact)
    k = result["top_k"]
    if not isinstance(k, int) or k <= 0:
        raise ValueError("Invalid retrieval K")
    for case in result["cases"]:
        actual = _case_metrics(case, k)
        if "metrics" in case and case["metrics"] != actual:
            raise ValueError(f"Saved metrics differ from predictions: {case['id']}")
        case["metrics"] = actual
    aggregate = _aggregate(result["cases"], k)
    if "aggregate" in result and result["aggregate"] != aggregate:
        raise ValueError("Saved aggregate metrics differ from predictions")
    result["aggregate"] = aggregate
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dataset", type=Path, default=FIXTURE)
    parser.add_argument("--output", type=Path, default=ROOT / "data/multimodal_evaluation_v1.json")
    parser.add_argument("--replay", type=Path, help="Replay saved predictions without reading images or invoking a provider")
    args = parser.parse_args()
    if args.replay:
        result = replay_artifact(json.loads(args.replay.read_text(encoding="utf-8")))
    else:
        try:
            args.output.resolve().relative_to((ROOT / "data").resolve())
        except ValueError:
            raise ValueError("Evaluation traces must be saved in the Git-ignored data directory") from None
        result = run_offline(args.dataset, args.output)
    print(json.dumps({
        "dataset_version": result["dataset_version"], "dataset_size": len(result["cases"]),
        "mode": result["mode"], "code_commit_sha": result["code_commit_sha"],
        "worktree_dirty": result["worktree_dirty"], "aggregate": result["aggregate"],
    }, indent=2))


if __name__ == "__main__":
    main()
