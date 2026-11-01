"""Tests for Voice Requirement ingestion, refinement, follow-up Q&A, and plain vibecoder explanations."""

import io
from fastapi.testclient import TestClient
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.analysis.explanations import build_impact_story, generate_plain_test_checklist, map_user_consequence
from app.ai.provider import AIProviderResponse, OfflineDemoProvider
from app.db.database import Base, get_db
from app.db.models import Repository, IndexedFile, IndexedSymbol, DependencyEdge
from app.main import app


@pytest.fixture
def voice_db():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSession()

    repo = Repository(id="test-voice-repo", name="sample-auth", status="ready")
    session.add(repo)
    session.commit()

    f1 = IndexedFile(id="f1", repository_id="test-voice-repo", path="services/user_service.py", language="python")
    f2 = IndexedFile(id="f2", repository_id="test-voice-repo", path="api/routes/users.py", language="python")
    session.add_all([f1, f2])
    session.commit()

    s1 = IndexedSymbol(id="s1", repository_id="test-voice-repo", file_id="f1", name="verify_email_token", symbol_type="function")
    s2 = IndexedSymbol(id="s2", repository_id="test-voice-repo", file_id="f2", name="change_email_endpoint", symbol_type="endpoint")
    session.add_all([s1, s2])

    edge = DependencyEdge(
        id="e1", repository_id="test-voice-repo",
        source_file_id="f2",
        target_file_id="f1",
        edge_type="calls"
    )
    session.add(edge)
    session.commit()

    yield session
    session.close()
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client(voice_db):
    def override_get_db():
        try:
            yield voice_db
        finally:
            pass
    app.dependency_overrides[get_db] = override_get_db
    test_client = TestClient(app)
    yield test_client
    app.dependency_overrides.clear()


class FakeLiveVoiceProvider:
    provider_name = "meta_model_api"
    model = "test-live-model"
    base_url = "https://api.meta.ai/v1"
    last_request_attempts = 0

    def transcribe_audio(self, audio_bytes, content_type, language, keywords):
        return AIProviderResponse(
            data={"text": "Tôi muốn đổi nút đăng nhập sang màu tím đậm."},
            provider=self.provider_name,
            model=self.model,
            latency_seconds=0.01,
        )

    def refine_requirement(self, raw_transcript, repo_keywords, target_language):
        return AIProviderResponse(
            data={
                "refined_requirement": raw_transcript,
                "ambiguities": ["Bạn muốn dùng sắc tím nào?"],
                "suggested_colors": [{"name": "Tím mận", "hex": "#6D28D9"}],
                "suggested_options": [],
                "clarifications_made": [],
            },
            provider=self.provider_name,
            model=self.model,
            latency_seconds=0.01,
        )


def test_voice_requirement_transcribe_and_refine(client, monkeypatch):
    monkeypatch.setattr("app.api.routes.voice.get_ai_provider", FakeLiveVoiceProvider)
    # Dummy 16kHz WAV header + bytes (128 bytes)
    wav_bytes = b"RIFF" + (36).to_bytes(4, "little") + b"WAVEfmt " + (16).to_bytes(4, "little") + b"\x01\x00\x01\x00\x80>\x00\x00\x00}\x00\x00\x02\x00\x10\x00data" + (0).to_bytes(4, "little") + (b"\x00" * 64)
    file_payload = ("test.wav", io.BytesIO(wav_bytes), "audio/wav")

    res = client.post(
        "/api/v1/repositories/test-voice-repo/voice-requirement",
        files={"file": file_payload},
        data={"language": "vi", "target_language": "vi"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert "raw_transcript" in data
    assert "refined_requirement" in data
    assert "durations_seconds" in data
    assert data["durations_seconds"]["total"] >= 0
    assert "models_used" in data
    assert "keywords_used" in data
    assert any("verify" in k or "email" in k or "user" in k for k in data["keywords_used"])
    assert data["suggested_colors"][0]["name"] == "Tím mận"


def test_refine_requirement_api(client, monkeypatch):
    monkeypatch.setattr("app.api.routes.voice.get_ai_provider", FakeLiveVoiceProvider)
    res = client.post(
        "/api/v1/repositories/test-voice-repo/refine-requirement",
        json={"transcript": "toi muon them xac thuc email truoc khi doi email", "target_language": "vi"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert len(data["refined_requirement"]) > 0
    assert "duration_seconds" in data


def test_voice_routes_reject_offline_provider(client, monkeypatch):
    monkeypatch.setattr("app.api.routes.voice.get_ai_provider", OfflineDemoProvider)
    response = client.post(
        "/api/v1/repositories/test-voice-repo/refine-requirement",
        json={"transcript": "Đổi nút sang màu tím", "target_language": "vi"},
    )
    assert response.status_code == 503
    assert "online AI provider" in response.json()["detail"]


def test_voice_refinement_failure_preserves_model_transcript_for_retry(client, monkeypatch):
    class FailingRefinementProvider(FakeLiveVoiceProvider):
        def refine_requirement(self, raw_transcript, repo_keywords, target_language):
            raise ConnectionError("provider connection failed")

    monkeypatch.setattr("app.api.routes.voice.get_ai_provider", FailingRefinementProvider)
    wav_bytes = (
        b"RIFF" + (36).to_bytes(4, "little") + b"WAVEfmt " + (16).to_bytes(4, "little")
        + b"\x01\x00\x01\x00\x80>\x00\x00\x00}\x00\x00\x02\x00\x10\x00data"
        + (0).to_bytes(4, "little") + (b"\x00" * 64)
    )
    response = client.post(
        "/api/v1/repositories/test-voice-repo/voice-requirement",
        files={"file": ("test.wav", io.BytesIO(wav_bytes), "audio/wav")},
        data={"language": "vi", "target_language": "vi"},
    )
    assert response.status_code == 200
    assert response.json()["status"] == "transcribed"
    assert response.json()["raw_transcript"] == "Tôi muốn đổi nút đăng nhập sang màu tím đậm."
    assert response.json()["refinement_error"]


def test_follow_up_question_api(client):
    res = client.post(
        "/api/v1/repositories/test-voice-repo/follow-up",
        json={
            "question": "Nếu tôi không sửa file user_service.py thì sao?",
            "file_path": "services/user_service.py",
            "symbol": "verify_email_token",
            "target_language": "vi",
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert "answer" in data
    assert "screen_consequence" in data
    assert "services/user_service.py" in data["grounded_files"]
    assert "api/routes/users.py" in data["callers"]


def test_build_impact_story_and_checklist():
    direct = [{
        "file_path": "services/user_service.py",
        "symbol": "verify_email_token",
        "impact_type": "direct",
    }]
    indirect = [{
        "file_path": "api/routes/users.py",
        "symbol": "change_email_endpoint",
        "impact_type": "indirect",
    }]

    story = build_impact_story("Xác thực email trước khi đổi", direct, indirect, "vi")
    assert "verify_email_token" in story["story"]
    assert "change_email_endpoint" in story["story"]
    assert "what_might_break" in story
    assert "action_for_agent" in story

    checklist = generate_plain_test_checklist("Xác thực email trước khi đổi", ["pytest tests/test_user.py"], direct, "vi")
    assert len(checklist) >= 3
    assert any("email" in item["title"].lower() for item in checklist)
    assert any("action" in item for item in checklist)


def test_map_user_consequence_plain_language():
    screen, consequence = map_user_consequence("services/user_service.py", "verify_email_token")
    assert "Email" in screen
    assert "lỗi" in consequence.lower() or "thư" in consequence.lower()
