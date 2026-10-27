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
