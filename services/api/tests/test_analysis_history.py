from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.sessions import issue_session_token
from app.db.database import Base, get_db
from app.db.models import AnalysisRun, Repository, User
from app.main import app


def test_history_requires_session_and_is_scoped_to_signed_in_user(tmp_path):
    engine = create_engine(f"sqlite:///{tmp_path / 'history.db'}", connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine)
    db = factory()
    user = User(email="owner@example.com", name="Owner", is_verified=True)
    repo = Repository(name="Owned repository", status="ready", owner_email=user.email)
    db.add_all([user, repo])
    db.commit()
    db.refresh(user)
    db.refresh(repo)
    token = issue_session_token(user)
    own = AnalysisRun(repository_id=repo.id, requested_by_email=user.email, requirement_text="My change", status="completed")
    other = AnalysisRun(repository_id=repo.id, requested_by_email="other@example.com", requirement_text="Other change", status="completed")
    db.add_all([own, other])
    db.commit()
    db.refresh(own)
    db.refresh(other)
    own_id, other_id = own.id, other.id
    db.close()

    def local_db():
        session = factory()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = local_db
    try:
        client = TestClient(app)
        assert client.get("/api/v1/analysis-history").status_code == 401
        headers = {"Authorization": f"Bearer {token}"}
        history = client.get("/api/v1/analysis-history", headers=headers)
        assert history.status_code == 200
        assert [item["analysis_id"] for item in history.json()] == [own_id]
        assert client.get(f"/api/v1/analyses/{own_id}/report").status_code == 404
        assert client.get(f"/api/v1/analyses/{own_id}/report", headers=headers).status_code == 200
        assert client.get(f"/api/v1/analyses/{other_id}/report", headers=headers).status_code == 404
        assert client.delete(f"/api/v1/analysis-history/{other_id}", headers=headers).status_code == 404
        assert client.delete(f"/api/v1/analysis-history/{own_id}", headers=headers).status_code == 200
    finally:
        app.dependency_overrides.pop(get_db, None)
        engine.dispose()
