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

from app.ai.provider import get_ai_provider
from app.analysis.evaluation import grounding_metrics, impact_metrics, retrieval_metrics
from app.analysis.orchestrator import AnalysisOrchestrator
from app.analysis.retriever import HybridRetriever
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


def average(values):
    present = [value for value in values if value is not None]
    return sum(present) / len(present) if present else None


def run(mode: str, output: Path, allow_paid_request: bool) -> dict:
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

    dataset = json.loads((ROOT / "services/api/tests/evaluation/ai_core_cases.json").read_text(encoding="utf-8"))
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
        cases = []
        for case in dataset["cases"]:
            labels = set(case["retrieval_relevant"]) | set(case["impact"]["direct"]) | set(case["impact"]["indirect"])
            if not labels <= indexed_paths:
                raise ValueError(f"Labels refer to unindexed paths in {case['id']}: {sorted(labels - indexed_paths)}")
            interpretation = get_ai_provider().interpret_requirement(case["requirement"]).data
            start = time.perf_counter()
            baseline = old_keyword_retrieval(files, symbols_by_file, interpretation["search_keywords"])
            baseline_ms = (time.perf_counter() - start) * 1000
            retrieved = HybridRetriever(session).retrieve(
                repo.id, case["requirement"], interpretation["search_keywords"], interpretation["affected_layers"],
                settings.AI_RETRIEVAL_TOP_K, settings.AI_CONTEXT_TOKEN_BUDGET,
            )
            run_record = AnalysisOrchestrator(session).run_analysis(repo.id, case["requirement"])
            if run_record.status != "completed":
                raise RuntimeError(f"Analysis failed for {case['id']}: {run_record.error_message}")
            report = run_record.result_json
            accepted = report["affected_items"]
            rejected = report["rejected_hallucinations"]
            full_context = [{
                "file_id": file.id, "path": file.path, "language": file.language,
                "symbols": [{"name": symbol.name, "type": symbol.symbol_type,
                             "line": symbol.line_start, "docstring": (symbol.docstring or "")[:100]}
                            for symbol in symbols_by_file.get(file.id, [])],
            } for file in files]
            selected_chars = len(json.dumps(retrieved.items, sort_keys=True))
            full_chars = len(json.dumps(full_context, sort_keys=True))
            cases.append({
                "id": case["id"],
                "retrieval": {
                    "hybrid": retrieval_metrics([item["path"] for item in retrieved.items], set(case["retrieval_relevant"]), settings.AI_RETRIEVAL_TOP_K),
                    "keyword_baseline": retrieval_metrics([item["path"] for item in baseline], set(case["retrieval_relevant"]), settings.AI_RETRIEVAL_TOP_K),
                    "hybrid_latency_ms": retrieved.latency_seconds * 1000,
                    "baseline_latency_ms": baseline_ms,
                    "hybrid_paths": [item["path"] for item in retrieved.items],
                    "baseline_paths_at_k": [item["path"] for item in baseline[:settings.AI_RETRIEVAL_TOP_K]],
                    "estimated_selected_tokens": (selected_chars + 3) // 4,
                    "estimated_full_summary_tokens": (full_chars + 3) // 4,
                    "context_reduction_vs_full_summary": 1 - selected_chars / full_chars if full_chars else None,
                },
                "impact": impact_metrics(accepted, case["impact"]),
                "grounding": grounding_metrics([*accepted, *rejected], accepted, rejected, case["impact"]),
                "analysis_latency_seconds": run_record.execution_time_seconds,
                "reported_token_usage": report["operational_metadata"]["token_usage"],
                "provider": run_record.provider, "model": run_record.model,
            })
        result = {
            "dataset_version": dataset["dataset_version"], "dataset_size": len(cases),
            "indexed_file_count": len(files), "mode": mode,
            "timestamp_utc": dt.datetime.now(dt.timezone.utc).isoformat(),
            "commit_sha": subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip(),
            "config": {"top_k": settings.AI_RETRIEVAL_TOP_K, "context_token_budget": settings.AI_CONTEXT_TOKEN_BUDGET,
                       "provider": settings.META_AI_PROVIDER, "requested_model": settings.META_AI_MODEL},
            "cases": cases,
        }
        result["macro"] = {
            method: {metric: average([case["retrieval"][method][metric] for case in cases])
                     for metric in ("precision_at_k", "recall_at_k", "mrr")}
            for method in ("hybrid", "keyword_baseline")
        }
        result["macro"].update({
            "impact": {metric: average([case["impact"][metric] for case in cases])
                       for metric in ("precision", "recall", "f1", "direct_recall", "indirect_recall")},
            "grounding": {
                "total_claims": sum(case["grounding"]["total_claims"] for case in cases),
                "accepted_claims": sum(case["grounding"]["accepted_claims"] for case in cases),
                "rejected_claims": sum(case["grounding"]["rejected_claims"] for case in cases),
                **{rate: (
                    sum(case["grounding"][count] for case in cases)
                    / sum(case["grounding"]["total_claims"] for case in cases)
                    if sum(case["grounding"]["total_claims"] for case in cases) else None
                ) for count, rate in (
                    ("hallucinated_files", "hallucinated_file_rate"),
                    ("invalid_symbols", "invalid_symbol_rate"),
                    ("unsupported_claims", "unsupported_claim_rate"),
                )},
            },
            "hybrid_latency_ms": average([case["retrieval"]["hybrid_latency_ms"] for case in cases]),
            "baseline_latency_ms": average([case["retrieval"]["baseline_latency_ms"] for case in cases]),
            "context_reduction_vs_full_summary": average([case["retrieval"]["context_reduction_vs_full_summary"] for case in cases]),
            "analysis_latency_seconds": average([case["analysis_latency_seconds"] for case in cases]),
        })
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
    parser.add_argument("--allow-paid-request", action="store_true")
    args = parser.parse_args()
    summary = run(args.mode, args.output, args.allow_paid_request)
    print(json.dumps({"output": str(args.output), "dataset_size": summary["dataset_size"], "macro": summary["macro"]}, indent=2))
