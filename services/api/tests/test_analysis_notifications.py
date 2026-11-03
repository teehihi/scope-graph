import datetime
import threading

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.db.database import Base
from app.db.models import AnalysisRun, Repository
from app.jobs import queue, tasks


def test_completion_email_uses_resend_and_links_to_history(monkeypatch):
    captured = {}

    class Response:
        def raise_for_status(self):
            pass

    def fake_post(url, **kwargs):
        captured.update(url=url, **kwargs)
        return Response()

    monkeypatch.setattr(settings, "RESEND_API_KEY", "test-key")
    monkeypatch.setattr(settings, "SMTP_FROM", "ScopeGraph <notify@example.com>")
    monkeypatch.setattr(settings, "WEB_APP_URL", "https://www.scopegraph.top")
    monkeypatch.setattr(tasks.httpx, "post", fake_post)

    assert tasks._send_analysis_complete_email("owner@example.com", "<Core>", "run-1", "Change & test")
    assert captured["url"] == "https://api.resend.com/emails"
    assert captured["json"]["to"] == ["owner@example.com"]
    assert "https://www.scopegraph.top/app/history?analysis_id=run-1" in captured["json"]["html"]
    assert "&lt;Core&gt;" in captured["json"]["html"]


def test_retention_cleanup_only_deletes_finished_runs(tmp_path, monkeypatch):
    engine = create_engine(f"sqlite:///{tmp_path / 'retention.db'}", connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine)
    now = datetime.datetime.now(datetime.timezone.utc)
    cutoff_old = now - datetime.timedelta(days=10)
    with factory() as db:
        repo = Repository(name="Retention repo", status="ready")
        db.add(repo)
        db.flush()
        db.add_all([
            AnalysisRun(repository_id=repo.id, requirement_text="old complete", status="completed", created_at=cutoff_old),
            AnalysisRun(repository_id=repo.id, requirement_text="old failed", status="failed", created_at=cutoff_old),
            AnalysisRun(repository_id=repo.id, requirement_text="old active", status="processing", created_at=cutoff_old),
            AnalysisRun(repository_id=repo.id, requirement_text="recent", status="completed", created_at=now),
        ])
        db.commit()
    monkeypatch.setattr(tasks, "SessionLocal", factory)
    monkeypatch.setattr(settings, "ANALYSIS_RETENTION_DAYS", 7)

    assert tasks.task_cleanup_expired_analyses() == 2
    with factory() as db:
        assert [run.requirement_text for run in db.query(AnalysisRun).order_by(AnalysisRun.requirement_text).all()] == [
            "old active", "recent",
        ]
    engine.dispose()


def test_queue_fallback_returns_without_waiting_for_job(monkeypatch):
    event = threading.Event()
    monkeypatch.setattr(queue, "get_queue", lambda: None)

    job_id = queue.enqueue_job(event.set)

    assert job_id.startswith("local-")
    assert event.wait(timeout=2)
