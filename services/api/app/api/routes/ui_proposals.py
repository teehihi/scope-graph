"""Bounded, fail-closed UI proposal generation. No generated code is executed."""

from typing import Any, Literal
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field, model_validator
from sqlalchemy.orm import Session

from app.ai.provider import AIProviderResponse, MetaAIHttpProvider, OfflineDemoProvider
from app.ai.routing import AIStage, BasetenVisionProvider, ProviderCapabilities, ProviderConfig, ProviderRegistry, StageExecutionError, StageProviderRouter, _approved_endpoint
from app.ai.ui_spec import StructuredUISpecV1, UIComponentV1
from app.ai.ui_proposal_v2 import UIChangesV2, UIPatchV2, apply_ui_patch, interpret_ui_intent, resolve_ui_targets
from app.analysis.retriever import HybridRetriever
from app.core.config import settings
from app.core.sessions import optional_session_user
from app.db.database import get_db
from app.db.models import Repository, User

router = APIRouter(tags=["UI proposals"])


class UIProposalRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    requirement: str = Field(min_length=1, max_length=2000)
    refinement: str | None = Field(default=None, min_length=1, max_length=1000)
    previous_spec: StructuredUISpecV1 | None = None
    version: int = Field(default=1, ge=1, le=20, strict=True)
    mode: Literal["offline", "live"] = "offline"
    target_label: str | None = Field(default=None, max_length=160)
    selected_target_path: str | None = Field(default=None, max_length=1024)

    @model_validator(mode="after")
    def valid_version(self):
        if self.version == 1 and (self.refinement or self.previous_spec):
            raise ValueError("Initial generation cannot include refinement or previous spec")
        if self.version > 1 and (not self.refinement or not self.previous_spec):
            raise ValueError("Refinement requires both instructions and previous spec")
        if self.previous_spec and (self.previous_spec.version + 1 != self.version or
                                   self.previous_spec.requirement != self.requirement):
            raise ValueError("Previous spec must match the requirement and preceding version")
        return self


def _live_provider_name() -> str:
    return settings.UI_PROPOSAL_LIVE_PROVIDER.strip().lower() or "meta_model_api"


def _baseten_ui_key() -> tuple[str, str]:
    """Baseten UI key, falling back to the vision key already set on Render.

    The hackathon key is a single Baseten credential that only works with the
    hackathon model, so a separate BASETEN_UI_API_KEY is optional; when it is
    empty, the already-configured BASETEN_VISION_API_KEY is reused for UI
    generation. Only the credential reference (never the value) is recorded.
    """
    if settings.BASETEN_UI_API_KEY.strip():
        return settings.BASETEN_UI_API_KEY.strip(), "BASETEN_UI_API_KEY"
    return settings.BASETEN_VISION_API_KEY.strip(), "BASETEN_VISION_API_KEY"


def _baseten_ui_configured() -> bool:
    key, _ref = _baseten_ui_key()
    return bool(key and _approved_endpoint(settings.BASETEN_UI_BASE_URL, "baseten"))


def _meta_live_configured() -> bool:
    return bool(settings.META_AI_PROVIDER == "meta_model_api" and settings.META_AI_API_KEY.strip()
                and _approved_endpoint(settings.META_AI_BASE_URL, "meta"))


def _live_provider_id() -> str | None:
    """The live provider that is actually usable, or None when live is closed."""
    if not settings.UI_PROPOSAL_LIVE_ENABLED:
        return None
    if _live_provider_name() == "baseten" and _baseten_ui_configured():
        return "baseten"
    if _live_provider_name() == "meta_model_api" and _meta_live_configured():
        return "meta_model_api"
    return None


def _ui_router(live: bool) -> StageProviderRouter:
    registry = ProviderRegistry()
    if live and _live_provider_id() == "baseten":
        # BasetenVisionProvider is only a Baseten endpoint validator on top of
        # the generic OpenAI-compatible MetaAIHttpProvider transport: it
        # already implements generate_ui_spec / generate_ui_patch, with
        # json_object responses validated against the UI schemas.
        key, credential_ref = _baseten_ui_key()
        provider = BasetenVisionProvider(
            api_key=key, base_url=settings.BASETEN_UI_BASE_URL, model=settings.BASETEN_UI_MODEL,
            timeout_seconds=60, max_retries=0, max_tokens=2500, request_budget=1,
        )
        config = ProviderConfig("baseten", settings.BASETEN_UI_MODEL, settings.BASETEN_UI_BASE_URL,
                                credential_ref, ProviderCapabilities(frozenset({AIStage.UI_GENERATION})),
                                60, 0, 2500, 1)
    elif live:
        provider = MetaAIHttpProvider(
            settings.META_AI_API_KEY, settings.META_AI_BASE_URL, settings.META_AI_MODEL,
            provider_name="meta_model_api", timeout_seconds=30, max_retries=0,
            max_tokens=2500, request_budget=1,
        )
        config = ProviderConfig("meta_model_api", settings.META_AI_MODEL, settings.META_AI_BASE_URL,
                                "META_AI_API_KEY", ProviderCapabilities(frozenset({AIStage.UI_GENERATION})),
                                30, 0, 2500, 1)
    else:
        provider = OfflineDemoProvider()
        config = ProviderConfig("offline_demo", provider.model, "", "NONE",
                                ProviderCapabilities(frozenset({AIStage.UI_GENERATION})), 5, 0, 2500, 1)
    registry.register(config, provider)
    return StageProviderRouter(registry, {AIStage.UI_GENERATION: config.provider_id}, "meta_only")


def _conceptual_button(requirement: str, label: str) -> StructuredUISpecV1:
    """A deliberately narrow approximation, never presented as captured repository UI."""
    return StructuredUISpecV1(version=1, requirement=requirement, title="Button edit concept",
        description="Approximate button only; the selected repository UI was not rendered.",
        root=UIComponentV1(type="Container", semantic_role="main", children=[
            UIComponentV1(type="Button", text=label, interaction="local_submit", button_variant="lime", button_shape="soft"),
        ]), uncertainties=["The original repository screen and click behavior are not captured in this preview."])


def _empty_concept(requirement: str) -> StructuredUISpecV1:
    return StructuredUISpecV1(version=1, requirement=requirement, title="Component concept",
        description="Conceptual canvas, not the original repository screen.",
        root=UIComponentV1(type="Container", semantic_role="main"),
        uncertainties=["No original repository UI was captured."])


def _conceptual_layout(requirement: str, target_label: str) -> StructuredUISpecV1:
    if target_label.casefold() == "form":
        root = UIComponentV1(type="Container", children=[UIComponentV1(type="Form", children=[
            UIComponentV1(type="Input", label="Example field"),
            UIComponentV1(type="Button", text="Example action"),
        ])])
    else:
        root = UIComponentV1(type="Container", children=[
            UIComponentV1(type="Card", children=[UIComponentV1(type="Text", text="Example section A")]),
            UIComponentV1(type="Card", children=[UIComponentV1(type="Text", text="Example section B")]),
        ])
    return StructuredUISpecV1(version=1, requirement=requirement, title="Layout concept",
        description="Approximate layout only; repository UI was not captured.", root=root,
        uncertainties=["Placeholder fields and sections do not represent the selected repository."])


def _single_button_label(spec: StructuredUISpecV1 | None) -> str | None:
    if spec is None:
        return None
    buttons = []
    stack = [spec.root]
    while stack:
        node = stack.pop()
        if node.type == "Button":
            buttons.append(node.text or node.label)
        stack.extend(node.children)
    return buttons[0] if len(buttons) == 1 else None


def _is_sample_demo(repo: Repository) -> bool:
    return bool(
        repo.name == "Sample Auth & User Service"
        and repo.owner_email is None
        and repo.description == "Multi-tier microservice with API routers, UserService, VerificationService, and automated tests."
        and repo.workspace_path
        and Path(repo.workspace_path).resolve() == (Path(settings.WORKSPACE_DIR) / repo.id).resolve()
    )


@router.get("/repositories/{repository_id}/ui-proposals/status")
def ui_proposal_status(repository_id: str, db: Session = Depends(get_db),
                       current_user: User | None = Depends(optional_session_user)) -> dict[str, Any]:
    repo = db.query(Repository).filter(Repository.id == repository_id).first()
    if not repo:
        raise HTTPException(404, "Repository not found")
    owned = bool(current_user and repo.owner_email and current_user.email.lower() == repo.owner_email.lower())
    if not owned and not _is_sample_demo(repo):
        raise HTTPException(403, "A repository owner session is required")
    # Live is deliberately not gated on ENVIRONMENT: it is a paid, opt-in,
    # owned-repository-only feature with an approved endpoint, so it may run
    # in production once configured. Offline stays development-only.
    live_provider = _live_provider_id()
    live_available = bool(repo.status == "ready" and owned and live_provider)
    return {"offline_available": settings.ENVIRONMENT.lower() == "development" and repo.status == "ready",
            "live_available": live_available, "provider": live_provider,
            "reason": None if live_available else "Live AI requires an owned repository, live opt-in, and an approved Meta or Baseten configuration"}


@router.post("/repositories/{repository_id}/ui-proposals/generate")
def generate_ui_proposal(
    repository_id: str, payload: UIProposalRequest,
    db: Session = Depends(get_db), current_user: User | None = Depends(optional_session_user),
) -> dict[str, Any]:
    live = payload.mode == "live"
    if not live and settings.ENVIRONMENT.lower() != "development":
        raise HTTPException(503, "UI proposals are available only in restricted local development")
    repo = db.query(Repository).filter(Repository.id == repository_id).first()
    if not repo:
        raise HTTPException(404, "Repository not found")
    sample_demo = _is_sample_demo(repo)
    owns_repo = bool(current_user and repo.owner_email and current_user.email.lower() == repo.owner_email.lower())
    if not owns_repo and not sample_demo:
        raise HTTPException(403, "A repository owner session is required")
    if repo.status != "ready":
        raise HTTPException(400, "Repository must finish indexing before proposal generation")
    if not payload.requirement.strip() or (payload.refinement is not None and not payload.refinement.strip()):
        raise HTTPException(400, "Requirement and refinement must contain text")

    if live and (not owns_repo or _live_provider_id() is None):
        raise HTTPException(503, "Live UI generation requires an owned repository and an approved Meta or Baseten configuration")

    instruction = payload.refinement or payload.requirement
    intent = interpret_ui_intent(instruction, refining=payload.refinement is not None)
    target_label = payload.target_label or intent.target_label or _single_button_label(payload.previous_spec)
    if intent.operation == "CREATE_COMPONENT":
        target_label = "root"
    if intent.operation in {"MODIFY_COMPONENT", "MODIFY_STYLE", "MODIFY_LAYOUT", "REMOVE_COMPONENT", "REFINE_PROPOSAL"} and not target_label:
        raise HTTPException(422, "Specify an existing UI target or select a proposal version with one button")
    candidates = resolve_ui_targets(db, repository_id, target_label) if target_label else []
    if len(candidates) > 1 and not payload.selected_target_path:
        raise HTTPException(409, {"message": "Multiple UI targets match; select a source path", "candidates": [c.model_dump() for c in candidates]})
    if payload.selected_target_path and payload.selected_target_path not in {c.ref for c in candidates}:
        raise HTTPException(422, "Selected UI target is not grounded in the indexed repository")
    selected_candidate = next((c for c in candidates if c.ref == payload.selected_target_path), None) if payload.selected_target_path else candidates[0] if candidates else None
    target_resolution = {"status": "source_backed" if selected_candidate else "conceptual",
                         "selected": selected_candidate.model_dump() if selected_candidate else None,
                         "candidates": [c.model_dump() for c in candidates]}
    result = HybridRetriever(db).retrieve(repository_id, payload.requirement, top_k=5, context_token_budget=800)
    context = [{"path": item["path"], "symbols": [s["name"] for s in item.get("symbols", [])[:5]]}
               for item in result.items[:5]]
    stage_router = _ui_router(live)
    try:
        patch = None
        before = payload.previous_spec
        is_edit = intent.operation in {"CREATE_COMPONENT", "MODIFY_COMPONENT", "MODIFY_STYLE", "MODIFY_LAYOUT", "REMOVE_COMPONENT", "REFINE_PROPOSAL"} and bool(target_label)
        if is_edit:
            if before is None:
                if intent.operation == "REMOVE_COMPONENT":
                    raise HTTPException(422, "Removal requires an existing proposal version")
                before = (_empty_concept(payload.requirement) if intent.operation == "CREATE_COMPONENT" else
                          _conceptual_layout(payload.requirement, target_label) if intent.operation == "MODIFY_LAYOUT" else
                          _conceptual_button(payload.requirement, target_label))
            if live:
                response: AIProviderResponse = stage_router.execute(
                    AIStage.UI_GENERATION, "generate_ui_patch", instruction, target_label,
                    before.model_dump(), [c.model_dump() for c in candidates[:5]],
                )
                patch = UIPatchV2.model_validate(response.data)
                if patch.target_label.casefold() != target_label.casefold():
                    raise HTTPException(502, "Provider changed the selected UI target")
            else:
                if intent.operation == "CREATE_COMPONENT":
                    component = UIComponentV1(type="Text", text="Alert" if "alert" in instruction.casefold() else "New component")
                    changes = UIChangesV2(component=component)
                elif intent.operation == "REMOVE_COMPONENT":
                    changes = UIChangesV2(remove=True)
                else:
                    changes = intent.changes
                if changes is None:
                    raise HTTPException(422, "Offline mode cannot interpret this edit; specify a supported color, shape, icon or layout change")
                patch = UIPatchV2(operation=intent.operation,
                                  target_label=target_label, changes=changes)
                response = AIProviderResponse(patch.model_dump(), "offline_demo", "deterministic-semantic-matcher", 0.0, is_mock_or_demo=True)
            spec = apply_ui_patch(before, patch, payload.version)
        else:
            response = stage_router.execute(
                AIStage.UI_GENERATION, "generate_ui_spec", payload.requirement, payload.version,
                payload.refinement, payload.previous_spec.model_dump() if payload.previous_spec else None, context,
            )
            spec = StructuredUISpecV1.model_validate(response.data)
        if spec.requirement != payload.requirement or spec.version != payload.version:
            raise HTTPException(502, "Provider changed proposal identity")
        metadata = stage_router.metadata[-1].as_dict() if stage_router.metadata else {"request_count": 0}
        return {"spec": spec.model_dump(), "generation": {
            "mode": "offline" if response.is_mock_or_demo else "live",
            "provider": response.provider, "model": response.model,
            "latency_seconds": response.latency_seconds, "token_usage": response.token_usage,
            "cost_usd": None, "cost_status": "unavailable",
            "request_count": metadata["request_count"],
            "context_paths": [item["path"] for item in context],
        }, "intent": intent.model_dump(), "patch": patch.model_dump() if patch else None,
            "target_resolution": target_resolution, "before_spec": before.model_dump() if before else None,
            "preview_provenance": "proposal_version" if payload.previous_spec else "conceptual_approximation" if before else "new_proposal",
            "change_summary": instruction[:200]}
    except StageExecutionError as error:
        raise HTTPException(502, f"UI generation failed: {error.code}") from None
    except ValueError:
        raise HTTPException(502, "UI generation returned an invalid specification") from None
    finally:
        stage_router.close()
