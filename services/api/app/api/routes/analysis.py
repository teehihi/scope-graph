import uuid
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.db.database import get_db
from app.db.models import Repository, AnalysisRun
from app.jobs.queue import enqueue_job, get_cache, set_cache, make_analysis_cache_key
from app.jobs.tasks import task_run_analysis
from app.analysis.orchestrator import AnalysisOrchestrator
from app.ai.image_input import decode_uploaded_screenshot
from app.core.config import settings
from app.billing.entitlements import (
    enforce_ai_limit,
    enforce_daily_feature_limit,
    record_feature_usage,
    require_feature,
)

router = APIRouter(tags=["analysis"])

class AnalyzeRequest(BaseModel):
    requirement: str
    run_sync: bool = False
    target_language: str = "en"


@router.post("/repositories/{repository_id}/analyze-screenshot")
def analyze_screenshot(
    repository_id: str,
    requirement: str = Form(...),
    screenshot: UploadFile = File(...),
    target_language: str = Form("en"),
    db: Session = Depends(get_db),
):
    """Run a synchronous image-assisted analysis without using the text cache."""
    try:
        repo = db.query(Repository).filter(Repository.id == repository_id).first()
        if not repo:
            raise HTTPException(status_code=404, detail="Repository not found")
        if repo.status != "ready":
            raise HTTPException(
                status_code=400,
                detail=f"Repository is not ready for analysis (status: {repo.status})",
            )
        req_text = requirement.strip()
        if not req_text:
            raise HTTPException(status_code=400, detail="Requirement text cannot be empty")
        require_feature(db, repo, "vision")
        enforce_daily_feature_limit(db, repo, "vision")
        enforce_ai_limit(db, repo)
        if screenshot.content_type not in ("image/png", "image/jpeg"):
            raise HTTPException(status_code=415, detail="Only PNG and JPEG screenshots are supported")

        data = screenshot.file.read(settings.MAX_SCREENSHOT_BYTES + 1)
        if len(data) > settings.MAX_SCREENSHOT_BYTES:
            raise HTTPException(status_code=413, detail="Screenshot exceeds configured size limit")
        try:
            image = decode_uploaded_screenshot(data, screenshot.content_type)
        except ValueError as error:
            status = 413 if "size limit" in str(error) else 400
            raise HTTPException(status_code=status, detail=str(error)) from None

        run = AnalysisOrchestrator(db).run_analysis(
            repository_id, req_text, target_language=target_language, screenshot=image,
        )
        record_feature_usage(db, repo, "vision")
        return {
            "analysis_id": run.id,
            "status": run.status,
            "result": run.result_json,
            "brief": run.brief_markdown,
        }
    finally:
        screenshot.file.close()

@router.post("/repositories/{repository_id}/analyze")
def trigger_analysis(
    repository_id: str,
    payload: AnalyzeRequest,
    db: Session = Depends(get_db)
):
    repo = db.query(Repository).filter(Repository.id == repository_id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
    provider_profile = (
        "multi_ai" if settings.ENVIRONMENT.lower() == "production" else settings.AI_PROVIDER_PROFILE.lower()
    )
    if provider_profile == "multi_ai":
        require_feature(db, repo, "multi_ai")
    enforce_ai_limit(db, repo)
    if repo.status != "ready":
        raise HTTPException(status_code=400, detail=f"Repository is not ready for analysis (status: {repo.status})")

    req_text = payload.requirement.strip()
    if not req_text:
        raise HTTPException(status_code=400, detail="Requirement text cannot be empty")

    # Check cache for repeatable identical queries
    # Multi-provider configuration can change between enqueue and execution; bypass
    # the text cache until a per-run immutable routing fingerprint is persisted.
    cache_key = None if provider_profile == "multi_ai" else make_analysis_cache_key(
        repository_id, req_text, settings.META_AI_MODEL,
        index_version=repo.indexed_at.isoformat() if repo.indexed_at else "unversioned",
        profile=provider_profile,
        provider_signature=f"{settings.META_AI_PROVIDER}:{settings.META_AI_BASE_URL}",
        target_language=payload.target_language,
    )
    cached_result = get_cache(cache_key) if cache_key else None
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
        completed_run = orchestrator.run_analysis(
            repository_id, req_text, analysis_id=analysis_id, target_language=payload.target_language
        )
        if completed_run.status == "failed":
            raise HTTPException(
                status_code=500,
                detail=completed_run.error_message or "Analysis execution failed"
            )
        # Store in cache
        if completed_run.result_json:
            cache_payload = dict(completed_run.result_json)
            cache_payload["brief_markdown"] = completed_run.brief_markdown
            if cache_key:
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


class FollowUpRequest(BaseModel):
    question: str
    analysis_id: str | None = None
    file_path: str | None = None
    symbol: str | None = None
    target_language: str = "vi"


@router.post("/repositories/{repository_id}/follow-up")
def ask_follow_up_question(
    repository_id: str,
    payload: FollowUpRequest,
    db: Session = Depends(get_db),
):
    """
    Answers plain-language follow-up questions from vibecoders about change impact
    (e.g. 'Nếu tôi không sửa file B thì sao?'). Grounded in AST call facts and lines.
    """
    repo = db.query(Repository).filter(Repository.id == repository_id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    q = payload.question.strip()
    if not q:
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    from app.db.models import IndexedFile, IndexedSymbol, DependencyEdge
    from app.analysis.explanations import map_user_consequence

    file_path = payload.file_path or ""
    symbol = payload.symbol or ""

    # Look up callers and dependencies via IndexedFile
    files = db.query(IndexedFile).filter(IndexedFile.repository_id == repository_id).all()
    file_map = {f.id: f.path for f in files}
    target_fid = next((fid for fid, p in file_map.items() if file_path and p.endswith(file_path)), None)

    callers = []
    dependencies = []
    if target_fid:
        edges = db.query(DependencyEdge).filter(DependencyEdge.repository_id == repository_id).all()
        for e in edges:
            if e.target_file_id == target_fid and e.source_file_id in file_map:
                callers.append(file_map[e.source_file_id])
            elif e.source_file_id == target_fid and e.target_file_id in file_map:
                dependencies.append(file_map[e.target_file_id])

    screen, consequence = map_user_consequence(file_path, symbol)

    # Plain language grounded explanation
    is_vi = payload.target_language.startswith("vi")
    if "không sửa" in q.lower() or "bỏ qua" in q.lower() or "why" in q.lower() or "nếu" in q.lower():
        if callers:
            caller_str = ", ".join(f"`{c.split('/')[-1]}`" for c in callers[:2])
            answer = (
                f"Nếu bạn không cập nhật `{file_path.split('/')[-1]}`: "
                f"Thành phần {caller_str} đang gọi trực tiếp vào đây. "
                f"Khi logic hoặc dữ liệu đầu ra thay đổi mà không được đồng bộ, "
                f"người dùng ở **{screen}** sẽ gặp lỗi ({consequence.lower()})."
            ) if is_vi else (
                f"If you skip `{file_path.split('/')[-1]}`: "
                f"{caller_str} directly calls this component. "
                f"Any interface or contract mismatch will cause runtime breakage on {screen} ({consequence})."
            )
        else:
            answer = (
                f"`{file_path.split('/')[-1]}` là thành phần liên quan đến **{screen}**. "
                f"Nếu bạn bỏ qua không sửa, tính năng mới sẽ không hoạt động đầy đủ trên giao diện."
            ) if is_vi else (
                f"`{file_path.split('/')[-1]}` belongs to {screen}. "
                f"Skipping it means the new capability will not function completely on the user interface."
            )
    else:
        answer = (
            f"Về câu hỏi: \"{q}\": `{file_path.split('/')[-1]}` phụ trách **{screen}**. "
            f"Chi tiết kỹ thuật: {consequence} Khuyến nghị kiểm tra kỹ luồng gọi từ các component liên quan trước khi bàn giao cho coding agent."
        ) if is_vi else (
            f"Regarding \"{q}\": `{file_path.split('/')[-1]}` handles {screen}. "
            f"Recommended action: verify incoming calls and ensure tests are updated before agent code generation."
        )

    return {
        "question": q,
        "answer": answer,
        "screen_consequence": f"{screen}: {consequence}",
        "grounded_files": [file_path] if file_path else [],
        "callers": callers[:3],
        "dependencies": dependencies[:3],
    }


@router.post("/repositories/{repository_id}/interpret-screenshot-preview")
def interpret_screenshot_preview(
    repository_id: str,
    screenshot: UploadFile = File(...),
    requirement: str = Form(""),
    db: Session = Depends(get_db),
):
    """
    Generates a quick, plain-language preview of an uploaded screenshot before running impact analysis.
    Helps vibecoders verify that the system understands what screen/component is in the image.
    """
    repo = db.query(Repository).filter(Repository.id == repository_id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    if screenshot.content_type not in ("image/png", "image/jpeg"):
        raise HTTPException(status_code=415, detail="Only PNG and JPEG screenshots are supported")

    data = screenshot.file.read(settings.MAX_SCREENSHOT_BYTES + 1)
    if len(data) > settings.MAX_SCREENSHOT_BYTES:
        raise HTTPException(status_code=413, detail="Screenshot exceeds configured size limit")

    validated_image = decode_uploaded_screenshot(data, screenshot.content_type)

    # If offline demo or Meta provider
    from app.ai.provider import get_ai_provider, OfflineDemoProvider
    provider = get_ai_provider()

    if isinstance(provider, OfflineDemoProvider):
        # Deterministic preview for demo
        summary = "Ảnh chụp màn hình giao diện ứng dụng (Form nhập liệu / Cài đặt tài khoản)."
        screen_type = "Settings / Account Profile"
        elements = ["Trường nhập Email", "Nút Lưu thay đổi", "Thẻ thông tin người dùng"]
        actions = ["Người dùng cập nhật địa chỉ email", "Bấm nút Xác nhận"]
        uncertainties = ["Không hiển thị modal popup xác thực OTP"]
    else:
        try:
            resp = provider.interpret_screenshot(requirement or "Identify user screen", validated_image)
            data_intent = resp.data
            summary = data_intent.get("requirement_interpretation") or "Giao diện người dùng được nhận dạng thành công."
            screen_type = data_intent.get("screen_type") or "Application Screen"
            elements = data_intent.get("visible_elements") or []
            actions = data_intent.get("user_actions") or []
            uncertainties = data_intent.get("uncertainties") or []
        except Exception as e:
            logger.warning("Vision preview fallback: %s", e)
            summary = "Ảnh chụp màn hình giao diện người dùng."
            screen_type = "Application Interface"
            elements = ["UI Form", "Action Buttons"]
            actions = ["User Interaction"]
            uncertainties = ["Chi tiết logic bên dưới cần được kiểm tra bằng mã nguồn."]

    return {
        "status": "success",
        "screen_type": screen_type,
        "summary": summary,
        "visible_elements": elements,
        "user_actions": actions,
        "uncertainties": uncertainties,
    }
