import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.config import settings

client = TestClient(app)

def test_github_auth_url():
    settings.GITHUB_CLIENT_ID = "test_client_id"
    response = client.get("/api/v1/auth/github/url")
    assert response.status_code == 200
    data = response.json()
    assert "github.com/login/oauth/authorize" in data["url"]
    assert "test_client_id" in data["url"]
    assert data["client_id"] == "test_client_id"

def test_github_auth_missing_secret():
    settings.GITHUB_CLIENT_ID = "test_id"
    settings.GITHUB_CLIENT_SECRET = ""
    response = client.post("/api/v1/auth/github", json={"code": "dummy_code"})
    assert response.status_code == 400
    assert "not configured" in response.json()["detail"].lower()

def test_google_auth_url():
    settings.GOOGLE_CLIENT_ID = "test_google_id"
    response = client.get("/api/v1/auth/google/url")
    assert response.status_code == 200
    data = response.json()
    assert "accounts.google.com/o/oauth2/v2/auth" in data["url"]
    assert "test_google_id" in data["url"]
    assert data["client_id"] == "test_google_id"

def test_google_auth_missing_secret():
    settings.GOOGLE_CLIENT_ID = "test_google_id"
    settings.GOOGLE_CLIENT_SECRET = ""
    response = client.post("/api/v1/auth/google", json={"code": "dummy_code"})
    assert response.status_code == 400
    assert "not configured" in response.json()["detail"].lower()
