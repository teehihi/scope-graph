import logging
import html
import smtplib
import httpx
import datetime
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.db.database import SessionLocal
from app.indexing.engine import IndexingEngine
from app.analysis.orchestrator import AnalysisOrchestrator
from app.db.models import Repository, AnalysisRun
from app.core.config import settings
from app.ai.image_input import decode_uploaded_screenshot

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

def _send_analysis_complete_email(to_email: str, repo_name: str, analysis_id: str, requirement: str,
                                 status: str = "completed", language: str = "en") -> bool:
    if not (settings.RESEND_API_KEY or (settings.SMTP_HOST and settings.SMTP_USER)):
        logger.warning("Analysis completion email skipped because email delivery is not configured")
        return False
    safe_repo = html.escape(repo_name)
    safe_requirement = html.escape(requirement[:500])
    report_url = f"{settings.WEB_APP_URL.rstrip('/')}/app/history?analysis_id={analysis_id}"
    copy = {
        "en": ("Your ScopeGraph analysis is complete", "Your analysis for", "is complete.", "could not be completed.", "Open analysis"),
        "vi": ("Phân tích ScopeGraph của bạn đã hoàn tất", "Phân tích cho", "đã hoàn tất.", "không thể hoàn tất.", "Mở kết quả phân tích"),
        "ja": ("ScopeGraphの分析が完了しました", "次の分析", "が完了しました。", "を完了できませんでした。", "分析結果を開く"),
        "ko": ("ScopeGraph 분석이 완료되었습니다", "다음 분석", "이 완료되었습니다.", "을 완료하지 못했습니다.", "분석 결과 열기"),
        "zh": ("ScopeGraph 分析已完成", "您的分析（", "）已完成。", "）未能完成。", "查看分析结果"),
        "es": ("Tu análisis de ScopeGraph está listo", "El análisis de", "ha finalizado.", "no se pudo completar.", "Abrir análisis"),
        "fr": ("Votre analyse ScopeGraph est terminée", "L’analyse de", "est terminée.", "n’a pas pu être terminée.", "Ouvrir l’analyse"),
        "de": ("Ihre ScopeGraph-Analyse ist abgeschlossen", "Die Analyse für", "ist abgeschlossen.", "konnte nicht abgeschlossen werden.", "Analyse öffnen"),
        "hi": ("आपका ScopeGraph विश्लेषण पूरा हो गया है", "आपका विश्लेषण", "पूरा हो गया है।", "पूरा नहीं हो सका।", "विश्लेषण खोलें"),
        "th": ("การวิเคราะห์ ScopeGraph เสร็จแล้ว", "การวิเคราะห์ของคุณสำหรับ", "เสร็จสมบูรณ์แล้ว", "ไม่สามารถดำเนินการให้เสร็จได้", "เปิดผลการวิเคราะห์"),
        "it": ("La tua analisi ScopeGraph è pronta", "L’analisi di", "è completata.", "non è stata completata.", "Apri l’analisi"),
        "ru": ("Анализ ScopeGraph завершён", "Анализ для", "завершён.", "не удалось завершить.", "Открыть анализ"),
    }.get(language, None)
    if copy is None:
        copy = {"en": ("Your ScopeGraph analysis is complete", "Your analysis for", "is complete.", "could not be completed.", "Open analysis")}["en"]
    subject, lead, success_copy, failure_copy, open_label = copy
    status_copy = success_copy if status == "completed" else failure_copy
    body = f"<p>{html.escape(lead)} <strong>{safe_repo}</strong> {html.escape(status_copy)}</p>"
    body += f"<p>{safe_requirement}</p><p><a href=\"{html.escape(report_url, quote=True)}\">{html.escape(open_label)}</a></p>"
    if settings.RESEND_API_KEY:
        try:
            response = httpx.post(
                "https://api.resend.com/emails",
                headers={"Authorization": f"Bearer {settings.RESEND_API_KEY}"},
                json={"from": settings.SMTP_FROM, "to": [to_email], "subject": subject, "html": body},
                timeout=10.0,
            )
            response.raise_for_status()
            return True
        except httpx.HTTPError as error:
            logger.warning("Analysis completion email failed (%s)", type(error).__name__)
            return False
    try:
        message = MIMEMultipart("alternative")
        message["Subject"] = subject
        message["From"] = settings.SMTP_FROM
        message["To"] = to_email
        message.attach(MIMEText(body, "html"))
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as smtp:
            if settings.SMTP_USE_TLS:
                smtp.starttls()
            smtp.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            smtp.sendmail(settings.SMTP_FROM, [to_email], message.as_string())
        return True
    except Exception as error:
        logger.warning("Analysis completion email failed (%s)", type(error).__name__)
        return False


def task_run_analysis(repository_id: str, requirement: str, analysis_id: str,
                      target_language: str = "en", requested_by_email: str | None = None,
                      screenshot_data: bytes | None = None, screenshot_mime: str | None = None):
    logger.info("Starting background analysis task %s for repository %s", analysis_id, repository_id)
    db = SessionLocal()
    try:
        orchestrator = AnalysisOrchestrator(db)
        screenshot = decode_uploaded_screenshot(screenshot_data, screenshot_mime) if screenshot_data and screenshot_mime else None
        run = orchestrator.run_analysis(
            repository_id, requirement, analysis_id=analysis_id, target_language=target_language,
            screenshot=screenshot,
        )
        if requested_by_email and not run.requested_by_email:
            run.requested_by_email = requested_by_email
            db.commit()
        if run.status in {"completed", "failed"}:
            _send_run_completion_email(db, run)
        logger.info("Finished background analysis task %s (status: %s)", analysis_id, run.status)
        return {"status": run.status, "analysis_id": run.id}
    finally:
        db.close()


def _send_run_completion_email(db, run: AnalysisRun) -> bool:
    if not run.requested_by_email:
        return False
    repo = db.query(Repository).filter(Repository.id == run.repository_id).first()
    return bool(repo and _send_analysis_complete_email(
        run.requested_by_email, repo.name, run.id, run.requirement_text, run.status, run.target_language,
    ))


def task_cleanup_expired_analyses() -> int:
    cutoff = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=settings.ANALYSIS_RETENTION_DAYS)
    db = SessionLocal()
    try:
        deleted = db.query(AnalysisRun).filter(
            AnalysisRun.created_at < cutoff,
            AnalysisRun.status.in_(("completed", "failed")),
        ).delete(synchronize_session=False)
        db.commit()
        if deleted:
            logger.info("Deleted %s expired analysis runs", deleted)
        return deleted
    except Exception:
        db.rollback()
        logger.exception("Expired analysis cleanup failed")
        return 0
    finally:
        db.close()
