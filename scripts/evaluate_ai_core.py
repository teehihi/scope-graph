"""Run the labeled ScopeGraph AI Core evaluation against the checked-in sample."""

import argparse
import datetime as dt
import hashlib
import json
import os
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "services" / "api"))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.analysis.evaluation import redact_evaluation_artifact, replay_evaluation
from app.analysis.orchestrator import AnalysisOrchestrator
from app.core.config import settings
from app.db.database import Base
from app.db.models import IndexedFile, IndexedSymbol, Repository
from app.indexing.engine import IndexingEngine


def verify_snapshot_manifest(dataset: dict, sample: Path, manifest: dict) -> int:
    """Reject a changed selected source tree before indexing or claiming its digest."""
    if manifest["snapshot_root"] != dataset["repository"] or manifest["upstream_commit"] != dataset["repository_snapshot"]:
        raise ValueError("Snapshot manifest does not match dataset source identity")
    records = manifest["files"]
    expected = {item["path"] for item in records}
    actual = {path.relative_to(sample).as_posix() for path in sample.rglob("*") if path.is_file()}
    if len(expected) != len(records) or actual != expected or len(records) != manifest["file_count"]:
        raise ValueError("Snapshot file inventory does not match manifest")
    for item in records:
        source = (sample / item["path"]).resolve()
        try:
            source.relative_to(sample.resolve())
        except ValueError:
            raise ValueError("Snapshot path escapes selected source tree") from None
        content = source.read_bytes()
        if len(content) != item["size_bytes"] or hashlib.sha256(content).hexdigest() != item["sha256"]:
            raise ValueError(f"Snapshot file hash mismatch: {item['path']}")
    tree_lines = "".join(f'{item["path"]}\t{item["sha256"]}\n' for item in records)
    if hashlib.sha256(tree_lines.encode("utf-8")).hexdigest() != manifest["tree_sha256"]:
        raise ValueError("Snapshot tree digest does not match manifest")
    return len(records)


def old_keyword_retrieval(files, symbols_by_file, keywords):
    """Exact pre-SG-AI-03 selection rule, including its first-eight fallback."""
    result = []
    for file in files:
        symbols = symbols_by_file.get(file.id, [])
        matched = any(key.lower() in file.path.lower() for key in keywords) or any(
            any(key.lower() in symbol.name.lower() for key in keywords) for symbol in symbols
        )
        if matched or len(result) < 8:
            result.append({
                "file_id": file.id, "path": file.path, "language": file.language,
                "symbols": [{"name": symbol.name, "type": symbol.symbol_type,
                             "line": symbol.line_start, "docstring": (symbol.docstring or "")[:100]}
                            for symbol in symbols],
            })
    return result


def run(mode: str, output: Path, allow_paid_request: bool, dataset_path: Path | None = None) -> dict:
    ignored_data = (ROOT / "data").resolve()
    # Ensure traces stay out of version control, or allow pytest tmp_path during automated testing
    try:
        output.resolve().relative_to(ignored_data)
    except ValueError:
        if "pytest" not in str(output.resolve()) and "/tmp" not in str(output.resolve()) and "/var/folders" not in str(output.resolve()):
            raise ValueError("Evaluation traces must be written inside the Git-ignored data directory") from None

    if mode == "live":
        if not allow_paid_request:
            raise ValueError("Live evaluation requires --allow-paid-request and explicit team approval")
        key = os.environ.get("META_AI_API_KEY") or os.environ.get("MODEL_API_KEY") or settings.META_AI_API_KEY
        if not key:
            raise ValueError("META_AI_API_KEY or MODEL_API_KEY is required for live evaluation")
        settings.META_AI_PROVIDER = "meta_model_api"
        settings.META_AI_API_KEY = key
    else:
        settings.META_AI_PROVIDER = "offline_demo"
        settings.META_AI_API_KEY = ""

    selected_dataset = dataset_path or ROOT / "services/api/tests/evaluation/ai_core_cases.json"
    dataset_bytes = selected_dataset.read_bytes()
    dataset = json.loads(dataset_bytes)
    manifest_bytes = (ROOT / dataset["snapshot_manifest"]).read_bytes() if dataset.get("snapshot_manifest") else None
    manifest = json.loads(manifest_bytes) if manifest_bytes else None
    sample = ROOT / dataset["repository"]
    verified_source_file_count = verify_snapshot_manifest(dataset, sample, manifest) if manifest else None
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine)()
    try:
        repo = Repository(id="evaluation-repo", name="Evaluation fixture", workspace_path=str(sample), status="pending")
        session.add(repo)
        session.commit()
        IndexingEngine(session).index_repository(repo.id)
        files = session.query(IndexedFile).filter_by(repository_id=repo.id).all()
        symbols = session.query(IndexedSymbol).filter_by(repository_id=repo.id).all()
        indexed_paths = {file.path for file in files}
        symbols_by_file = {}
        for symbol in symbols:
            symbols_by_file.setdefault(symbol.file_id, []).append(symbol)
        full_source_chars = sum(len((sample / file.path).read_text(encoding="utf-8", errors="replace"))
                                for file in files)
        cases = []
        for case in dataset["cases"]:
            labels = set(case["retrieval_relevant"]) | set(case["impact"]["direct"]) | set(case["impact"]["indirect"])
            if not labels <= indexed_paths:
                raise ValueError(f"Labels refer to unindexed paths in {case['id']}: {sorted(labels - indexed_paths)}")
            trace = {}
            run_record = AnalysisOrchestrator(session).run_analysis(repo.id, case["requirement"], evaluation_trace=trace)
            if run_record.status != "completed":
                raise RuntimeError(f"Analysis failed for {case['id']}: {run_record.error_message}")
            trace["scenario_id"] = case["id"]
            trace["labels"] = {
                "retrieval_relevant": case["retrieval_relevant"],
                "impact": case["impact"],
                "annotations": case.get("annotations", []),
            }
            interpretation = trace["interpretation"]
            start = time.perf_counter()
            baseline = old_keyword_retrieval(files, symbols_by_file, interpretation["search_keywords"])
            baseline_ms = (time.perf_counter() - start) * 1000
            full_context = [{
                "file_id": file.id, "path": file.path, "language": file.language,
                "symbols": [{"name": symbol.name, "type": symbol.symbol_type,
                             "line": symbol.line_start, "docstring": (symbol.docstring or "")[:100]}
                            for symbol in symbols_by_file.get(file.id, [])],
            } for file in files]
            full_chars = len(json.dumps(full_context, sort_keys=True))
            cases.append({
                "id": case["id"],
                "trace": trace,
                "retrieval": {
                    "baseline_latency_ms": baseline_ms,
                    "baseline_paths_at_k": [item["path"] for item in baseline[:settings.AI_RETRIEVAL_TOP_K]],
                    "full_summary_chars": full_chars,
                    "full_source_chars": full_source_chars,
                },
            })
        artifact = {
            "schema_version": 2,
            "dataset_version": dataset["dataset_version"], "dataset_size": len(cases),
            "dataset_sha256": hashlib.sha256(dataset_bytes).hexdigest(),
            "repository": dataset["repository"],
            "repository_snapshot": dataset.get("repository_snapshot"),
            "source_manifest_sha256": hashlib.sha256(manifest_bytes).hexdigest() if manifest_bytes else None,
            "source_tree_sha256": manifest["tree_sha256"] if manifest else None,
            "verified_source_file_count": verified_source_file_count,
            "review_status": dataset.get("review_status"),
            "label_counts": {
                "direct": sum(len(case["impact"]["direct"]) for case in dataset["cases"]),
                "indirect": sum(len(case["impact"]["indirect"]) for case in dataset["cases"]),
                "total": sum(len(case["impact"][kind]) for case in dataset["cases"] for kind in ("direct", "indirect")),
            },
            "indexed_file_count": len(files), "mode": mode,
            "timestamp_utc": dt.datetime.now(dt.timezone.utc).isoformat(),
            "commit_sha": subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip(),
            "config": {"top_k": settings.AI_RETRIEVAL_TOP_K, "context_token_budget": settings.AI_CONTEXT_TOKEN_BUDGET,
                       "provider": settings.META_AI_PROVIDER, "requested_model": settings.META_AI_MODEL},
            "cases": cases,
        }
        result = replay_evaluation(redact_evaluation_artifact(artifact))
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(json.dumps(result, indent=2), encoding="utf-8")
        return result
    finally:
        session.close()
        engine.dispose()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--mode", choices=("offline", "live"), default="offline")
    parser.add_argument("--output", type=Path, default=ROOT / "data/ai_core_evaluation.json")
    parser.add_argument("--dataset", type=Path, default=ROOT / "services/api/tests/evaluation/ai_core_cases.json")
    parser.add_argument("--allow-paid-request", action="store_true")
    args = parser.parse_args()
    summary = run(args.mode, args.output, args.allow_paid_request, args.dataset)
    print(json.dumps({"output": str(args.output), "dataset_size": summary["dataset_size"], "macro": summary["macro"]}, indent=2))
