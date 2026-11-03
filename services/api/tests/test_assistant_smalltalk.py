from fastapi.testclient import TestClient

from app.ai.provider import CompletionTokenLimitError, MetaAIHttpProvider
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


def test_language_preference_is_answered_locally():
    response = TestClient(app).post(
        "/api/v1/assistant/chat",
        json={"message": "Nói tiếng Việt được không?", "history": [], "language": "vi"},
    )

    assert response.status_code == 200
    assert response.json()["model"] == "local-smalltalk"
    assert "Được chứ" in response.json()["answer"]


def test_truncated_chat_completion_retries_with_latest_message_only():
    provider = object.__new__(MetaAIHttpProvider)
    provider.provider_name = "test-provider"
    calls = []

    def fake_call_model(system_prompt, user_prompt, **kwargs):
        calls.append((system_prompt, user_prompt, kwargs))
        if len(calls) == 1:
            raise CompletionTokenLimitError("truncated")
        return {"answer": "MCP connects coding agents to ScopeGraph tools.", "grounded": True}, 0.1, "test-model", None

    provider._call_model = fake_call_model
    result = provider.chat(
        [
            {"role": "user", "content": "What is MCP?"},
            {"role": "assistant", "content": "MCP exposes tools."},
            {"role": "user", "content": "Can you answer in Vietnamese?"},
        ],
        language="en",
    )

    assert len(calls) == 2
    assert calls[1][1] == [{"role": "user", "content": "Can you answer in Vietnamese?"}]
    assert calls[1][2]["max_tokens"] == 700
    assert result.data["grounded"] is True
