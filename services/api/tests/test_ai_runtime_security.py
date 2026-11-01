"""Fail-closed checks for runtime inference settings."""

from fastapi.testclient import TestClient
from pathlib import Path

from app.api.routes import health
from app.core.config import settings
from app.main import app


def test_system_info_never_returns_runtime_api_key(monkeypatch):
    monkeypatch.setattr(health, "CUSTOM_USER_API_KEY", "test-private-runtime-key")
    monkeypatch.setattr(settings, "META_AI_API_KEY", "test-private-runtime-key")

    response = TestClient(app).get("/api/v1/system/info")

    assert response.status_code == 200
    assert response.json()["has_api_key"] is True
    assert response.json()["api_key_source"] == "custom"
    assert "test-private-runtime-key" not in response.text


def test_production_rejects_unauthenticated_runtime_mutation_and_test(monkeypatch):
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    monkeypatch.setattr(settings, "META_AI_PROVIDER", "offline_demo")
    client = TestClient(app)

    update = client.put("/api/v1/system/settings", json={"provider": "meta_model_api"})
    connection_test = client.post("/api/v1/system/test-ai")

    assert update.status_code == 403
    assert connection_test.status_code == 403
    assert settings.META_AI_PROVIDER == "offline_demo"


def test_production_rejects_public_paid_analysis_before_repository_lookup(monkeypatch):
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    monkeypatch.setattr(settings, "META_AI_PROVIDER", "meta_model_api")
    monkeypatch.setattr(settings, "AI_PROVIDER_PROFILE", "meta_only")
    client = TestClient(app)
    png = Path("services/api/tests/evaluation/screenshots_v1/account_email.png").read_bytes()

    text = client.post(
        "/api/v1/repositories/nonexistent/analyze",
        json={"requirement": "Update email", "run_sync": True},
    )
    screenshot = client.post(
        "/api/v1/repositories/nonexistent/analyze-screenshot",
        data={"requirement": "Update email"},
        files={"screenshot": ("screen.png", png, "image/png")},
    )

    assert text.status_code == 403
    assert screenshot.status_code == 403


def test_production_keeps_offline_demo_analysis_available(monkeypatch):
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    monkeypatch.setattr(settings, "META_AI_PROVIDER", "offline_demo")
    monkeypatch.setattr(settings, "AI_PROVIDER_PROFILE", "meta_only")

    response = TestClient(app).post(
        "/api/v1/repositories/nonexistent/analyze",
        json={"requirement": "Update email", "run_sync": True},
    )

    assert response.status_code == 404
