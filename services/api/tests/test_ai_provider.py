import json

import httpx
import pytest

from app.ai.provider import MetaAIHttpProvider, OfflineDemoProvider, get_ai_provider
from app.core.config import settings


INTERPRETATION = {
    "business_intent": "Protect email changes",
    "actors": ["user"],
    "existing_behavior": "Immediate update",
    "desired_behavior": "Verify first",
    "preconditions": ["authenticated"],
    "postconditions": ["email updated"],
    "security_implications": ["account takeover"],
    "validation_requirements": ["valid token"],
    "affected_layers": ["api", "service"],
    "search_keywords": ["email"],
    "ambiguities": [],
}

IMPACT = {
    "affected_items": [{
        "file_path": "app/services/user_service.py",
        "symbol": None,
        "impact_type": "direct",
        "category": "service",
        "reason": "Changes email state",
        "confidence": 0.9,
    }],
    "risks": ["token replay"],
    "suggested_tests": ["test expiration"],
    "assumptions": [],
}

REVIEW = {
    "areas_reviewed": ["api", "service"],
    "is_complete": True,
    "potential_gaps": [],
    "additional_files_to_check": [],
}


@pytest.fixture
def provider_with_transport():
    providers = []

    def make(handler, max_retries=2):
        provider = MetaAIHttpProvider(
            api_key="test-key",
            base_url="https://mock.example/v1",
            model="requested-model",
            provider_name="fireworks",
        )
        provider.max_retries = max_retries
        provider.retry_backoff_seconds = 0
        provider.client.close()
        provider.client = httpx.Client(transport=httpx.MockTransport(handler))
        providers.append(provider)
        return provider

    yield make
    for provider in providers:
        provider.client.close()


def model_response(content, model="served-model", usage=None):
    return httpx.Response(200, json={
        "model": model,
        "choices": [{"message": {"content": content}}],
        "usage": usage,
    })


@pytest.mark.parametrize("stage,payload", [
    ("interpret", INTERPRETATION),
    ("impact", IMPACT),
    ("review", REVIEW),
])
def test_http_provider_returns_validated_data_and_actual_metadata(provider_with_transport, stage, payload):
    requests = []

    def handler(request):
        requests.append(request)
        return model_response(json.dumps(payload), usage={"prompt_tokens": 12, "completion_tokens": 7, "total_tokens": 19})

    provider = provider_with_transport(handler)
    if stage == "interpret":
        result = provider.interpret_requirement("Verify email")
    elif stage == "impact":
        result = provider.reason_about_impact(INTERPRETATION, [], {})
    else:
        result = provider.review_completeness("Verify email", IMPACT, {})

    assert result.data == payload
    assert result.provider == "fireworks"
    assert result.model == "served-model"
    assert result.latency_seconds >= 0
    assert result.token_usage == {"prompt_tokens": 12, "completion_tokens": 7, "total_tokens": 19}
    assert result.is_mock_or_demo is False
    assert len(requests) == 1
    assert requests[0].url.path == "/v1/chat/completions"
    assert json.loads(requests[0].content)["model"] == "requested-model"


@pytest.mark.parametrize("bad_impact", [
    {**IMPACT, "affected_items": [{**IMPACT["affected_items"][0], "confidence": 1.2}]},
    {**IMPACT, "affected_items": [{**IMPACT["affected_items"][0], "impact_type": "certain"}]},
    {**IMPACT, "affected_items": [{**IMPACT["affected_items"][0], "category": "unknown"}]},
    {**IMPACT, "affected_items": [{**IMPACT["affected_items"][0], "file_path": 42}]},
    {**IMPACT, "affected_items": [{**IMPACT["affected_items"][0], "confidence": "0.9"}]},
    {**IMPACT, "risks": "not a list"},
])
def test_invalid_impact_schema_fails_instead_of_returning_report(provider_with_transport, bad_impact):
    provider = provider_with_transport(lambda request: model_response(json.dumps(bad_impact)))

    with pytest.raises(ValueError, match="schema"):
        provider.reason_about_impact(INTERPRETATION, [], {})


@pytest.mark.parametrize("stage,payload", [
    ("interpret", {"business_intent": "Missing fields"}),
    ("review", {**REVIEW, "is_complete": "maybe"}),
])
def test_missing_or_invalid_stage_fields_fail(provider_with_transport, stage, payload):
    provider = provider_with_transport(lambda request: model_response(json.dumps(payload)))

    with pytest.raises(ValueError, match="schema"):
        if stage == "interpret":
            provider.interpret_requirement("Verify email")
        else:
            provider.review_completeness("Verify email", IMPACT, {})


@pytest.mark.parametrize("content", ["{invalid", "[]"])
def test_malformed_or_non_object_json_fails(provider_with_transport, content):
    provider = provider_with_transport(lambda request: model_response(content))

    with pytest.raises(ValueError, match="JSON|schema"):
        provider.interpret_requirement("Verify email")


def test_missing_chat_completion_fields_fail(provider_with_transport):
    provider = provider_with_transport(lambda request: httpx.Response(200, json={"choices": []}))

    with pytest.raises(ValueError, match="response"):
        provider.interpret_requirement("Verify email")


@pytest.mark.parametrize("status", [429, 500, 503])
def test_transient_http_failures_retry_then_succeed(provider_with_transport, status):
    attempts = []

    def handler(request):
        attempts.append(request)
        if len(attempts) < 3:
            return httpx.Response(status)
        return model_response(json.dumps(INTERPRETATION))

    result = provider_with_transport(handler).interpret_requirement("Verify email")

    assert result.data == INTERPRETATION
    assert len(attempts) == 3


def test_transient_connection_error_retries(provider_with_transport):
    attempts = []

    def handler(request):
        attempts.append(request)
        if len(attempts) == 1:
            raise httpx.ConnectError("temporary disconnect", request=request)
        return model_response(json.dumps(INTERPRETATION))

    assert provider_with_transport(handler).interpret_requirement("Verify email").data == INTERPRETATION
    assert len(attempts) == 2


def test_timeout_has_bounded_retries(provider_with_transport):
    attempts = []

    def handler(request):
        attempts.append(request)
        raise httpx.ReadTimeout("timed out", request=request)

    with pytest.raises(ValueError, match="timeout"):
        provider_with_transport(handler).interpret_requirement("Verify email")
    assert len(attempts) == 3


@pytest.mark.parametrize("status", [400, 401, 403])
def test_permanent_http_failures_are_not_retried(provider_with_transport, status):
    attempts = []

    def handler(request):
        attempts.append(request)
        return httpx.Response(status, text="do not expose provider details")

    with pytest.raises(ValueError) as exc_info:
        provider_with_transport(handler).interpret_requirement("Verify email")
    assert len(attempts) == 1
    assert "do not expose provider details" not in str(exc_info.value)


def test_missing_key_does_not_fall_back_to_demo(monkeypatch):
    monkeypatch.setattr(settings, "META_AI_PROVIDER", "fireworks")
    monkeypatch.setattr(settings, "META_AI_API_KEY", "")

    with pytest.raises(ValueError, match="API key"):
        get_ai_provider()


def test_offline_provider_is_explicitly_labeled(monkeypatch):
    monkeypatch.setattr(settings, "META_AI_PROVIDER", "offline_demo")
    monkeypatch.setattr(settings, "META_AI_API_KEY", "")

    provider = get_ai_provider()
    response = provider.interpret_requirement("Verify email")

    assert isinstance(provider, OfflineDemoProvider)
    assert provider.provider_name == "offline_demo"
    assert provider.model == "deterministic-semantic-matcher"
    assert response.provider == "offline_demo"
    assert response.model == "deterministic-semantic-matcher"
    assert response.is_mock_or_demo is True
