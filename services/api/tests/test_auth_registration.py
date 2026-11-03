import logging

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.routes import auth
from app.db.database import Base, get_db
from app.db.models import OtpCode


@pytest.fixture

def registration_client():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    TestSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    def override_get_db():
        db = TestSession()
        try:
            yield db
        finally:
            db.close()

    app = FastAPI()
    app.include_router(auth.router, prefix="/api/v1")
    app.dependency_overrides[get_db] = override_get_db
    try:
        yield TestClient(app), TestSession
    finally:
        app.dependency_overrides.clear()
        engine.dispose()


def test_production_registration_does_not_claim_otp_sent_without_smtp(
    registration_client, monkeypatch, caplog
):
    client, TestSession = registration_client
    monkeypatch.setattr(auth.settings, "ENVIRONMENT", "production")
    monkeypatch.setattr(auth.settings, "RESEND_API_KEY", "")
    monkeypatch.setattr(auth.settings, "SMTP_HOST", "")
    monkeypatch.setattr(auth.settings, "SMTP_USER", "")

    with caplog.at_level(logging.INFO):
        response = client.post(
            "/api/v1/auth/register/send-otp",
            json={"email": "new-user@example.com", "name": "New User", "password": "valid-password"},
        )

    assert response.status_code == 503
    assert "DEV OTP" not in caplog.text
    resend_response = client.post(
        "/api/v1/auth/resend-otp",
        json={"email": "new-user@example.com", "name": "New User"},
    )
    assert resend_response.status_code == 503
    with TestSession() as db:
        assert db.query(OtpCode).count() == 0


def test_smtp_connection_uses_bounded_timeout(monkeypatch):
    calls = {}

    class FakeSMTP:
        def __init__(self, host, port, timeout):
            calls.update(host=host, port=port, timeout=timeout)

        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

        def starttls(self):
            pass

        def login(self, username, password):
            pass

        def sendmail(self, sender, recipients, message):
            pass

    monkeypatch.setattr(auth.settings, "ENVIRONMENT", "production")
    monkeypatch.setattr(auth.settings, "SMTP_HOST", "smtp.example.com")
    monkeypatch.setattr(auth.settings, "SMTP_PORT", 587)
    monkeypatch.setattr(auth.settings, "SMTP_USER", "mailer")
    monkeypatch.setattr(auth.settings, "SMTP_PASSWORD", "test-secret")
    monkeypatch.setattr(auth.settings, "SMTP_FROM", "noreply@example.com")
    monkeypatch.setattr(auth.settings, "SMTP_USE_TLS", True)
    monkeypatch.setattr(auth.settings, "RESEND_API_KEY", "")
    monkeypatch.setattr(auth.smtplib, "SMTP", FakeSMTP)

    assert auth._send_otp_email("new-user@example.com", "123456", "New User")
    assert calls["timeout"] == 10


def test_resend_provider_sends_email_over_https(monkeypatch):
    calls = {}

    class FakeResponse:
        is_success = True
        status_code = 200

    def fake_post(url, *, headers, json, timeout):
        calls.update(url=url, headers=headers, payload=json, timeout=timeout)
        return FakeResponse()

    monkeypatch.setattr(auth.settings, "RESEND_API_KEY", "re_test_key")
    monkeypatch.setattr(auth.settings, "SMTP_FROM", "ScopeGraph <onboarding@resend.dev>")
    monkeypatch.setattr(auth.httpx, "post", fake_post)

    assert auth._send_otp_email("new-user@example.com", "123456", "New User")
    assert calls["url"] == "https://api.resend.com/emails"
    assert calls["headers"]["Authorization"] == "Bearer re_test_key"
    assert calls["payload"]["to"] == ["new-user@example.com"]
    assert calls["payload"]["from"] == "ScopeGraph <onboarding@resend.dev>"
    assert calls["timeout"] == 10.0
