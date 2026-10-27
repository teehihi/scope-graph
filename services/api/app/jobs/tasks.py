import logging
from app.db.database import SessionLocal
from app.indexing.engine import IndexingEngine
from app.analysis.orchestrator import AnalysisOrchestrator

logger = logging.getLogger(__name__)

def task_index_repository(repository_id: str):
    logger.info("Starting background indexing task for repository %s", repository_id)
    db = SessionLocal()
    try:
        engine = IndexingEngine(db)
        repo = engine.index_repository(repository_id)
        logger.info("Finished background indexing for repo %s (status: %s)", repository_id, repo.status)
        return {"status": repo.status, "stats": repo.stats}
    finally:
        db.close()

def task_run_analysis(repository_id: str, requirement: str, analysis_id: str):
    logger.info("Starting background analysis task %s for repository %s", analysis_id, repository_id)
    db = SessionLocal()
    try:
        orchestrator = AnalysisOrchestrator(db)
        run = orchestrator.run_analysis(repository_id, requirement, analysis_id=analysis_id)
        logger.info("Finished background analysis task %s (status: %s)", analysis_id, run.status)
        return {"status": run.status, "analysis_id": run.id}
    finally:
        db.close()
