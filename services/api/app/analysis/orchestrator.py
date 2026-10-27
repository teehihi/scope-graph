import time
import datetime
import logging
from typing import Any
from sqlalchemy.orm import Session
from app.db.models import Repository, IndexedFile, IndexedSymbol, AnalysisRun
from app.graph.engine import GraphEngine
from app.ai.provider import get_ai_provider
from app.core.config import settings
from app.evidence.validator import EvidenceValidator

logger = logging.getLogger(__name__)

class AnalysisOrchestrator:
    def __init__(self, db: Session):
        self.db = db

    def run_analysis(self, repository_id: str, requirement: str, analysis_id: str | None = None) -> AnalysisRun:
        repo = self.db.query(Repository).filter(Repository.id == repository_id).first()
        if not repo:
            raise ValueError(f"Repository {repository_id} not found")

        if repo.status != "ready":
            raise ValueError(f"Repository is not ready for analysis (current status: {repo.status})")

        start_time = time.time()

        # Find or create AnalysisRun record
        if analysis_id:
            run = self.db.query(AnalysisRun).filter(AnalysisRun.id == analysis_id).first()
            if not run:
                run = AnalysisRun(id=analysis_id, repository_id=repository_id, requirement_text=requirement)
                self.db.add(run)
        else:
            run = AnalysisRun(repository_id=repository_id, requirement_text=requirement)
            self.db.add(run)

        run.status = "processing"
        run.provider = settings.META_AI_PROVIDER
        run.model = settings.META_AI_MODEL
        self.db.commit()

        try:
            provider = get_ai_provider()
            run.provider = getattr(provider, "provider_name", run.provider)
            run.model = getattr(provider, "model", run.model)
            self.db.commit()

            # Step 1: Interpret Requirement
            logger.info("Step 1: Interpreting requirement '%s'", requirement[:60])
            interpretation_resp = provider.interpret_requirement(requirement)
            interpretation = interpretation_resp.data

            # Step 2: Retrieve Relevant Files and Context from Index
            logger.info("Step 2: Retrieving repository evidence based on semantic interpretation")
            keywords = interpretation.get("search_keywords", ["user", "email"])
            db_files = self.db.query(IndexedFile).filter(IndexedFile.repository_id == repository_id).all()
            all_symbols = self.db.query(IndexedSymbol).filter(IndexedSymbol.repository_id == repository_id).all()

            symbols_by_file: dict[str, list[dict[str, Any]]] = {}
            for s in all_symbols:
                symbols_by_file.setdefault(s.file_id, []).append({
                    "name": s.name,
                    "type": s.symbol_type,
                    "line": s.line_start,
                    "docstring": s.docstring[:100] if s.docstring else ""
                })

            retrieved_files: list[dict[str, Any]] = []
            seed_paths: list[str] = []

            for f in db_files:
                f_syms = symbols_by_file.get(f.id, [])
                # Check keyword match
                is_match = any(k.lower() in f.path.lower() for k in keywords) or any(
                    any(k.lower() in s["name"].lower() for k in keywords) for s in f_syms
                )
                if is_match or len(retrieved_files) < 8:
                    retrieved_files.append({
                        "file_id": f.id,
                        "path": f.path,
                        "language": f.language,
                        "symbols": f_syms,
                    })
                    if is_match:
                        seed_paths.append(f.path)

            # Step 3: Graph Traversal for Downstream / Upstream Connections
            logger.info("Step 3: Traversing dependency graph for seed paths: %s", seed_paths)
            graph_engine = GraphEngine(self.db)
            dependency_context = graph_engine.find_connected_files(repository_id, seed_paths)

            # Step 4: AI Semantic Reasoning
            logger.info("Step 4: Performing AI semantic impact reasoning")
            reasoning_resp = provider.reason_about_impact(
                requirement_interpretation=interpretation,
                retrieved_files=retrieved_files,
                dependency_context=dependency_context,
            )
            raw_impact = reasoning_resp.data

            # Step 5: Completeness Review
            logger.info("Step 5: Reviewing impact analysis completeness")
            repo_file_map = {f.path: f.id for f in db_files}
            completeness_resp = provider.review_completeness(
                requirement=requirement,
                proposed_impact=raw_impact,
                repository_context=repo_file_map,
            )
            completeness = completeness_resp.data
            inference_responses = (interpretation_resp, reasoning_resp, completeness_resp)
            usage_records = [resp.token_usage for resp in inference_responses if resp.token_usage]
            token_usage = (
                {key: sum(usage.get(key, 0) for usage in usage_records) for key in set().union(*(usage.keys() for usage in usage_records))}
                if usage_records else None
            )

            # Step 6: Validate Claims against Actual Repository Index
            logger.info("Step 6: Validating claims against ground-truth index")
            validator = EvidenceValidator(self.db, repo.workspace_path or "")
            validated = validator.validate_ai_claims(repository_id, raw_impact)

            # Combine into final structured report
            final_report = {
                "requirement_summary": requirement,
                "interpretation": interpretation,
                "affected_items": validated["affected_items"],
                "risks": validated["risks"],
                "suggested_tests": validated["suggested_tests"],
                "assumptions": validated["assumptions"],
                "coverage_review": completeness,
                "validation_metrics": validated["validation_metrics"],
                "rejected_hallucinations": validated["rejected_hallucinations"],
                "operational_metadata": {
                    "provider": reasoning_resp.provider,
                    "model": reasoning_resp.model,
                    "is_demo_mode": reasoning_resp.is_mock_or_demo,
                    "structured_inference_latency_seconds": round(sum(resp.latency_seconds for resp in inference_responses), 3),
                    "token_usage": token_usage,
                    "execution_time_seconds": round(time.time() - start_time, 2),
                    "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                }
            }

            # Step 7: Generate Implementation Brief
            logger.info("Step 7: Generating implementation brief for coding agents")
            brief_md = provider.generate_implementation_brief(requirement, final_report)
            metadata = final_report["operational_metadata"]
            brief_latency = getattr(provider, "brief_latency_seconds", 0.0)
            metadata["inference_latency_seconds"] = round(
                sum(resp.latency_seconds for resp in inference_responses) + brief_latency, 3
            )
            brief_usage = getattr(provider, "brief_token_usage", None)
            if brief_usage:
                total_usage = metadata["token_usage"] or {}
                for key, value in brief_usage.items():
                    total_usage[key] = total_usage.get(key, 0) + value
                metadata["token_usage"] = total_usage

            # Update database record
            total_duration = time.time() - start_time
            metadata["execution_time_seconds"] = round(total_duration, 2)
            run.status = "completed"
            run.provider = reasoning_resp.provider
            run.model = reasoning_resp.model
            run.result_json = final_report
            run.brief_markdown = brief_md
            run.execution_time_seconds = total_duration
            run.completed_at = datetime.datetime.now(datetime.timezone.utc)
            self.db.commit()
            self.db.refresh(run)
            return run

        except Exception as e:
            logger.exception("Analysis execution failed for repo %s", repository_id)
            run.status = "failed"
            run.error_message = str(e)
            run.completed_at = datetime.datetime.now(datetime.timezone.utc)
            self.db.commit()
            return run
