import uuid
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.db.database import get_db
from app.db.models import Repository, AnalysisRun
from app.jobs.queue import enqueue_job, get_cache, set_cache, make_analysis_cache_key
from app.jobs.tasks import task_run_analysis
from app.analysis.orchestrator import AnalysisOrchestrator
from app.core.config import settings

router = APIRouter(tags=["analysis"])

class AnalyzeRequest(BaseModel):
    requirement: str
    run_sync: bool = False

@router.post("/repositories/{repository_id}/analyze")
def trigger_analysis(
    repository_id: str,
    payload: AnalyzeRequest,
    db: Session = Depends(get_db)
):
    repo = db.query(Repository).filter(Repository.id == repository_id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
    if repo.status != "ready":
        raise HTTPException(status_code=400, detail=f"Repository is not ready for analysis (status: {repo.status})")

    req_text = payload.requirement.strip()
    if not req_text:
        raise HTTPException(status_code=400, detail="Requirement text cannot be empty")

    # Check cache for repeatable identical queries
    cache_key = make_analysis_cache_key(repository_id, req_text, settings.META_AI_MODEL)
    cached_result = get_cache(cache_key)
    if cached_result:
        # Cache hit: record or return cached run
        run = AnalysisRun(
            repository_id=repository_id,
            requirement_text=req_text,
            status="completed",
            provider=cached_result.get("operational_metadata", {}).get("provider", "cached"),
            model=cached_result.get("operational_metadata", {}).get("model", settings.META_AI_MODEL),
            result_json=cached_result,
            brief_markdown=cached_result.get("brief_markdown", ""),
            execution_time_seconds=0.01,
        )
        db.add(run)
        db.commit()
        db.refresh(run)
        return {
            "analysis_id": run.id,
            "status": "completed",
            "cached": True,
            "result": cached_result,
            "brief": run.brief_markdown,
        }

    analysis_id = str(uuid.uuid4())
    run = AnalysisRun(
        id=analysis_id,
        repository_id=repository_id,
        requirement_text=req_text,
        status="queued" if not payload.run_sync else "processing",
    )
    db.add(run)
    db.commit()

    if payload.run_sync:
        orchestrator = AnalysisOrchestrator(db)
        completed_run = orchestrator.run_analysis(repository_id, req_text, analysis_id=analysis_id)
        # Store in cache
        if completed_run.result_json:
            cache_payload = dict(completed_run.result_json)
            cache_payload["brief_markdown"] = completed_run.brief_markdown
            set_cache(cache_key, cache_payload)
        return {
            "analysis_id": completed_run.id,
            "status": completed_run.status,
            "result": completed_run.result_json,
            "brief": completed_run.brief_markdown,
        }
    else:
        # Enqueue in Redis queue
        job_id = enqueue_job(task_run_analysis, repository_id, req_text, analysis_id)
        return {
            "analysis_id": analysis_id,
            "job_id": job_id,
            "status": "queued",
        }

@router.get("/analyses/{analysis_id}")
def get_analysis_status(analysis_id: str, db: Session = Depends(get_db)):
    run = db.query(AnalysisRun).filter(AnalysisRun.id == analysis_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Analysis run not found")
    return {
        "analysis_id": run.id,
        "repository_id": run.repository_id,
        "status": run.status,
        "requirement": run.requirement_text,
        "provider": run.provider,
        "model": run.model,
        "execution_time_seconds": run.execution_time_seconds,
        "created_at": run.created_at,
        "completed_at": run.completed_at,
        "error_message": run.error_message,
        "has_result": run.result_json is not None and len(run.result_json) > 0,
    }

@router.get("/analyses/{analysis_id}/report")
def get_analysis_report(analysis_id: str, db: Session = Depends(get_db)):
    run = db.query(AnalysisRun).filter(AnalysisRun.id == analysis_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Analysis run not found")
    if run.status != "completed":
        raise HTTPException(status_code=400, detail=f"Analysis is not completed (current status: {run.status})")
    return run.result_json

@router.get("/analyses/{analysis_id}/implementation-brief")
def get_analysis_brief(analysis_id: str, db: Session = Depends(get_db)):
    run = db.query(AnalysisRun).filter(AnalysisRun.id == analysis_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Analysis run not found")
    if run.status != "completed":
        raise HTTPException(status_code=400, detail=f"Analysis is not completed (current status: {run.status})")
    return {
        "analysis_id": run.id,
        "requirement": run.requirement_text,
        "brief_markdown": run.brief_markdown,
    }
