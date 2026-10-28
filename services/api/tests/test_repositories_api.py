from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.api.routes import analysis as analysis_routes
from app.db.database import Base, get_db
from app.db.models import Repository
from app.main import app


def test_load_sample_returns_repository_usable_by_graph_and_analysis(tmp_path, monkeypatch):
    engine = create_engine(
        f"sqlite:///{tmp_path / 'api.db'}",
        connect_args={"check_same_thread": False},
    )
    Base.metadata.create_all(engine)
    session_factory = sessionmaker(bind=engine)
    monkeypatch.setattr(settings, "WORKSPACE_DIR", str(tmp_path / "workspaces"))
    monkeypatch.setattr(settings, "META_AI_PROVIDER", "offline_demo")

    def local_db():
        db = session_factory()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = local_db
    try:
        client = TestClient(app)
        response = client.post("/api/v1/repositories/load-sample")
        assert response.status_code == 200
        repository = response.json()
        assert repository["id"] == repository["repository_id"]
        assert repository["status"] == "ready"
        assert repository["stats"]["file_count"] == 14

        graph_response = client.get(f"/api/v1/repositories/{repository['id']}/graph")
        assert graph_response.status_code == 200
        assert len(graph_response.json()["nodes"]) == 14

        analysis_response = client.post(
            f"/api/v1/repositories/{repository['id']}/analyze",
            json={
                "requirement": "Require email verification before users can change their email address.",
                "run_sync": True,
            },
        )
        assert analysis_response.status_code == 200
        assert analysis_response.json()["result"]["affected_items"]
        assert analysis_response.json()["brief"]
    finally:
        app.dependency_overrides.pop(get_db, None)
        engine.dispose()


def test_cached_analysis_returns_report_and_brief_to_web(monkeypatch):
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine)()
    try:
        repository = Repository(name="Cached repo", status="ready")
        session.add(repository)
        session.commit()
        session.refresh(repository)
        cached_report = {
            "affected_items": [{"file_path": "app/service.py", "impact_type": "direct"}],
            "operational_metadata": {"provider": "offline_demo", "model": "demo"},
            "brief_markdown": "# Cached brief",
        }
        monkeypatch.setattr(analysis_routes, "get_cache", lambda _key: cached_report)

        response = analysis_routes.trigger_analysis(
            repository.id,
            analysis_routes.AnalyzeRequest(requirement="Change service", run_sync=True),
            db=session,
        )
        assert response["status"] == "completed"
        assert response["cached"] is True
        assert response["result"]["affected_items"] == cached_report["affected_items"]
        assert response["brief"] == "# Cached brief"
    finally:
        session.close()
        engine.dispose()
