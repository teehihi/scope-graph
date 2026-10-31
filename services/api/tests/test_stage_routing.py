"""Stage routing contracts; remote calls are replaced at the HTTP boundary."""

import json
from pathlib import Path

import httpx
import pytest

from app.ai.image_input import ValidatedScreenshot
from app.ai.provider import AIProviderResponse, OfflineDemoProvider
from app.ai.routing import (
    AIStage, BasetenVisionProvider, ModalReasoningProvider, ProviderCapabilities, ProviderConfig, ProviderRegistry,
    StageExecutionError, StageProviderRouter, build_stage_router,
)
from app.core.config import settings


class StageStub(OfflineDemoProvider):
    def __init__(self, name: str, failure: str | None = None):
        self.provider_name = name
        self.model = f"{name}-model"
        self.failure = failure
        self.calls = []

    def interpret_requirement(self, requirement):
        self.calls.append(requirement)
        if self.failure:
            raise ValueError(self.failure)
        return AIProviderResponse({"business_intent": requirement}, self.provider_name,
                                  self.model, 0.01, is_mock_or_demo=True,
                                  token_usage={"total_tokens": 3})


def config(name, stages, fallback=None):
    return ProviderConfig(provider_id=name, model_id=f"{name}-model", base_url="",
                          credential_ref="", capabilities=ProviderCapabilities(frozenset(stages)),
                          timeout_seconds=10, max_retries=0, max_response_tokens=100,
                          request_budget=2, fallback_provider_id=fallback)


def test_router_dispatches_only_the_selected_stage_and_records_metadata():
    selected = StageStub("selected")
    unused = StageStub("unused")
    registry = ProviderRegistry()
    registry.register(config("selected", {AIStage.REQUIREMENT_INTERPRETATION}), selected)
    registry.register(config("unused", {AIStage.IMPACT_REASONING}), unused)
    router = StageProviderRouter(registry, {AIStage.REQUIREMENT_INTERPRETATION: "selected"})

    response = router.execute(AIStage.REQUIREMENT_INTERPRETATION, "interpret_requirement", "change email")

    assert response.data == {"business_intent": "change email"}
    assert selected.calls == ["change email"]
    assert unused.calls == []
    assert router.metadata[0].provider == "selected"
    assert router.metadata[0].actual_model == "selected-model"
    assert router.metadata[0].execution_mode == "mock"
    assert router.metadata[0].request_count == 0
    assert router.metadata[0].health_status == "healthy"


def test_router_rejects_missing_capability_before_calling_provider():
    provider = StageStub("wrong")
    registry = ProviderRegistry()
    registry.register(config("wrong", {AIStage.IMPACT_REASONING}), provider)
    router = StageProviderRouter(registry, {AIStage.REQUIREMENT_INTERPRETATION: "wrong"})

    with pytest.raises(StageExecutionError, match="capability"):
        router.execute(AIStage.REQUIREMENT_INTERPRETATION, "interpret_requirement", "x")
    assert provider.calls == []


def test_router_fallback_is_explicit_and_never_loops():
    primary = StageStub("primary", "Meta AI request timeout on primary")
    fallback = StageStub("fallback")
    registry = ProviderRegistry()
    registry.register(config("primary", {AIStage.REQUIREMENT_INTERPRETATION}, "fallback"), primary)
    registry.register(config("fallback", {AIStage.REQUIREMENT_INTERPRETATION}), fallback)
    router = StageProviderRouter(registry, {AIStage.REQUIREMENT_INTERPRETATION: "primary"})

    response = router.execute(AIStage.REQUIREMENT_INTERPRETATION, "interpret_requirement", "x")

    assert response.provider == "fallback"
    assert primary.calls == ["x"]
    assert fallback.calls == ["x"]
    assert router.metadata[-1].fallback_used is True
    assert router.metadata[0].health_status == "unavailable"


def test_router_blocks_schema_error_fallback_and_request_budget_exhaustion():
    primary = StageStub("primary", "Meta AI returned invalid RequirementInterpretation schema")
    fallback = StageStub("fallback")
    registry = ProviderRegistry()
    registry.register(config("primary", {AIStage.REQUIREMENT_INTERPRETATION}, "fallback"), primary)
    registry.register(config("fallback", {AIStage.REQUIREMENT_INTERPRETATION}), fallback)
    router = StageProviderRouter(registry, {AIStage.REQUIREMENT_INTERPRETATION: "primary"})
    with pytest.raises(StageExecutionError, match="invalid_schema"):
        router.execute(AIStage.REQUIREMENT_INTERPRETATION, "interpret_requirement", "x")
    assert fallback.calls == []

    primary.failure = None
    assert router.execute(AIStage.REQUIREMENT_INTERPRETATION, "interpret_requirement", "x")
    with pytest.raises(StageExecutionError, match="budget_exhausted"):
        router.execute(AIStage.REQUIREMENT_INTERPRETATION, "interpret_requirement", "x")


def test_meta_only_profile_uses_existing_provider_for_all_five_stages(monkeypatch):
    monkeypatch.setattr(settings, "AI_PROVIDER_PROFILE", "meta_only", raising=False)
    provider = StageStub("offline_demo")
    router = build_stage_router(provider)

    assert set(router.routes) == set(AIStage)
    assert len(set(router.routes.values())) == 1
    assert router.execute(AIStage.REQUIREMENT_INTERPRETATION,
                          "interpret_requirement", "x").provider == "offline_demo"


def test_multi_ai_rejects_missing_deployments_without_network(monkeypatch):
    monkeypatch.setattr(settings, "AI_PROVIDER_PROFILE", "multi_ai", raising=False)
    monkeypatch.setattr(settings, "BASETEN_VISION_BASE_URL", "", raising=False)
    monkeypatch.setattr(settings, "MODAL_REASONING_BASE_URL", "", raising=False)
    with pytest.raises(ValueError, match="Baseten Vision"):
        build_stage_router(StageStub("meta_model_api"))


def test_multi_ai_cannot_activate_in_public_environment(monkeypatch):
    monkeypatch.setattr(settings, "AI_PROVIDER_PROFILE", "multi_ai", raising=False)
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    with pytest.raises(ValueError, match="deployment access review"):
        build_stage_router(StageStub("meta_model_api"))


def test_router_closes_owned_http_clients():
    provider = BasetenVisionProvider(api_key="test-only", base_url="https://inference.baseten.co/v1",
                                     model="configured-vision")
    registry = ProviderRegistry()
    registry.register(config("baseten_vision", {AIStage.VISION}), provider)
    router = StageProviderRouter(registry, {AIStage.VISION: "baseten_vision"})
    router.close()
    assert provider.client.is_closed


def test_multi_ai_profile_resolves_explicit_partner_stages_without_request(monkeypatch):
    values = {
        "AI_PROVIDER_PROFILE": "multi_ai", "ENVIRONMENT": "development",
        "META_AI_PROVIDER": "meta_model_api", "META_AI_API_KEY": "test-only",
        "META_AI_BASE_URL": "https://api.meta.ai/v1",
        "BASETEN_VISION_BASE_URL": "https://inference.baseten.co/v1",
        "BASETEN_VISION_MODEL": "configured-vision", "BASETEN_VISION_API_KEY": "test-only",
        "BASETEN_VISION_CAPABLE": True,
        "MODAL_REASONING_BASE_URL": "https://team--reason.modal.direct/v1",
        "MODAL_REASONING_MODEL": "configured-reason", "MODAL_REASONING_API_KEY": "test-only",
        "BASETEN_VISION_META_FALLBACK": False, "MODAL_REASONING_META_FALLBACK": False,
    }
    for name, value in values.items():
        monkeypatch.setattr(settings, name, value)

    router = build_stage_router(StageStub("meta_model_api"))
    try:
        assert router.routes == {
            AIStage.VISION: "baseten_vision",
            AIStage.REQUIREMENT_INTERPRETATION: "meta_model_api",
            AIStage.IMPACT_REASONING: "modal_reasoning",
            AIStage.COMPLETENESS_REVIEW: "meta_model_api",
            AIStage.BRIEF_GENERATION: "meta_model_api",
        }
        assert router.registry.get("baseten_vision")[0].fallback_provider_id is None
        assert router.registry.get("modal_reasoning")[0].fallback_provider_id is None
    finally:
        router.close()


def test_baseten_vision_uses_validated_image_and_rejects_extra_source_claims():
    requests = []
    visual = {
        "screen_type": "sign in", "visible_text": ["Sign in"],
        "visible_elements": ["button"], "user_actions": ["submit"],
        "functional_concepts": ["authentication"],
        "requirement_interpretation": "Update the sign in button",
        "uncertainties": [],
    }

    def transport(request):
        requests.append(request)
        return httpx.Response(200, json={"model": "served-vision", "choices": [
            {"message": {"content": json.dumps(visual)}}]})

    provider = BasetenVisionProvider(api_key="test-only", base_url="https://inference.baseten.co/v1",
                                     model="configured-vision", max_retries=0, request_budget=1)
    provider.client.close()
    provider.client = httpx.Client(transport=httpx.MockTransport(transport))
    image_path = Path(__file__).parent / "evaluation/screenshots_v1/sign_in.png"
    image = ValidatedScreenshot.from_bytes(image_path.read_bytes(), "image/png")
    try:
        response = provider.interpret_screenshot("Change sign in button", image)
        assert len(requests) == 1
        visual["file_path"] = "invented.py"
        with pytest.raises(ValueError, match="budget"):
            provider.interpret_screenshot("Change sign in button", image)
    finally:
        provider.client.close()

    rejecting = BasetenVisionProvider(api_key="test-only", base_url="https://inference.baseten.co/v1",
                                      model="configured-vision", max_retries=0, request_budget=1)
    rejecting.client.close()
    rejecting.client = httpx.Client(transport=httpx.MockTransport(transport))
    try:
        with pytest.raises(ValueError, match="invalid StructuredVisualIntent schema"):
            rejecting.interpret_screenshot("Change sign in button", image)
    finally:
        rejecting.client.close()

    payload = json.loads(requests[0].content)
    assert requests[0].url.path == "/v1/chat/completions"
    assert payload["model"] == "configured-vision"
    assert payload["messages"][1]["content"][1]["image_url"]["url"].startswith("data:image/png;base64,")
    assert response.model == "served-vision"
    assert len(requests) == 2
    with pytest.raises(ValueError, match="endpoint"):
        BasetenVisionProvider(api_key="test-only", base_url="https://evil.example/v1", model="x")


def test_modal_reasoning_uses_named_deployment_and_structured_impact_schema():
    impact = {"affected_items": [], "risks": [], "suggested_tests": [], "assumptions": []}
    requests = []

    def transport(request):
        requests.append(request)
        return httpx.Response(200, json={"model": "served-modal-model", "choices": [
            {"message": {"content": json.dumps(impact)}}]})

    provider = ModalReasoningProvider(api_key="test-only", base_url="https://team--reason.modal.direct/v1",
                                      model="configured-modal-model", max_retries=0, request_budget=2)
    provider.client.close()
    provider.client = httpx.Client(transport=httpx.MockTransport(transport))
    try:
        result = provider.reason_about_impact(
            {"business_intent": "Change article listing"},
            [{"path": "app/article.py", "source_excerpt": "def list_articles(): return []"}],
            {"paths": {"upstream": {}, "downstream": {}}},
        )
        impact["affected_items"] = [{"file_path": "invented.py"}]
        with pytest.raises(ValueError, match="invalid ImpactAnalysisResult schema"):
            provider.reason_about_impact({}, [], {})
    finally:
        provider.client.close()

    payload = json.loads(requests[0].content)
    assert payload["model"] == "configured-modal-model"
    assert "app/article.py" in payload["messages"][1]["content"]
    assert result.data["affected_items"] == []
    assert result.model == "served-modal-model"
