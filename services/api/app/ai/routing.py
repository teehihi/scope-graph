"""Per-analysis inference routing. No provider is selected from model output."""

from dataclasses import dataclass, field
from enum import StrEnum
import time
from typing import Any
from urllib.parse import urlparse

from app.ai.provider import AIProviderResponse, BaseMetaAIProvider, MetaAIHttpProvider, OfflineDemoProvider
from app.core.config import settings


class AIStage(StrEnum):
    VISION = "vision"
    REQUIREMENT_INTERPRETATION = "requirement_interpretation"
    IMPACT_REASONING = "impact_reasoning"
    COMPLETENESS_REVIEW = "completeness_review"
    BRIEF_GENERATION = "brief_generation"


class StageExecutionError(ValueError):
    def __init__(self, code: str, stage: AIStage):
        self.code = code
        self.stage = stage
        super().__init__(f"{stage.value}: {code}")


@dataclass(frozen=True)
class ProviderCapabilities:
    stages: frozenset[AIStage]

    def supports(self, stage: AIStage) -> bool:
        return stage in self.stages


@dataclass(frozen=True)
class ProviderConfig:
    provider_id: str
    model_id: str
    base_url: str
    credential_ref: str
    capabilities: ProviderCapabilities
    timeout_seconds: float
    max_retries: int
    max_response_tokens: int
    request_budget: int
    fallback_provider_id: str | None = None


@dataclass(frozen=True)
class StageExecutionMetadata:
    stage: str
    provider: str
    requested_model: str
    actual_model: str | None
    duration_seconds: float
    attempts: int
    retry_count: int
    request_count: int
    fallback_used: bool
    token_usage: dict[str, int] | None
    error_classification: str | None
    health_status: str
    execution_mode: str

    def as_dict(self) -> dict[str, Any]:
        return vars(self).copy()


class ProviderRegistry:
    def __init__(self):
        self._entries: dict[str, tuple[ProviderConfig, BaseMetaAIProvider]] = {}

    def register(self, config: ProviderConfig, provider: BaseMetaAIProvider) -> None:
        if config.provider_id in self._entries:
            raise ValueError("Duplicate stage provider identifier")
        if config.request_budget < 1 or config.max_retries < 0 or config.max_retries >= config.request_budget:
            raise ValueError("Invalid provider request budget or retry ceiling")
        self._entries[config.provider_id] = config, provider

    def get(self, provider_id: str) -> tuple[ProviderConfig, BaseMetaAIProvider]:
        if provider_id not in self._entries:
            raise ValueError("Unconfigured stage provider")
        return self._entries[provider_id]


def _error_code(error: Exception) -> str:
    message = str(error).lower()
    if "screenshot interpretation unavailable in offline demo mode" in message:
        return "vision_unavailable_offline"
    if "budget" in message:
        return "budget_exhausted"
    if "timeout" in message:
        return "timeout"
    if "connection" in message or "status 5" in message or "status 429" in message:
        return "provider_unavailable"
    if "schema" in message or "malformed" in message or "missing" in message:
        return "invalid_schema"
    if "auth" in message or "status 401" in message or "status 403" in message:
        return "authentication_failed"
    return "provider_error"


class StageProviderRouter:
    def __init__(self, registry: ProviderRegistry, routes: dict[AIStage, str], profile: str = "meta_only"):
        self.registry = registry
        self.routes = routes
        self.profile = profile
        self.metadata: list[StageExecutionMetadata] = []
        self._used: dict[str, int] = {}

    def close(self) -> None:
        """Release HTTP clients created for this analysis run."""
        seen: set[int] = set()
        for _config, provider in self.registry._entries.values():
            if id(provider) in seen:
                continue
            seen.add(id(provider))
            client = getattr(provider, "client", None)
            if client is not None:
                client.close()

    def execute(self, stage: AIStage, method: str, *args: Any, **kwargs: Any) -> Any:
        expected = {
            AIStage.VISION: "interpret_screenshot",
            AIStage.REQUIREMENT_INTERPRETATION: "interpret_requirement",
            AIStage.IMPACT_REASONING: "reason_about_impact",
            AIStage.COMPLETENESS_REVIEW: "review_completeness",
            AIStage.BRIEF_GENERATION: "generate_implementation_brief",
        }
        if expected[stage] != method:
            raise StageExecutionError("invalid_stage_method", stage)
        provider_id = self.routes.get(stage)
        if not provider_id:
            raise StageExecutionError("unconfigured", stage)
        config, provider = self.registry.get(provider_id)
        if not config.capabilities.supports(stage):
            raise StageExecutionError("capability_mismatch", stage)
        try:
            return self._call(stage, method, config, provider, False, *args, **kwargs)
        except StageExecutionError as error:
            if error.code not in {"timeout", "provider_unavailable"} or not config.fallback_provider_id:
                raise
            fallback_config, fallback_provider = self.registry.get(config.fallback_provider_id)
            if not fallback_config.capabilities.supports(stage):
                raise StageExecutionError("fallback_capability_mismatch", stage) from None
            return self._call(stage, method, fallback_config, fallback_provider, True, *args, **kwargs)

    def _call(self, stage: AIStage, method: str, config: ProviderConfig,
              provider: BaseMetaAIProvider, fallback: bool, *args: Any, **kwargs: Any) -> Any:
        if self._used.get(config.provider_id, 0) >= config.request_budget:
            raise StageExecutionError("budget_exhausted", stage)
        started = time.perf_counter()
        result = None
        code = None
        try:
            result = getattr(provider, method)(*args, **kwargs)
            return result
        except Exception as error:
            code = _error_code(error)
            raise StageExecutionError(code, stage) from None
        finally:
            requests = max(0, int(getattr(provider, "last_request_attempts", 0)))
            attempts = max(1, requests)
            self._used[config.provider_id] = self._used.get(config.provider_id, 0) + attempts
            is_mock = isinstance(result, AIProviderResponse) and result.is_mock_or_demo
            if isinstance(provider, OfflineDemoProvider) or config.provider_id.startswith("mock"):
                is_mock = True
            mode = "offline" if type(provider) is OfflineDemoProvider else ("mock" if is_mock else "live")
            self.metadata.append(StageExecutionMetadata(
                stage=stage.value, provider=config.provider_id,
                requested_model=config.model_id,
                actual_model=(None if code else (result.model if isinstance(result, AIProviderResponse)
                              else getattr(provider, "last_actual_model", None))),
                duration_seconds=round(time.perf_counter() - started, 4),
                attempts=attempts, retry_count=attempts - 1, request_count=requests,
                fallback_used=fallback,
                token_usage=(result.token_usage if isinstance(result, AIProviderResponse)
                             else getattr(provider, "brief_token_usage", None)),
                error_classification=code,
                health_status=("healthy" if code is None else
                               "unavailable" if code in {"timeout", "provider_unavailable"} else
                               "invalid_response" if code == "invalid_schema" else "blocked"),
                execution_mode=mode,
            ))


def _approved_endpoint(base_url: str, provider: str) -> bool:
    parsed = urlparse(base_url)
    host = parsed.hostname or ""
    if (parsed.scheme != "https" or parsed.port not in (None, 443) or
            parsed.username or parsed.password or parsed.query or parsed.fragment or
            parsed.path.rstrip("/") != "/v1"):
        return False
    if provider == "baseten":
        return host in {"inference.baseten.co", "bridge.baseten.co"}
    if provider == "modal":
        return host == "api.modal.com" or host.endswith((".modal.direct", ".modal.run"))
    return host == "api.meta.ai"


class BasetenVisionProvider(MetaAIHttpProvider):
    """OpenAI-compatible vision transport for an explicitly vision-capable deployment."""

    def __init__(self, *, api_key: str, base_url: str, model: str, **options: Any):
        if not _approved_endpoint(base_url, "baseten"):
            raise ValueError("Baseten Vision endpoint is not approved")
        super().__init__(api_key, base_url, model, provider_name="baseten", **options)


class ModalReasoningProvider(MetaAIHttpProvider):
    """OpenAI-compatible Chat Completions transport for a named Modal deployment."""

    def __init__(self, *, api_key: str, base_url: str, model: str, **options: Any):
        if not _approved_endpoint(base_url, "modal"):
            raise ValueError("Modal Reasoning endpoint is not approved")
        super().__init__(api_key, base_url, model, provider_name="modal", **options)


def build_stage_router(default_provider: BaseMetaAIProvider) -> StageProviderRouter:
    """Build one request-scoped router; partner inference is opt-in and fail-closed."""
    profile = settings.AI_PROVIDER_PROFILE.strip().lower()
    registry = ProviderRegistry()
    all_stages = frozenset(AIStage)
    if profile == "meta_only":
        provider_id = getattr(default_provider, "provider_name", "offline_demo")
        if isinstance(default_provider, MetaAIHttpProvider):
            default_provider.request_budget = 20
        registry.register(ProviderConfig(
            provider_id=provider_id,
            model_id=getattr(default_provider, "model", settings.META_AI_MODEL),
            base_url=getattr(default_provider, "base_url", ""),
            credential_ref="META_AI_API_KEY", capabilities=ProviderCapabilities(all_stages),
            timeout_seconds=45, max_retries=getattr(default_provider, "max_retries", 0),
            max_response_tokens=settings.META_AI_MAX_TOKENS,
            request_budget=20,
        ), default_provider)
        return StageProviderRouter(registry, {stage: provider_id for stage in AIStage}, profile)

    if profile != "multi_ai":
        raise ValueError("Unsupported AI provider profile")
    if settings.ENVIRONMENT not in {"development", "test"}:
        raise ValueError("Multi-AI requires deployment access review before public activation")
    if not (settings.BASETEN_VISION_BASE_URL and settings.BASETEN_VISION_MODEL and
            settings.BASETEN_VISION_API_KEY and settings.BASETEN_VISION_CAPABLE):
        raise ValueError("Baseten Vision requires an endpoint, model, credential and vision capability declaration")
    if not (settings.MODAL_REASONING_BASE_URL and settings.MODAL_REASONING_MODEL and
            settings.MODAL_REASONING_API_KEY):
        raise ValueError("Modal Reasoning requires an endpoint, model and credential")
    if not (settings.META_AI_PROVIDER == "meta_model_api" and settings.META_AI_API_KEY and
            _approved_endpoint(settings.META_AI_BASE_URL, "meta")):
        raise ValueError("Multi-AI requires an approved Meta Model API configuration")

    meta = default_provider
    if isinstance(meta, MetaAIHttpProvider):
        meta.request_budget = settings.MULTI_AI_META_REQUEST_BUDGET
    registry.register(ProviderConfig(
        provider_id="meta_model_api", model_id=settings.META_AI_MODEL,
        base_url=settings.META_AI_BASE_URL, credential_ref="META_AI_API_KEY",
        capabilities=ProviderCapabilities(all_stages), timeout_seconds=45,
        max_retries=settings.META_AI_MAX_RETRIES,
        max_response_tokens=settings.META_AI_MAX_TOKENS,
        request_budget=settings.MULTI_AI_META_REQUEST_BUDGET,
    ), meta)
    baseten = BasetenVisionProvider(
        api_key=settings.BASETEN_VISION_API_KEY, base_url=settings.BASETEN_VISION_BASE_URL,
        model=settings.BASETEN_VISION_MODEL,
        timeout_seconds=settings.BASETEN_VISION_TIMEOUT_SECONDS,
        max_retries=settings.BASETEN_VISION_MAX_RETRIES,
        max_tokens=settings.BASETEN_VISION_MAX_TOKENS,
        request_budget=settings.BASETEN_VISION_REQUEST_BUDGET,
    )
    registry.register(ProviderConfig(
        provider_id="baseten_vision", model_id=settings.BASETEN_VISION_MODEL,
        base_url=settings.BASETEN_VISION_BASE_URL, credential_ref="BASETEN_VISION_API_KEY",
        capabilities=ProviderCapabilities(frozenset({AIStage.VISION})),
        timeout_seconds=settings.BASETEN_VISION_TIMEOUT_SECONDS,
        max_retries=settings.BASETEN_VISION_MAX_RETRIES,
        max_response_tokens=settings.BASETEN_VISION_MAX_TOKENS,
        request_budget=settings.BASETEN_VISION_REQUEST_BUDGET,
        fallback_provider_id="meta_model_api" if settings.BASETEN_VISION_META_FALLBACK else None,
    ), baseten)
    modal = ModalReasoningProvider(
        api_key=settings.MODAL_REASONING_API_KEY, base_url=settings.MODAL_REASONING_BASE_URL,
        model=settings.MODAL_REASONING_MODEL,
        timeout_seconds=settings.MODAL_REASONING_TIMEOUT_SECONDS,
        max_retries=settings.MODAL_REASONING_MAX_RETRIES,
        max_tokens=settings.MODAL_REASONING_MAX_TOKENS,
        request_budget=settings.MODAL_REASONING_REQUEST_BUDGET,
    )
    registry.register(ProviderConfig(
        provider_id="modal_reasoning", model_id=settings.MODAL_REASONING_MODEL,
        base_url=settings.MODAL_REASONING_BASE_URL, credential_ref="MODAL_REASONING_API_KEY",
        capabilities=ProviderCapabilities(frozenset({AIStage.IMPACT_REASONING})),
        timeout_seconds=settings.MODAL_REASONING_TIMEOUT_SECONDS,
        max_retries=settings.MODAL_REASONING_MAX_RETRIES,
        max_response_tokens=settings.MODAL_REASONING_MAX_TOKENS,
        request_budget=settings.MODAL_REASONING_REQUEST_BUDGET,
        fallback_provider_id="meta_model_api" if settings.MODAL_REASONING_META_FALLBACK else None,
    ), modal)
    return StageProviderRouter(registry, {
        AIStage.VISION: "baseten_vision",
        AIStage.REQUIREMENT_INTERPRETATION: "meta_model_api",
        AIStage.IMPACT_REASONING: "modal_reasoning",
        AIStage.COMPLETENESS_REVIEW: "meta_model_api",
        AIStage.BRIEF_GENERATION: "meta_model_api",
    }, profile)
