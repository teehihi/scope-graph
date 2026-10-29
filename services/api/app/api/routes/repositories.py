import os
import shutil
import tempfile
import logging
import httpx
from pathlib import Path
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Query, BackgroundTasks
from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.db.database import get_db, SessionLocal
from app.db.models import Repository, IndexedFile, IndexedSymbol, DependencyEdge
from app.core.config import settings
from app.core.security import sanitize_filename, safe_extract_zip
from app.indexing.engine import IndexingEngine
from app.graph.engine import GraphEngine
from app.jobs.queue import enqueue_job
from app.jobs.tasks import task_index_repository

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/repositories", tags=["repositories"])

class CreateRepoRequest(BaseModel):
    name: str
    description: str = ""
    owner_email: str | None = None

@router.post("")
def create_repository(payload: CreateRepoRequest, db: Session = Depends(get_db)):
    repo = Repository(
        name=payload.name,
        description=payload.description,
        owner_email=payload.owner_email,
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
def list_repositories(owner_email: str | None = Query(None), db: Session = Depends(get_db)):
    query = db.query(Repository)
    if owner_email:
        # If user is a demo user, only show public sample or repos owned explicitly by demo
        if "demo" in owner_email.lower():
            query = query.filter(
                (Repository.owner_email == owner_email) |
                (Repository.name == "Sample Auth & User Service")
            )
        else:
            # Regular or GitHub user: show sample repo + their own imported repos
            query = query.filter(
                (Repository.owner_email == owner_email) |
                (Repository.name == "Sample Auth & User Service")
            )

    repos = query.order_by(Repository.created_at.desc()).all()
    if not repos:
        try:
            load_sample_repository(db)
            query_after = db.query(Repository)
            if owner_email:
                if "demo" in owner_email.lower():
                    query_after = query_after.filter(
                        (Repository.owner_email == owner_email) |
                        (Repository.name == "Sample Auth & User Service")
                    )
                else:
                    query_after = query_after.filter(
                        (Repository.owner_email == owner_email) |
                        (Repository.name == "Sample Auth & User Service")
                    )
            repos = query_after.order_by(Repository.created_at.desc()).all()
        except Exception:
            pass
    else:
        # Prevent duplicate sample repositories from ever being displayed
        sample_repos = [r for r in repos if r.name == "Sample Auth & User Service"]
        if len(sample_repos) > 1:
            for dup in sample_repos[1:]:
                if dup.workspace_path and os.path.exists(dup.workspace_path):
                    shutil.rmtree(dup.workspace_path, ignore_errors=True)
                db.delete(dup)
            db.commit()
            query_after = db.query(Repository)
            if owner_email:
                if "demo" in owner_email.lower():
                    query_after = query_after.filter(
                        (Repository.owner_email == owner_email) |
                        (Repository.name == "Sample Auth & User Service")
                    )
                else:
                    query_after = query_after.filter(
                        (Repository.owner_email == owner_email) |
                        (Repository.name == "Sample Auth & User Service")
                    )
            repos = query_after.order_by(Repository.created_at.desc()).all()
    return repos

@router.get("/{repository_id}")
def get_repository(repository_id: str, db: Session = Depends(get_db)):
    repo = db.query(Repository).filter(Repository.id == repository_id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
    return repo

@router.delete("/{repository_id}")
def delete_repository(repository_id: str, db: Session = Depends(get_db)):
    repo = db.query(Repository).filter(Repository.id == repository_id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    if repo.workspace_path and os.path.exists(repo.workspace_path):
        try:
            shutil.rmtree(repo.workspace_path, ignore_errors=True)
        except Exception:
            pass

    db.delete(repo)
    db.commit()
    return {"status": "deleted", "repository_id": repository_id}

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
    creates or resets the repository record, and triggers deterministic indexing immediately.
    Guarantees idempotency so only 1 sample repository exists.
    """
    candidates = [
        "/app/examples/sample-repository",
        os.path.abspath(os.path.join(os.getcwd(), "examples/sample-repository")),
        os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../../../examples/sample-repository")),
        os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../../examples/sample-repository")),
        os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../examples/sample-repository")),
        os.path.abspath(os.path.join(os.path.dirname(__file__), "../../examples/sample-repository")),
        "./examples/sample-repository",
        "../examples/sample-repository",
    ]
    sample_src = next((p for p in candidates if os.path.exists(p)), None)

    if not sample_src:
        raise HTTPException(status_code=404, detail="Sample repository not found in search paths")

    # Reuse existing sample repository to guarantee exactly 1 sample exists
    sample_repos = (
        db.query(Repository)
        .filter(Repository.name == "Sample Auth & User Service")
        .order_by(Repository.created_at.desc())
        .all()
    )

    if sample_repos:
        repo = sample_repos[0]
        # Purge any older duplicate sample repositories
        for dup in sample_repos[1:]:
            if dup.workspace_path and os.path.exists(dup.workspace_path):
                shutil.rmtree(dup.workspace_path, ignore_errors=True)
            db.delete(dup)
        repo.status = "pending"
        db.commit()
        db.refresh(repo)
    else:
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

class ImportGitHubRepoRequest(BaseModel):
    clone_url: str
    name: str
    full_name: str | None = None
    default_branch: str = "main"
    access_token: str
    owner_email: str | None = None

def task_import_and_index_github(
    repo_id: str,
    full_name: str,
    default_branch: str,
    access_token: str,
):
    """
    Background worker task to download GitHub repository archive,
    extract safely into workspace, and index all AST code intelligence facts.
    """
    db = SessionLocal()
    try:
        repo = db.query(Repository).filter(Repository.id == repo_id).first()
        if not repo:
            logger.error("Repository %s not found for background import", repo_id)
            return

        workspace_dir = repo.workspace_path or os.path.abspath(os.path.join(settings.WORKSPACE_DIR, repo.id))
        os.makedirs(workspace_dir, exist_ok=True)

        ref = default_branch or "main"
        zipball_url = f"https://api.github.com/repos/{full_name}/zipball/{ref}"
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "ScopeGraph-App/1.0",
        }

        # 1. Download zipball
        with httpx.Client(timeout=60.0, follow_redirects=True) as client:
            resp = client.get(zipball_url, headers=headers)
            if resp.status_code != 200:
                resp = client.get(f"https://api.github.com/repos/{full_name}/zipball", headers=headers)
                if resp.status_code != 200:
                    repo.status = "error"
                    repo.error_message = f"Failed to download repository from GitHub (HTTP {resp.status_code})"
                    db.commit()
                    return

            with tempfile.NamedTemporaryFile(suffix=".zip", delete=False) as tmp_file:
                tmp_file.write(resp.content)
                tmp_zip_path = tmp_file.name

        # 2. Safe extract zipball into workspace
        extracted_files = safe_extract_zip(
            tmp_zip_path,
            workspace_dir,
            max_extracted_mb=settings.MAX_EXTRACTED_SIZE_MB,
            max_file_count=settings.MAX_FILE_COUNT,
        )

        if os.path.exists(tmp_zip_path):
            os.remove(tmp_zip_path)

        # Hoist root folder if nested inside zipball
        subdirs = [os.path.join(workspace_dir, d) for d in os.listdir(workspace_dir) if os.path.isdir(os.path.join(workspace_dir, d))]
        if len(subdirs) == 1 and len(os.listdir(workspace_dir)) == 1:
            nested_root = subdirs[0]
            for item in os.listdir(nested_root):
                shutil.move(os.path.join(nested_root, item), os.path.join(workspace_dir, item))
            os.rmdir(nested_root)

        # 3. Index AST facts
        indexing_engine = IndexingEngine(db)
        indexing_engine.index_repository(repo.id)
        logger.info("Successfully finished background import & indexing for repo %s", repo.id)
    except Exception as e:
        logger.exception("Failed background import for repo %s: %s", repo_id, e)
        try:
            repo.status = "error"
            repo.error_message = f"Background import failed: {str(e)}"
            db.commit()
        except Exception:
            pass
    finally:
        db.close()

@router.post("/import-github")
async def import_github_repository(
    payload: ImportGitHubRepoRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Import and ingest a GitHub repository (Public or Private) directly using user's OAuth access token.
    Immediately creates repository and runs download + AST indexing asynchronously in background.
    """
    if not payload.access_token:
        raise HTTPException(status_code=401, detail="GitHub access token is required to import repository")

    # 1. Create Repository Record immediately
    repo = Repository(
        name=payload.name,
        description=f"Imported from GitHub: {payload.full_name or payload.name}",
        owner_email=payload.owner_email,
        status="indexing"
    )
    db.add(repo)
    db.commit()
    db.refresh(repo)

    # 2. Setup workspace directory
    workspace_dir = os.path.abspath(os.path.join(settings.WORKSPACE_DIR, repo.id))
    os.makedirs(workspace_dir, exist_ok=True)
    repo.workspace_path = workspace_dir
    db.commit()

    # 3. Target repo
    full_name = payload.full_name or ""
    if not full_name and "github.com/" in payload.clone_url:
        full_name = payload.clone_url.split("github.com/")[-1].replace(".git", "")

    if not full_name:
        raise HTTPException(status_code=400, detail="Invalid repository target")

    ref = payload.default_branch or "main"

    # 4. Schedule background download and indexing
    background_tasks.add_task(
        task_import_and_index_github,
        repo.id,
        full_name,
        ref,
        payload.access_token,
    )

    return {**jsonable_encoder(repo), "repository_id": repo.id}
