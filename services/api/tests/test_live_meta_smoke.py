"""Explicitly opted-in, potentially billable Meta Model API integration smoke."""

import os
from pathlib import Path

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.analysis.orchestrator import AnalysisOrchestrator
from app.core.config import settings
from app.db.database import Base
from app.db.models import Repository
from app.indexing.engine import IndexingEngine


def configured_meta_key() -> str:
    return os.environ.get("META_AI_API_KEY") or os.environ.get("MODEL_API_KEY") or settings.META_AI_API_KEY


def test_smoke_accepts_key_loaded_from_dot_env(monkeypatch):
    monkeypatch.delenv("META_AI_API_KEY", raising=False)
    monkeypatch.delenv("MODEL_API_KEY", raising=False)
    monkeypatch.setattr(settings, "META_AI_API_KEY", "key-loaded-from-dot-env")
    assert configured_meta_key() == "key-loaded-from-dot-env"


@pytest.mark.skipif(
    os.environ.get("RUN_META_LIVE_SMOKE") != "1" or os.environ.get("ALLOW_PAID_META_SMOKE") != "1",
    reason="Live Meta smoke requires both explicit opt-in flags and authorized billing",
)
def test_real_meta_full_pipeline(monkeypatch):
    key = configured_meta_key()
    if not key:
        pytest.fail("Set META_AI_API_KEY or MODEL_API_KEY in the environment")
    monkeypatch.setattr(settings, "META_AI_PROVIDER", "meta_model_api")
    monkeypatch.setattr(settings, "META_AI_API_KEY", key)
    monkeypatch.setattr(settings, "META_AI_BASE_URL", "https://api.meta.ai/v1")
    monkeypatch.setattr(settings, "META_AI_MODEL", "muse-spark-1.3")

    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine)()
    try:
        sample = Path(__file__).resolve().parents[3] / "examples" / "sample-repository"
        repo = Repository(id="meta-smoke", name="Meta smoke", workspace_path=str(sample), status="pending")
        session.add(repo)
        session.commit()
        assert IndexingEngine(session).index_repository(repo.id).status == "ready"
        run = AnalysisOrchestrator(session).run_analysis(
            repo.id, "Require email verification before users can change their email address"
        )
        assert run.status == "completed", run.error_message
        report = run.result_json
        assert run.provider == "meta_model_api"
        assert run.model and run.model != "deterministic-semantic-matcher"
        assert report["operational_metadata"]["is_demo_mode"] is False
        assert report["operational_metadata"]["inference_latency_seconds"] >= 0
        assert report["validation_metrics"]["total_claims"] >= 0
        assert all(item["existence_verified"] for item in report["affected_items"])
        assert all(item["evidence_snippet"] for item in report["affected_items"])
        assert run.brief_markdown
    finally:
        session.close()
        engine.dispose()
