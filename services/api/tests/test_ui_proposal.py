"""Offline contract tests for the UI proposal route and untrusted specification."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.db.database import Base, get_db
from app.db.models import IndexedFile, IndexedSymbol, Repository
from app.main import app
from app.ai.ui_spec import StructuredUISpecV1
from app.ai.provider import AIProviderResponse, BaseMetaAIProvider
from app.ai.routing import AIStage, ProviderCapabilities, ProviderConfig, ProviderRegistry, StageProviderRouter
from app.api.routes import ui_proposals
from app.ai.ui_proposal_v2 import UIChangesV2, UIIntentV2, find_related_ui_targets
from app.core.sessions import optional_session_user
from app.db.models import User
from pydantic import ValidationError


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "WORKSPACE_DIR", str(tmp_path))
    engine = create_engine(f"sqlite:///{tmp_path / 'proposals.db'}", connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine)
    with factory() as db:
        db.add_all([
            Repository(id="sample", name="Sample Auth & User Service", description="Multi-tier microservice with API routers, UserService, VerificationService, and automated tests.", status="ready", workspace_path=str(tmp_path / "sample")),
            Repository(id="private", name="Private", status="ready", owner_email="owner@example.com", workspace_path=str(tmp_path)),
            Repository(id="pending", name="Sample Auth & User Service", description="Multi-tier microservice with API routers, UserService, VerificationService, and automated tests.", status="indexing", workspace_path=str(tmp_path / "pending")),
            Repository(id="spoofed", name="Sample Auth & User Service", description="Multi-tier microservice with API routers, UserService, VerificationService, and automated tests.", status="ready", workspace_path=str(tmp_path / "other")),
            IndexedFile(id="file1", repository_id="sample", path="app/api/users.py"),
            IndexedSymbol(id="sym1", repository_id="sample", file_id="file1", name="login_user", symbol_type="endpoint", line_start=1, line_end=1),
        ])
        db.commit()

    def local_db():
        with factory() as db:
            yield db

    app.dependency_overrides[get_db] = local_db
    monkeypatch.setattr(settings, "ENVIRONMENT", "development")
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.pop(get_db, None)
        engine.dispose()


def generate(client, repo="sample", **updates):
    payload = {"requirement": "Redesign the account login page with clear errors", "version": 1}
    payload.update(updates)
    return client.post(f"/api/v1/repositories/{repo}/ui-proposals/generate", json=payload)


def test_offline_generation_returns_valid_labeled_spec_and_bounded_context(client):
    response = generate(client)
    assert response.status_code == 200
    body = response.json()
    assert body["spec"]["schema_version"] == "1"
    assert body["spec"]["root"]["type"] == "Container"
    assert body["generation"]["mode"] == "offline"
    assert body["generation"]["cost_usd"] is None
    assert body["generation"]["cost_status"] == "unavailable"
    assert body["generation"]["context_paths"] == ["app/api/users.py"]
    assert "api_key" not in str(body).lower()


def test_refinement_produces_next_version_without_changing_original_requirement(client):
    first = generate(client).json()["spec"]
    response = generate(client, version=2, refinement="Use a two-column layout", previous_spec=first)
    assert response.status_code == 200
    assert response.json()["spec"]["version"] == 2
    assert response.json()["spec"]["requirement"] == first["requirement"]


@pytest.mark.parametrize("repo,status", [("missing", 404), ("private", 403), ("pending", 400), ("spoofed", 403)])
def test_repository_boundary(client, repo, status):
    assert generate(client, repo=repo).status_code == status


@pytest.mark.parametrize("updates", [
    {"requirement": ""},
    {"requirement": "x" * 4001},
    {"version": 2, "refinement": "change"},
    {"version": 1, "refinement": "change"},
])
def test_invalid_requests_do_not_generate(client, updates):
    assert generate(client, **updates).status_code in {400, 422}


def test_unsafe_specs_rejected():
    baseline = {"version": 1, "requirement": "Login", "title": "Login", "description": "Review",
                "root": {"type": "Container", "children": [{"type": "Button", "text": "Continue"}]}}
    for bad in (
        {"root": {"type": "Script"}},
        {"root": {"type": "Container", "children": [{"type": "Text", "text": "<script>alert(1)</script>"}]}},
        {"root": {"type": "Container", "children": [{"type": "Input", "label": "Email", "href": "https://evil.test"}]}},
        {"responsive": {"desktop_columns": 99}},
        {"root": {"type": "Container", "children": [{"type": "Text", "text": "x"}] * 13}},
    ):
        with pytest.raises(ValidationError):
            StructuredUISpecV1.model_validate(baseline | bad)


def test_live_disabled_even_if_key_present(client, monkeypatch):
    monkeypatch.setattr(settings, "META_AI_PROVIDER", "meta_model_api")
    monkeypatch.setattr(settings, "META_AI_API_KEY", "fake-test-key")
    monkeypatch.setattr(settings, "UI_PROPOSAL_LIVE_ENABLED", False)
    assert generate(client).json()["generation"]["mode"] == "offline"


def test_explicit_live_fails_closed_without_configuration(client, monkeypatch):
    monkeypatch.setattr(settings, "UI_PROPOSAL_LIVE_ENABLED", False)
    response = generate(client, mode="live")
    assert response.status_code == 503
    assert "spec" not in response.json()


def test_provider_status_does_not_expose_credentials(client, monkeypatch):
    monkeypatch.setattr(settings, "META_AI_API_KEY", "sensitive-test-value")
    response = client.get("/api/v1/repositories/sample/ui-proposals/status")
    assert response.status_code == 200
    assert response.json()["offline_available"] is True
    assert response.json()["live_available"] is False
    assert "sensitive-test-value" not in response.text
    assert client.get("/api/v1/repositories/private/ui-proposals/status").status_code == 403


def test_style_edit_has_conceptual_before_and_patch_metadata(client):
    response = generate(client, requirement="Đổi nút phân tích tác động mã nguồn thành màu đỏ và góc cạnh thành hình vuông.", mode="offline")
    assert response.status_code == 200
    body = response.json()
    assert body["intent"]["operation"] == "MODIFY_STYLE"
    assert body["patch"]["changes"]["background_color"] == "red"
    assert body["patch"]["changes"]["border_radius"] == "square"
    assert body["preview_provenance"] == "conceptual_approximation"
    assert body["before_spec"]["root"]["children"][0]["type"] == "Button"
    assert body["spec"]["root"]["children"][0]["button_variant"] == "red"
    assert body["spec"]["root"]["children"][0]["button_shape"] == "square"
    assert body["target_resolution"]["status"] == "conceptual"


def test_missing_style_target_does_not_create_unrelated_form(client):
    response = generate(client, requirement="Change the button to red", mode="offline")
    assert response.status_code == 422


def test_initial_form_layout_edit_is_labeled_approximation(client):
    response = generate(client, requirement="Change existing form layout to two columns", mode="offline")
    assert response.status_code == 200
    body = response.json()
    assert body["preview_provenance"] == "conceptual_approximation"
    assert body["spec"]["root"]["children"][0]["layout_columns"] == 2


def test_refine_adds_component_without_rebuilding_existing_spec(client):
    first = generate(client, requirement="Create a new login page", mode="offline").json()["spec"]
    response = generate(client, requirement=first["requirement"], version=2,
                        refinement="Add a new alert component", previous_spec=first, mode="offline")
    assert response.status_code == 200
    body = response.json()
    assert body["patch"]["operation"] == "CREATE_COMPONENT"
    assert body["spec"]["root"]["children"][:len(first["root"]["children"])] == first["root"]["children"]
    assert len(body["spec"]["root"]["children"]) == len(first["root"]["children"]) + 1


def test_live_opt_in_rejects_anonymous_sample(client, monkeypatch):
    monkeypatch.setattr(settings, "UI_PROPOSAL_LIVE_ENABLED", True)
    assert generate(client, mode="live").status_code == 503


def test_production_fails_closed(client, monkeypatch):
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    assert generate(client).status_code == 503


def _owner_session():
    app.dependency_overrides[optional_session_user] = lambda: User(email="owner@example.com", is_verified=True)


def test_baseten_live_status_reports_baseten_and_hides_key(client, monkeypatch):
    _owner_session()
    monkeypatch.setattr(settings, "UI_PROPOSAL_LIVE_ENABLED", True)
    monkeypatch.setattr(settings, "UI_PROPOSAL_LIVE_PROVIDER", "baseten")
    monkeypatch.setattr(settings, "BASETEN_UI_API_KEY", "baseten-test-key-never-sent")
    monkeypatch.setattr(settings, "BASETEN_UI_BASE_URL", "https://inference.baseten.co/v1")
    monkeypatch.setattr(settings, "BASETEN_UI_MODEL", "meta-models/muse-spark-open-1026")
    try:
        response = client.get("/api/v1/repositories/private/ui-proposals/status")
        assert response.status_code == 200
        assert response.json()["live_available"] is True
        assert response.json()["provider"] == "baseten"
        assert "baseten-test-key-never-sent" not in response.text
    finally:
        app.dependency_overrides.pop(optional_session_user, None)


def test_baseten_live_uses_vision_key_fallback(client, monkeypatch):
    _owner_session()
    monkeypatch.setattr(settings, "UI_PROPOSAL_LIVE_ENABLED", True)
    monkeypatch.setattr(settings, "UI_PROPOSAL_LIVE_PROVIDER", "baseten")
    monkeypatch.setattr(settings, "BASETEN_UI_API_KEY", "")
    monkeypatch.setattr(settings, "BASETEN_VISION_API_KEY", "vision-test-key-never-sent")
    monkeypatch.setattr(settings, "BASETEN_UI_BASE_URL", "https://inference.baseten.co/v1")
    try:
        response = client.get("/api/v1/repositories/private/ui-proposals/status")
        assert response.json()["live_available"] is True
        assert response.json()["provider"] == "baseten"
        assert "vision-test-key-never-sent" not in response.text
    finally:
        app.dependency_overrides.pop(optional_session_user, None)


def test_baseten_live_fails_closed_without_key(client, monkeypatch):
    _owner_session()
    monkeypatch.setattr(settings, "UI_PROPOSAL_LIVE_ENABLED", True)
    monkeypatch.setattr(settings, "UI_PROPOSAL_LIVE_PROVIDER", "baseten")
    monkeypatch.setattr(settings, "BASETEN_UI_API_KEY", "")
    monkeypatch.setattr(settings, "BASETEN_VISION_API_KEY", "")
    try:
        assert generate(client, repo="private", mode="live").status_code == 503
    finally:
        app.dependency_overrides.pop(optional_session_user, None)


def test_meta_live_status_unchanged(client, monkeypatch):
    _owner_session()
    monkeypatch.setattr(settings, "UI_PROPOSAL_LIVE_ENABLED", True)
    monkeypatch.setattr(settings, "UI_PROPOSAL_LIVE_PROVIDER", "meta_model_api")
    monkeypatch.setattr(settings, "META_AI_PROVIDER", "meta_model_api")
    monkeypatch.setattr(settings, "META_AI_API_KEY", "meta-test-key-never-sent")
    monkeypatch.setattr(settings, "META_AI_BASE_URL", "https://api.meta.ai/v1")
    try:
        response = client.get("/api/v1/repositories/private/ui-proposals/status")
        assert response.json()["live_available"] is True
        assert response.json()["provider"] == "meta_model_api"
    finally:
        app.dependency_overrides.pop(optional_session_user, None)


def test_production_live_baseten_passes_environment_gate_with_mocked_router(client, monkeypatch):
    _owner_session()
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    monkeypatch.setattr(settings, "UI_PROPOSAL_LIVE_ENABLED", True)
    monkeypatch.setattr(settings, "UI_PROPOSAL_LIVE_PROVIDER", "baseten")
    monkeypatch.setattr(settings, "BASETEN_UI_API_KEY", "baseten-test-key-never-sent")
    monkeypatch.setattr(settings, "BASETEN_UI_BASE_URL", "https://inference.baseten.co/v1")

    valid_spec = {"schema_version": "1", "version": 1,
                  "requirement": "Redesign the account login page with clear errors",
                  "title": "Login", "description": "Preview", "root": {"type": "Container"}}

    class FakeProvider(BaseMetaAIProvider):
        def generate_ui_spec(self, *args, **kwargs):
            return AIProviderResponse(valid_spec, "baseten", "meta-models/muse-spark-open-1026", 0.01)

    def mocked_router(_live):
        registry = ProviderRegistry()
        registry.register(ProviderConfig("baseten", "meta-models/muse-spark-open-1026", "", "NONE",
            ProviderCapabilities(frozenset({AIStage.UI_GENERATION})), 1, 0, 100, 1), FakeProvider())
        return StageProviderRouter(registry, {AIStage.UI_GENERATION: "baseten"})

    monkeypatch.setattr(ui_proposals, "_ui_router", mocked_router)
    try:
        response = generate(client, repo="private", mode="live")
        assert response.status_code == 200
        assert response.json()["generation"]["mode"] == "live"
        assert response.json()["generation"]["provider"] == "baseten"
    finally:
        app.dependency_overrides.pop(optional_session_user, None)


def test_production_live_without_configuration_still_fails_closed(client, monkeypatch):
    _owner_session()
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    monkeypatch.setattr(settings, "UI_PROPOSAL_LIVE_ENABLED", False)
    try:
        assert generate(client, repo="private", mode="live").status_code == 503
    finally:
        app.dependency_overrides.pop(optional_session_user, None)


def test_request_body_limit(client):
    response = client.post("/api/v1/repositories/sample/ui-proposals/generate", content=b"x" * 100_001,
                           headers={"content-type": "application/json"})
    assert response.status_code == 413


@pytest.mark.parametrize("payload", [
    {"schema_version": "1", "version": 1, "requirement": "Redesign the account login page with clear errors",
     "title": "Login", "description": "Preview", "root": {"type": "Script"}},
    {"schema_version": "1", "version": 2, "requirement": "Redesign the account login page with clear errors",
     "title": "Login", "description": "Preview", "root": {"type": "Container"}},
])
def test_mock_provider_invalid_or_drifted_response_fails_closed(client, monkeypatch, payload):
    class FakeProvider(BaseMetaAIProvider):
        def generate_ui_spec(self, *args, **kwargs):
            return AIProviderResponse(payload, "mock_ui", "fixture", 0.01, is_mock_or_demo=True)

    def mocked_router(_live):
        registry = ProviderRegistry()
        registry.register(ProviderConfig("mock_ui", "fixture", "", "NONE",
            ProviderCapabilities(frozenset({AIStage.UI_GENERATION})), 1, 0, 100, 1), FakeProvider())
        return StageProviderRouter(registry, {AIStage.UI_GENERATION: "mock_ui"})

    monkeypatch.setattr(ui_proposals, "_ui_router", mocked_router)
    assert generate(client).status_code == 502


def test_mocked_live_invalid_patch_fails_without_offline_fallback(client, monkeypatch):
    app.dependency_overrides[optional_session_user] = lambda: User(email="owner@example.com", is_verified=True)
    monkeypatch.setattr(settings, "UI_PROPOSAL_LIVE_ENABLED", True)
    monkeypatch.setattr(settings, "META_AI_PROVIDER", "meta_model_api")
    monkeypatch.setattr(settings, "META_AI_API_KEY", "test-key-never-sent")
    monkeypatch.setattr(settings, "META_AI_BASE_URL", "https://api.meta.ai/v1")

    class FakeProvider(BaseMetaAIProvider):
        def generate_ui_patch(self, *args, **kwargs):
            return AIProviderResponse({"operation": "MODIFY_STYLE", "target_label": "Save",
                "changes": {"background_color": "url(https://invalid.test)"}}, "mock", "fixture", 0.01)

    def mocked_router(_live):
        registry = ProviderRegistry()
        registry.register(ProviderConfig("mock", "fixture", "", "NONE",
            ProviderCapabilities(frozenset({AIStage.UI_GENERATION})), 1, 0, 700, 1), FakeProvider())
        return StageProviderRouter(registry, {AIStage.UI_GENERATION: "mock"})

    monkeypatch.setattr(ui_proposals, "_ui_router", mocked_router)
    try:
        response = generate(client, repo="private", requirement="Change button Save to red", mode="live")
        assert response.status_code == 502
        assert "spec" not in response.json()
        assert "test-key-never-sent" not in response.text
    finally:
        app.dependency_overrides.pop(optional_session_user, None)


def _live_baseten_settings(monkeypatch):
    monkeypatch.setattr(settings, "UI_PROPOSAL_LIVE_ENABLED", True)
    monkeypatch.setattr(settings, "UI_PROPOSAL_LIVE_PROVIDER", "baseten")
    monkeypatch.setattr(settings, "BASETEN_UI_API_KEY", "baseten-test-key-never-sent")
    monkeypatch.setattr(settings, "BASETEN_UI_BASE_URL", "https://inference.baseten.co/v1")
    monkeypatch.setattr(settings, "BASETEN_UI_MODEL", "meta-models/muse-spark-open-1026")


def test_live_missing_target_generates_new_spec_instead_of_422(client, monkeypatch):
    app.dependency_overrides[optional_session_user] = lambda: User(email="owner@example.com", is_verified=True)
    _live_baseten_settings(monkeypatch)
    valid_spec = {"schema_version": "1", "version": 1, "requirement": "Change the button to red",
                  "title": "Login", "description": "Preview",
                  "root": {"type": "Container", "children": [{"type": "Button", "text": "Continue", "button_variant": "red"}]}}

    class FakeProvider(BaseMetaAIProvider):
        def generate_ui_spec(self, *args, **kwargs):
            return AIProviderResponse(valid_spec, "baseten", "meta-models/muse-spark-open-1026", 0.01)

    def mocked_router(_live):
        registry = ProviderRegistry()
        registry.register(ProviderConfig("baseten", "meta-models/muse-spark-open-1026", "", "NONE",
            ProviderCapabilities(frozenset({AIStage.UI_GENERATION})), 1, 0, 100, 1), FakeProvider())
        return StageProviderRouter(registry, {AIStage.UI_GENERATION: "baseten"})

    monkeypatch.setattr(ui_proposals, "_ui_router", mocked_router)
    try:
        response = generate(client, repo="private", requirement="Change the button to red", mode="live")
        assert response.status_code == 200
        assert response.json()["generation"]["mode"] == "live"
        assert response.json()["generation"]["provider"] == "baseten"
    finally:
        app.dependency_overrides.pop(optional_session_user, None)


def _two_button_spec():
    return {"schema_version": "1", "version": 1, "requirement": "Redesign the account login page with clear errors",
            "title": "Login", "description": "Preview",
            "root": {"type": "Container", "children": [{"type": "Button", "text": "Continue"}, {"type": "Button", "text": "Cancel"}]}}


def test_live_ai_fallback_remaps_target_to_a_proposal_node(client, monkeypatch):
    app.dependency_overrides[optional_session_user] = lambda: User(email="owner@example.com", is_verified=True)
    _live_baseten_settings(monkeypatch)
    monkeypatch.setattr(ui_proposals, "_live_ai_intent", lambda *args, **kwargs: UIIntentV2(
        operation="MODIFY_STYLE", target_description="Continue button", target_label="Continue",
        changes=UIChangesV2(background_color="red")))

    class FakeProvider(BaseMetaAIProvider):
        def generate_ui_patch(self, *args, **kwargs):
            return AIProviderResponse({"operation": "MODIFY_STYLE", "target_label": "Continue",
                "changes": {"background_color": "red"}}, "baseten", "meta-models/muse-spark-open-1026", 0.01)

    def mocked_router(_live):
        registry = ProviderRegistry()
        registry.register(ProviderConfig("baseten", "meta-models/muse-spark-open-1026", "", "NONE",
            ProviderCapabilities(frozenset({AIStage.UI_GENERATION})), 1, 0, 700, 1), FakeProvider())
        return StageProviderRouter(registry, {AIStage.UI_GENERATION: "baseten"})

    monkeypatch.setattr(ui_proposals, "_ui_router", mocked_router)
    try:
        response = generate(client, repo="private", requirement="Redesign the account login page with clear errors",
                            version=2, refinement="Change the Save button to red",
                            previous_spec=_two_button_spec(), mode="live")
        assert response.status_code == 200
        body = response.json()
        assert body["spec"]["version"] == 2
        assert body["patch"]["target_label"] == "Continue"
        assert body["spec"]["root"]["children"][0]["button_variant"] == "red"
    finally:
        app.dependency_overrides.pop(optional_session_user, None)


def test_live_ai_fallback_failure_returns_502_not_422(client, monkeypatch):
    app.dependency_overrides[optional_session_user] = lambda: User(email="owner@example.com", is_verified=True)
    _live_baseten_settings(monkeypatch)
    monkeypatch.setattr(ui_proposals, "_live_ai_intent", lambda *args, **kwargs: None)
    try:
        response = generate(client, repo="private", requirement="Redesign the account login page with clear errors",
                            version=2, refinement="Change the Save button to red",
                            previous_spec=_two_button_spec(), mode="live")
        assert response.status_code == 502
        assert "spec" not in response.json()
    finally:
        app.dependency_overrides.pop(optional_session_user, None)


@pytest.fixture
def target_client(tmp_path, monkeypatch):
    """Sample-demo repo whose workspace actually contains UI buttons on disk."""
    monkeypatch.setattr(settings, "WORKSPACE_DIR", str(tmp_path))
    engine = create_engine(f"sqlite:///{tmp_path / 'targets.db'}", connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine)
    workspace = tmp_path / "sample"
    (workspace / "src" / "pages").mkdir(parents=True)
    (workspace / "src" / "pages" / "Login.tsx").write_text(
        'export function LoginPage() {\n'
        '  return <form><button className="rounded-xl bg-lime">Đăng nhập</button></form>;\n'
        '}\n', encoding="utf-8")
    (workspace / "src" / "pages" / "Register.tsx").write_text(
        'export function RegisterPage() {\n'
        '  return <button>Đăng ký</button>;\n'
        '}\n', encoding="utf-8")
    with factory() as db:
        db.add_all([
            Repository(id="sample", name="Sample Auth & User Service", description="Multi-tier microservice with API routers, UserService, VerificationService, and automated tests.", status="ready", workspace_path=str(workspace)),
            IndexedFile(id="login", repository_id="sample", path="src/pages/Login.tsx"),
            IndexedFile(id="register", repository_id="sample", path="src/pages/Register.tsx"),
        ])
        db.commit()

    def local_db():
        with factory() as db:
            yield db

    app.dependency_overrides[get_db] = local_db
    monkeypatch.setattr(settings, "ENVIRONMENT", "development")
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.pop(get_db, None)
        engine.dispose()


def _find_related_db(tmp_path, dummy_py_files=0):
    """In-memory DB pointing at a workspace with a multi-line Sign In button."""
    engine = create_engine(f"sqlite:///{tmp_path / 'related.db'}", connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine)
    workspace = tmp_path / "ws"
    (workspace / "src").mkdir(parents=True)
    (workspace / "src" / "Login.tsx").write_text(
        'export function LoginPage() {\n'
        '  return (\n'
        '    <button type="submit" className="rounded-xl bg-ink">\n'
        '      <span>Sign In</span>\n'
        '    </button>\n'
        '  );\n'
        '}\n', encoding="utf-8")
    rows = [Repository(id="sg", name="scope-graph", description="x", status="ready", workspace_path=str(workspace)),
            IndexedFile(id="login", repository_id="sg", path="src/Login.tsx")]
    for i in range(dummy_py_files):
        rows.append(IndexedFile(id=f"dummy{i}", repository_id="sg", path=f"src/dummy{i}.py"))
    with factory() as db:
        db.add_all(rows)
        db.commit()
    return factory(), workspace


def test_find_related_multiline_sign_in_button_is_found_as_button(tmp_path):
    db, _ = _find_related_db(tmp_path)
    _, candidates, diagnostics = find_related_ui_targets(db, "sg", "I want to change the color of Sign In button to red")
    assert candidates, "Multi-line <button> + <span>Sign In</span> must be found"
    assert candidates[0].label == "Sign In"
    assert candidates[0].component == "button"
    assert diagnostics["needs_reindex"] is False


def test_find_related_ui_files_survive_many_non_ui_files(tmp_path):
    # Regression: capping the full file list at 500 used to cut UI files
    # off in large repos before they were ever filtered by extension.
    db, _ = _find_related_db(tmp_path, dummy_py_files=600)
    _, candidates, diagnostics = find_related_ui_targets(db, "sg", "I want to change the color of Sign In button to red")
    assert candidates and candidates[0].label == "Sign In"
    assert diagnostics["ui_files_total"] == 1
    assert diagnostics["files_scanned"] == 1


def test_find_related_reports_needs_reindex_when_workspace_files_are_gone(tmp_path):
    db, workspace = _find_related_db(tmp_path)
    (workspace / "src" / "Login.tsx").unlink()
    _, candidates, diagnostics = find_related_ui_targets(db, "sg", "I want to change the color of Sign In button to red")
    assert candidates == []
    assert diagnostics["ui_files_total"] == 1
    assert diagnostics["files_scanned"] == 0
    assert diagnostics["needs_reindex"] is True


def test_targets_endpoint_finds_real_login_button_before_any_ai_call(target_client):
    response = target_client.post("/api/v1/repositories/sample/ui-proposals/targets",
                                  json={"requirement": "Tôi muốn đổi nút đăng nhập thành màu đỏ"})
    assert response.status_code == 200
    data = response.json()
    assert data["candidates"], "Expected the real login button to be found deterministically"
    first = data["candidates"][0]
    assert first["path"] == "src/pages/Login.tsx"
    assert first["label"] == "Đăng nhập"
    assert "Đăng nhập" in first["evidence"]
    assert first["context_snippet"]


def test_targets_endpoint_returns_empty_when_no_button_matches(target_client):
    response = target_client.post("/api/v1/repositories/sample/ui-proposals/targets",
                                  json={"requirement": "Tôi muốn đổi nút thanh toán thành màu đỏ"})
    assert response.status_code == 200
    assert response.json()["candidates"] == []


def test_confirmed_target_generates_offline_edit_of_real_button(target_client):
    targets = target_client.post("/api/v1/repositories/sample/ui-proposals/targets",
                                 json={"requirement": "Tôi muốn đổi nút đăng nhập thành màu đỏ"}).json()
    ref = targets["candidates"][0]["ref"]
    response = generate(target_client, requirement="Tôi muốn đổi nút đăng nhập thành màu đỏ",
                        version=1, selected_target_path=ref)
    assert response.status_code == 200
    spec = response.json()["spec"]
    buttons = []

    def walk(node):
        if node["type"] == "Button":
            buttons.append(node)
        for child in node.get("children", []):
            walk(child)

    walk(spec["root"])
    assert len(buttons) == 1
    assert buttons[0]["text"] == "Đăng nhập"
    assert buttons[0]["button_variant"] == "red"
