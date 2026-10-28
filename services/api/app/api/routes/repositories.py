import os
import shutil
from pathlib import Path
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Query
from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.db.database import get_db
from app.db.models import Repository, IndexedFile, IndexedSymbol, DependencyEdge
from app.core.config import settings
from app.core.security import sanitize_filename, safe_extract_zip
from app.indexing.engine import IndexingEngine
from app.graph.engine import GraphEngine
from app.jobs.queue import enqueue_job
from app.jobs.tasks import task_index_repository

router = APIRouter(prefix="/repositories", tags=["repositories"])

class CreateRepoRequest(BaseModel):
    name: str
    description: str = ""

@router.post("")
def create_repository(payload: CreateRepoRequest, db: Session = Depends(get_db)):
    repo = Repository(
        name=payload.name,
        description=payload.description,
        status="pending"
    )
    db.add(repo)
    db.commit()
    db.refresh(repo)

    # Prepare dedicated workspace directory
    workspace_dir = os.path.abspath(os.path.join(settings.WORKSPACE_DIR, repo.id))
    os.makedirs(workspace_dir, exist_ok=True)
    repo.workspace_path = workspace_dir
    db.commit()
    db.refresh(repo)

    return repo

@router.get("")
def list_repositories(db: Session = Depends(get_db)):
    return db.query(Repository).order_by(Repository.created_at.desc()).all()

@router.get("/{repository_id}")
def get_repository(repository_id: str, db: Session = Depends(get_db)):
    repo = db.query(Repository).filter(Repository.id == repository_id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
    return repo

@router.post("/{repository_id}/upload")
async def upload_repository_zip(
    repository_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    repo = db.query(Repository).filter(Repository.id == repository_id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    if not file.filename or not file.filename.endswith(".zip"):
        raise HTTPException(status_code=400, detail="Only .zip archives are supported")

    clean_name = sanitize_filename(file.filename)
    workspace_dir = repo.workspace_path or os.path.abspath(os.path.join(settings.WORKSPACE_DIR, repo.id))
    os.makedirs(workspace_dir, exist_ok=True)
    zip_path = os.path.join(workspace_dir, clean_name)

    # Read and enforce max upload size
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    bytes_read = 0
    with open(zip_path, "wb") as out_file:
        while chunk := await file.read(65536):
            bytes_read += len(chunk)
            if bytes_read > max_bytes:
                os.remove(zip_path)
                raise HTTPException(status_code=400, detail=f"Upload exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE_MB}MB")
            out_file.write(chunk)

    # Safe extraction
    try:
        extracted = safe_extract_zip(zip_path, workspace_dir)
        os.remove(zip_path)  # Clean archive after safe extraction
    except Exception as e:
        if os.path.exists(zip_path):
            os.remove(zip_path)
        raise HTTPException(status_code=400, detail=f"Extraction failed: {str(e)}")

    repo.status = "pending"
    db.commit()

    return {
        "status": "uploaded",
        "repository_id": repo.id,
        "extracted_files_count": len(extracted),
    }

@router.post("/{repository_id}/index")
def trigger_indexing(repository_id: str, db: Session = Depends(get_db)):
    repo = db.query(Repository).filter(Repository.id == repository_id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    # Enqueue background task
    job_id = enqueue_job(task_index_repository, repository_id)

    # Re-fetch repo in case sync fallback ran
    db.refresh(repo)
    return {
        "status": repo.status,
        "job_id": job_id,
        "repository_id": repo.id,
        "stats": repo.stats,
    }

@router.get("/{repository_id}/graph")
def get_repository_graph(
    repository_id: str,
    focus_subgraph: bool = Query(False),
    highlight_files: str = Query(""),
    db: Session = Depends(get_db)
):
    repo = db.query(Repository).filter(Repository.id == repository_id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    highlight_set = set(f.strip() for f in highlight_files.split(",") if f.strip())
    engine = GraphEngine(db)
    return engine.get_react_flow_graph(
        repository_id=repository_id,
        highlighted_files=highlight_set,
        focus_subgraph_only=focus_subgraph,
    )

@router.post("/load-sample")
def load_sample_repository(db: Session = Depends(get_db)):
    """
    1-Click demo helper: Copies the bundled sample auth & user repository,
    creates the repository record, and triggers deterministic indexing immediately.
    """
    candidates = [
        os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../../../examples/sample-repository")),
        os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../../examples/sample-repository")),
        os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../examples/sample-repository")),
        "/app/examples/sample-repository",
        "./examples/sample-repository",
        "../examples/sample-repository",
    ]
    sample_src = next((p for p in candidates if os.path.exists(p)), None)

    if not sample_src:
        raise HTTPException(status_code=404, detail="Sample repository not found in search paths")

    repo = Repository(
        name="Sample Auth & User Service",
        description="Multi-tier microservice with API routers, UserService, VerificationService, and automated tests.",
        status="pending"
    )
    db.add(repo)
    db.commit()
    db.refresh(repo)

    workspace_dir = os.path.abspath(os.path.join(settings.WORKSPACE_DIR, repo.id))
    os.makedirs(workspace_dir, exist_ok=True)
    repo.workspace_path = workspace_dir

    # Copy files
    for item in os.listdir(sample_src):
        s = os.path.join(sample_src, item)
        d = os.path.join(workspace_dir, item)
        if os.path.isdir(s):
            shutil.copytree(s, d, dirs_exist_ok=True)
        else:
            shutil.copy2(s, d)

    db.commit()

    # Index immediately
    indexing_engine = IndexingEngine(db)
    indexed_repo = indexing_engine.index_repository(repo.id)

    return {**jsonable_encoder(indexed_repo), "repository_id": indexed_repo.id}
