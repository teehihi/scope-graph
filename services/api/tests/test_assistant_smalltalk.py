from fastapi.testclient import TestClient

from app.api.routes import assistant
from app.main import app


def test_standalone_greeting_is_answered_without_ai(monkeypatch):
    def unexpected_provider_call():
        raise AssertionError("smalltalk should not call an AI provider")

    monkeypatch.setattr(assistant, "get_ai_provider", unexpected_provider_call)

    response = TestClient(app).post(
        "/api/v1/assistant/chat",
        json={"message": "Hello bà nha", "history": [], "language": "vi"},
    )

    assert response.status_code == 200
    assert response.json()["model"] == "local-smalltalk"
    assert "Chào bạn" in response.json()["answer"]


def test_product_question_with_greeting_still_uses_ai(monkeypatch):
    class ProviderResponse:
        data = {"answer": "I can explain that.", "grounded": True}
        model = "test-model"

    class Provider:
        def chat(self, messages, language):
            assert messages[-1]["content"] == "Hi, what is ScopeGraph?"
            return ProviderResponse()

    monkeypatch.setattr(assistant, "get_ai_provider", lambda: Provider())

    response = TestClient(app).post(
        "/api/v1/assistant/chat",
        json={"message": "Hi, what is ScopeGraph?", "history": [], "language": "en"},
    )

    assert response.status_code == 200
    assert response.json()["model"] == "test-model"
