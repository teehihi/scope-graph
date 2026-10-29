import time
import datetime
import logging
from typing import Any
from sqlalchemy.orm import Session
from app.db.models import Repository, IndexedFile, AnalysisRun
from app.graph.engine import GraphEngine
from app.analysis.retriever import HybridRetriever
from app.analysis.causal import CausalImpactVerifier
from app.analysis.explanations import explain_item
from app.ai.provider import get_ai_provider
from app.ai.routing import AIStage, StageExecutionError, StageProviderRouter, build_stage_router
from app.ai.image_input import ValidatedScreenshot
from app.ai.schemas import StructuredVisualIntent
from app.core.config import settings
from app.evidence.validator import EvidenceValidator

logger = logging.getLogger(__name__)

class AnalysisOrchestrator:
    def __init__(self, db: Session, stage_router: StageProviderRouter | None = None):
        self.db = db
        self.stage_router = stage_router

    def run_analysis(
        self, repository_id: str, requirement: str, analysis_id: str | None = None,
        evaluation_trace: dict[str, Any] | None = None,
        target_language: str = "en",
        screenshot: ValidatedScreenshot | None = None,
    ) -> AnalysisRun:
        if screenshot is not None and not isinstance(screenshot, ValidatedScreenshot):
            raise TypeError("screenshot must be a ValidatedScreenshot")
        if screenshot is not None and not requirement.strip():
            raise ValueError("A text requirement is required with a screenshot")
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

        router: StageProviderRouter | None = None
        try:
            router = self.stage_router or build_stage_router(get_ai_provider())
            run.provider = router.profile
            self.db.commit()

            visual_resp = None
            visual_intent = None
            if screenshot is not None:
                logger.info("Interpreting validated screenshot for repository %s", repository_id)
                try:
                    visual_resp = router.execute(AIStage.VISION, "interpret_screenshot", requirement, screenshot)
                    visual_intent = StructuredVisualIntent.model_validate(visual_resp.data)
                except Exception as error:
                    if (isinstance(error, StageExecutionError) and error.code == "vision_unavailable_offline"
                            and router.profile == "meta_only"
                            and router.routes[AIStage.VISION] == "offline_demo"):
                        raise ValueError("Screenshot interpretation unavailable in offline demo mode") from None
                    raise ValueError("Screenshot interpretation failed or returned invalid visual intent") from None

            # Step 1: Interpret Requirement
            logger.info("Step 1: Interpreting requirement for repository %s", repository_id)
            interpretation_resp = router.execute(
                AIStage.REQUIREMENT_INTERPRETATION, "interpret_requirement", requirement,
            )
            interpretation = interpretation_resp.data

            # Step 2: Retrieve Relevant Files and Context from Index
            logger.info("Step 2: Retrieving repository evidence based on semantic interpretation")
            retrieval = HybridRetriever(self.db).retrieve(
                repository_id=repository_id,
                query=requirement,
                search_keywords=interpretation.get("search_keywords", []),
                affected_layers=interpretation.get("affected_layers", []),
                top_k=settings.AI_RETRIEVAL_TOP_K,
                context_token_budget=settings.AI_CONTEXT_TOKEN_BUDGET,
                visual_intent=visual_intent,
            )
            retrieved_files = retrieval.items
            seed_paths = retrieval.seed_paths
            db_files = self.db.query(IndexedFile).filter(IndexedFile.repository_id == repository_id).all()

            # Step 3: Graph Traversal for Downstream / Upstream Connections
            logger.info("Step 3: Traversing dependency graph for seed paths: %s", seed_paths)
            graph_engine = GraphEngine(self.db)
            dependency_context = graph_engine.find_connected_files(repository_id, seed_paths)

            # Step 4: AI Semantic Reasoning
            logger.info("Step 4: Performing AI semantic impact reasoning")
            reasoning_resp = router.execute(AIStage.IMPACT_REASONING, "reason_about_impact",
                requirement_interpretation=interpretation,
                retrieved_files=retrieved_files,
                dependency_context=dependency_context,
            )
            raw_impact = reasoning_resp.data

            # Step 5: Completeness Review
            logger.info("Step 5: Reviewing impact analysis completeness")
            repo_file_map = {f.path: f.id for f in db_files}
            completeness_resp = router.execute(AIStage.COMPLETENESS_REVIEW, "review_completeness",
                requirement=requirement,
                proposed_impact=raw_impact,
                repository_context=repo_file_map,
            )
            completeness = completeness_resp.data
            inference_responses = (
                (visual_resp, interpretation_resp, reasoning_resp, completeness_resp)
                if visual_resp is not None else (interpretation_resp, reasoning_resp, completeness_resp)
            )
            usage_records = [resp.token_usage for resp in inference_responses if resp.token_usage]
            token_usage = (
                {key: sum(usage.get(key, 0) for usage in usage_records) for key in set().union(*(usage.keys() for usage in usage_records))}
                if usage_records else None
            )

            # Step 6: Validate Claims against Actual Repository Index
            logger.info("Step 6: Validating claims against ground-truth index")
            validator = EvidenceValidator(self.db, repo.workspace_path or "")
            existence_validated = validator.validate_ai_claims(repository_id, raw_impact)
            review_candidates = validator.validate_ai_claims(repository_id, {
                "affected_items": [
                    {"file_path": path, "symbol": None, "impact_type": "indirect",
                     "category": "module", "reason": "Completeness review candidate", "confidence": 0.0}
                    for path in completeness.get("additional_files_to_check", [])
                ]
            })
            verified_review_paths = list(dict.fromkeys(
                item["file_path"] for item in review_candidates["affected_items"]
            ))
            coverage_review = {
                **completeness,
                "additional_files_to_check": verified_review_paths,
                "rejected_file_suggestions": review_candidates["rejected_hallucinations"],
            }
            if review_candidates["rejected_hallucinations"]:
                coverage_review["is_complete"] = False
                coverage_review["potential_gaps"] = [
                    *completeness.get("potential_gaps", []),
                    "Some suggested files could not be verified against the repository index",
                ]

            causal = CausalImpactVerifier(self.db).classify(
                repository_id, requirement, existence_validated, verified_review_paths,
            )
            validated = {
                **existence_validated,
                "affected_items": causal["affected_items"],
                "potential_claims": causal["potential_claims"],
                "validation_metrics": causal["validation_metrics"],
            }
            coverage_review["promoted_files"] = causal["promoted_suggestions"]

            affected_paths = {item["file_path"] for item in validated["affected_items"]}
            potential_by_path: dict[str, dict[str, Any]] = {}
            for item in causal["potential_claims"]:
                potential_by_path[item["file_path"]] = {
                    **item, "sources": ["unconfirmed_claim"], "dependency_paths": {},
                }
            for direction in ("upstream", "downstream"):
                for path, route in dependency_context["paths"][direction].items():
                    if path in affected_paths:
                        continue
                    candidate = potential_by_path.setdefault(path, {
                        "file_path": path, "impact_status": "potential",
                        "existence_verified": True, "impact_supported": False,
                        "sources": ["dependency_graph"], "dependency_paths": {},
                    })
                    candidate["dependency_paths"][direction] = route
                    if "dependency_graph" not in candidate["sources"]:
                        candidate["sources"].append("dependency_graph")
            for path in verified_review_paths:
                if path in affected_paths:
                    continue
                candidate = potential_by_path.setdefault(path, {
                    "file_path": path, "impact_status": "potential",
                    "existence_verified": True, "impact_supported": False,
                    "sources": [], "dependency_paths": {},
                })
                if "completeness_review" not in candidate["sources"]:
                    candidate["sources"].append("completeness_review")

            explained_affected = [{**item, **explain_item(item)} for item in validated["affected_items"]]
            explained_potential = [
                {**potential_by_path[path], **explain_item(potential_by_path[path])}
                for path in sorted(potential_by_path)
            ]

            # Combine into final structured report
            final_report = {
                "requirement_summary": requirement,
                "interpretation": interpretation,
                "affected_items": explained_affected,
                "affected_functional_areas": sorted({
                    item["simple_explanation"]["functional_area"] for item in explained_affected
                }),
                "risks": validated["risks"],
                "suggested_tests": validated["suggested_tests"],
                "assumptions": validated["assumptions"],
                "coverage_review": coverage_review,
                "potential_impacts": explained_potential,
                "risk_explanations": [
                    {"summary": risk, "evidence_status": "potential"} for risk in validated["risks"]
                ],
                "recommended_checks": validated["suggested_tests"],
                "retrieval_metadata": {
                    "selected_files": len(retrieved_files),
                    "candidate_files": retrieval.candidate_count,
                    "estimated_context_tokens": sum(item["estimated_tokens"] for item in retrieved_files),
                    "latency_seconds": round(retrieval.latency_seconds, 4),
                    "top_k": settings.AI_RETRIEVAL_TOP_K,
                    "context_token_budget": settings.AI_CONTEXT_TOKEN_BUDGET,
                },
                "validation_metrics": validated["validation_metrics"],
                "rejected_hallucinations": validated["rejected_hallucinations"],
                "operational_metadata": {
                    "provider": reasoning_resp.provider,
                    "model": reasoning_resp.model,
                    "profile": router.profile,
                    "is_demo_mode": reasoning_resp.is_mock_or_demo,
                    "structured_inference_latency_seconds": round(sum(resp.latency_seconds for resp in inference_responses), 3),
                    "token_usage": token_usage,
                    "execution_time_seconds": round(time.time() - start_time, 2),
                    "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                }
            }
            if visual_resp is not None:
                final_report["visual_context"] = {
                    "image_sha256": screenshot.sha256,
                    "mime_type": screenshot.mime_type,
                    "width": screenshot.width,
                    "height": screenshot.height,
                    "screen_type": visual_intent.screen_type,
                    "provider": visual_resp.provider,
                    "model": visual_resp.model,
                    "is_demo_mode": visual_resp.is_mock_or_demo,
                    "retrieval": retrieval.visual_metadata,
                    "uncertainties": visual_intent.uncertainties,
                }

            # Step 7: Generate Implementation Brief
            logger.info("Step 7: Generating implementation brief for coding agents (lang=%s)", target_language)
            # Visual observations are untrusted context. The brief receives grounded results only.
            brief_input = (final_report if visual_resp is None else
                           {key: value for key, value in final_report.items() if key != "visual_context"})
            brief_md = router.execute(AIStage.BRIEF_GENERATION, "generate_implementation_brief",
                                      requirement, brief_input, language=target_language)
            metadata = final_report["operational_metadata"]
            brief_stage = router.metadata[-1]
            brief_latency = brief_stage.duration_seconds
            metadata["inference_latency_seconds"] = round(
                sum(resp.latency_seconds for resp in inference_responses) + brief_latency, 3
            )
            brief_usage = brief_stage.token_usage
            if brief_usage:
                total_usage = metadata["token_usage"] or {}
                for key, value in brief_usage.items():
                    total_usage[key] = total_usage.get(key, 0) + value
                metadata["token_usage"] = total_usage
            metadata["stages"] = [entry.as_dict() for entry in router.metadata]

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
            if evaluation_trace is not None:
                evaluation_trace.update({
                    "requirement": requirement,
                    "interpretation": interpretation,
                    "retrieval": {
                        "ranked_files": [
                            {"rank": rank, "path": item["path"], "score": item["score"],
                             "reasons": item["reasons"], "estimated_tokens": item["estimated_tokens"]}
                            for rank, item in enumerate(retrieved_files, 1)
                        ],
                        "seed_paths": seed_paths,
                        "candidate_count": retrieval.candidate_count,
                        "latency_seconds": retrieval.latency_seconds,
                    },
                    "reasoning_context": {
                        "requirement_interpretation": interpretation,
                        "retrieved_files": retrieved_files,
                        "dependency_context": dependency_context,
                    },
                    "raw_impact": raw_impact,
                    "existence_validated_impact": existence_validated,
                    "validated_impact": {**validated, "affected_items": explained_affected},
                    "potential_impacts": final_report["potential_impacts"],
                    "raw_completeness_review": completeness,
                    "completeness_review": coverage_review,
                    "provider": run.provider,
                    "model": run.model,
                    "token_usage": metadata["token_usage"],
                    "analysis_latency_seconds": run.execution_time_seconds,
                    "stage_execution": metadata["stages"],
                })
                if visual_resp is not None:
                    evaluation_trace["visual_context"] = final_report["visual_context"]
            return run

        except Exception as e:
            logger.exception("Analysis execution failed for repo %s", repository_id)
            if evaluation_trace is not None and router is not None:
                evaluation_trace["stage_execution"] = [entry.as_dict() for entry in router.metadata]
            run.status = "failed"
            run.error_message = str(e)
            run.completed_at = datetime.datetime.now(datetime.timezone.utc)
            self.db.commit()
            return run
        finally:
            if router is not None and self.stage_router is None:
                router.close()
