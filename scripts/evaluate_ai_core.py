"""Run the labeled ScopeGraph AI Core evaluation against the checked-in sample."""

import argparse
import datetime as dt
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
    try:
        output.resolve().relative_to(ignored_data)
    except ValueError:
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

    dataset = json.loads((dataset_path or ROOT / "services/api/tests/evaluation/ai_core_cases.json").read_text(encoding="utf-8"))
    sample = ROOT / dataset["repository"]
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
            "repository_snapshot": dataset.get("repository_snapshot"),
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
