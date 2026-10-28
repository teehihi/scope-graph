import os
import json
import time
import httpx
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db.database import Base
from app.db.models import Repository, IndexedFile, IndexedSymbol, DependencyEdge
from app.indexing.engine import IndexingEngine
from app.analysis.orchestrator import AnalysisOrchestrator
from app.analysis import orchestrator as orchestrator_module
from app.ai.provider import MetaAIHttpProvider, OfflineDemoProvider
from app.core.config import settings
from app.mcp import server as mcp_server

@pytest.fixture
def test_db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()

def test_full_e2e_indexing_and_analysis(test_db, monkeypatch):
    monkeypatch.setattr(settings, "META_AI_PROVIDER", "offline_demo")
    sample_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../examples/sample-repository"))
    assert os.path.exists(sample_dir), f"Sample repository dir not found at {sample_dir}"

    # 1. Create Repository
    repo = Repository(
        id="test-e2e-repo",
        name="Sample Auth & User Service",
        workspace_path=sample_dir,
        status="pending"
    )
    test_db.add(repo)
    test_db.commit()

    # 2. Index Repository
    indexing_engine = IndexingEngine(test_db)
    indexed_repo = indexing_engine.index_repository("test-e2e-repo")

    assert indexed_repo.status == "ready"
    assert indexed_repo.stats["file_count"] >= 10
    assert indexed_repo.stats["symbol_count"] > 10
    assert indexed_repo.stats["edge_count"] > 5
    assert indexed_repo.stats["endpoint_count"] >= 3
    assert indexed_repo.stats["test_count"] >= 3

    # 3. Run Impact Analysis
    orchestrator = AnalysisOrchestrator(test_db)
    requirement = "Require email verification before users can change their email address."
    run = orchestrator.run_analysis(
        repository_id="test-e2e-repo",
        requirement=requirement,
    )

    assert run.status == "completed"
    report = run.result_json
    assert report is not None
    assert "affected_items" in report
    assert len(report["affected_items"]) > 0
    assert run.provider == "offline_demo"
    assert run.model == "deterministic-semantic-matcher"
    assert report["operational_metadata"]["model"] == "deterministic-semantic-matcher"
    assert report["operational_metadata"]["structured_inference_latency_seconds"] >= 0
    assert report["operational_metadata"]["token_usage"] is None
    assert report["retrieval_metadata"]["selected_files"] > 0
    assert report["retrieval_metadata"]["context_token_budget"] >= 1

    # Ensure critical files are identified
    affected_paths = [item["file_path"] for item in report["affected_items"]]
    assert any("user_service.py" in p for p in affected_paths)

    # Ensure implementation brief exists and is well-structured
    assert run.brief_markdown != ""
    assert "# ScopeGraph Implementation Brief" in run.brief_markdown
    assert "Requirement:" in run.brief_markdown
    assert "user_service.py" in run.brief_markdown

    # 4. Test MCP integration tools
    # Override SessionLocal in mcp_server to use test_db for isolated test
    orig_session_local = mcp_server.SessionLocal
    mcp_server.SessionLocal = lambda: test_db

    try:
        # Test analyze_change MCP tool
        mcp_res = mcp_server.analyze_change("test-e2e-repo", requirement)
        mcp_data = json.loads(mcp_res)
        assert mcp_data["status"] == "completed"
        assert "result" in mcp_data

        # Test get_relevant_context MCP tool
        ctx_res = mcp_server.get_relevant_context("test-e2e-repo", "email verification update")
        ctx_data = json.loads(ctx_res)
        assert len(ctx_data["context_items"]) > 0
        first_item = ctx_data["context_items"][0]
        assert "file_path" in first_item
        assert "content_preview" in first_item

        # Test suggest_tests MCP tool
        tests_res = mcp_server.suggest_tests("test-e2e-repo", requirement)
        tests_data = json.loads(tests_res)
        assert len(tests_data["existing_tests_in_repo"]) >= 3
        assert len(tests_data["proposed_tests_to_add"]) > 0
        # Check distinction: existing test names from sample repo
        test_names = [t["test_name"] for t in tests_data["existing_tests_in_repo"]]
        assert "test_update_user_email_direct" in test_names
    finally:
        mcp_server.SessionLocal = orig_session_local


def test_mocked_live_report_records_all_inference_usage(test_db, tmp_path, monkeypatch):
    source = tmp_path / "app/services/user_service.py"
    source.parent.mkdir(parents=True)
    source.write_text("def update_user_email():\n    pass\n", encoding="utf-8")
    test_db.add(Repository(id="live-repo", name="Live Mock", workspace_path=str(tmp_path), status="ready"))
    test_db.add(IndexedFile(id="live-file", repository_id="live-repo", path="app/services/user_service.py"))
    test_db.add(IndexedSymbol(id="live-symbol", repository_id="live-repo", file_id="live-file", name="update_user_email", symbol_type="function", line_start=1, line_end=2))
    test_db.commit()

    interpretation = {
        "business_intent": "Verify email changes", "actors": ["user"],
        "existing_behavior": "Immediate update", "desired_behavior": "Verify first",
        "preconditions": [], "postconditions": [], "security_implications": [],
        "validation_requirements": [], "affected_layers": ["service"],
        "search_keywords": ["email"], "ambiguities": [],
    }
    impact = {
        "affected_items": [{"file_path": "app/services/user_service.py", "symbol": "update_user_email", "impact_type": "direct", "category": "service", "reason": "Email update", "confidence": 0.9}],
        "risks": [], "suggested_tests": [], "assumptions": [],
    }
    review = {"areas_reviewed": ["service"], "is_complete": True, "potential_gaps": [], "additional_files_to_check": []}
    contents = [json.dumps(interpretation), json.dumps(impact), json.dumps(review), "# Brief"]
    requests = []

    def handler(request):
        requests.append(request)
        if len(requests) == 4:
            time.sleep(0.06)
        return httpx.Response(200, json={
            "model": "served-model",
            "choices": [{"message": {"content": contents[len(requests) - 1]}}],
            "usage": {"prompt_tokens": 1, "completion_tokens": 2, "total_tokens": 3},
        })

    provider = MetaAIHttpProvider("test-key", "https://mock.example/v1", "requested-model", "fireworks")
    provider.client.close()
    provider.client = httpx.Client(transport=httpx.MockTransport(handler))
    monkeypatch.setattr(orchestrator_module, "get_ai_provider", lambda: provider)
    try:
        run = AnalysisOrchestrator(test_db).run_analysis("live-repo", "Verify email changes")
    finally:
        provider.client.close()

    assert run.status == "completed"
    assert len(requests) == 4
    assert run.provider == "fireworks"
    assert run.model == "served-model"
    metadata = run.result_json["operational_metadata"]
    assert metadata["provider"] == "fireworks"
    assert metadata["model"] == "served-model"
    assert metadata["is_demo_mode"] is False
    assert metadata["token_usage"] == {"prompt_tokens": 4, "completion_tokens": 8, "total_tokens": 12}
    assert metadata["inference_latency_seconds"] >= metadata["structured_inference_latency_seconds"]
    assert metadata["execution_time_seconds"] == round(run.execution_time_seconds, 2)


def test_configured_live_provider_without_key_records_failed_run(test_db, tmp_path, monkeypatch):
    test_db.add(Repository(id="no-key-repo", name="No Key", workspace_path=str(tmp_path), status="ready"))
    test_db.commit()
    monkeypatch.setattr(settings, "META_AI_PROVIDER", "fireworks")
    monkeypatch.setattr(settings, "META_AI_API_KEY", "")

    run = AnalysisOrchestrator(test_db).run_analysis("no-key-repo", "Verify email")

    assert run.status == "failed"
    assert run.provider == "fireworks"
    assert "API key" in run.error_message
    assert not run.result_json


def test_review_suggestions_are_grounded_and_graph_neighbors_stay_potential(test_db, tmp_path, monkeypatch):
    for path in ("app/services/email.py", "app/api/routes.py", "app/config.py"):
        source = tmp_path / path
        source.parent.mkdir(parents=True, exist_ok=True)
        source.write_text("# indexed source\n", encoding="utf-8")
    test_db.add_all([
        Repository(id="impact-repo", name="Impact", workspace_path=str(tmp_path), status="ready"),
        Repository(id="other-repo", name="Other", workspace_path=str(tmp_path), status="ready"),
        IndexedFile(id="impact-service", repository_id="impact-repo", path="app/services/email.py"),
        IndexedFile(id="impact-route", repository_id="impact-repo", path="app/api/routes.py"),
        IndexedFile(id="impact-config", repository_id="impact-repo", path="app/config.py"),
        IndexedFile(id="other-secret", repository_id="other-repo", path="other/secret.py"),
        DependencyEdge(repository_id="impact-repo", source_file_id="impact-route",
                       target_file_id="impact-service", edge_type="imports"),
    ])
    test_db.commit()

    class ReviewProvider(OfflineDemoProvider):
        def reason_about_impact(self, requirement_interpretation, retrieved_files, dependency_context):
            result = super().reason_about_impact(requirement_interpretation, retrieved_files, dependency_context)
            result.data["affected_items"] = [{
                "file_path": "app/services/email.py", "symbol": None, "impact_type": "direct",
                "category": "service", "reason": "Email behavior changes here", "confidence": 0.9,
            }]
            return result

        def review_completeness(self, requirement, proposed_impact, repository_context):
            result = super().review_completeness(requirement, proposed_impact, repository_context)
            result.data["is_complete"] = True
            result.data["additional_files_to_check"] = [
                "app/config.py", "missing.py", "../outside.py", "other/secret.py"
            ]
            return result

    monkeypatch.setattr(orchestrator_module, "get_ai_provider", ReviewProvider)
    run = AnalysisOrchestrator(test_db).run_analysis("impact-repo", "Verify email changes")

    assert run.status == "completed"
    report = run.result_json
    assert [item["file_path"] for item in report["affected_items"]] == ["app/services/email.py"]
    assert report["coverage_review"]["additional_files_to_check"] == ["app/config.py"]
    assert report["coverage_review"]["is_complete"] is False
    assert {item["claimed_path"] for item in report["coverage_review"]["rejected_file_suggestions"]} == {
        "missing.py", "../outside.py", "other/secret.py",
    }
    potential = {item["file_path"]: item for item in report["potential_impacts"]}
    assert set(potential) == {"app/api/routes.py", "app/config.py"}
    assert potential["app/api/routes.py"]["dependency_paths"]["downstream"] == [
        "app/services/email.py", "app/api/routes.py",
    ]
    assert potential["app/config.py"]["sources"] == ["completeness_review"]
    assert all(item["impact_status"] == "potential" and item["impact_supported"] is False
               for item in potential.values())


def test_weak_query_does_not_send_arbitrary_files_to_provider(test_db, tmp_path, monkeypatch):
    test_db.add(Repository(id="weak-repo", name="Weak", workspace_path=str(tmp_path), status="ready"))
    test_db.add_all([
        IndexedFile(id=f"weak-{index}", repository_id="weak-repo", path=f"app/unrelated_{index}.py")
        for index in range(10)
    ])
    test_db.commit()

    class CaptureProvider(OfflineDemoProvider):
        def __init__(self):
            self.retrieved_files = None

        def reason_about_impact(self, requirement_interpretation, retrieved_files, dependency_context):
            self.retrieved_files = retrieved_files
            return super().reason_about_impact(requirement_interpretation, retrieved_files, dependency_context)

    provider = CaptureProvider()
    monkeypatch.setattr(orchestrator_module, "get_ai_provider", lambda: provider)
    run = AnalysisOrchestrator(test_db).run_analysis("weak-repo", "Optimize quantum bridge routing")

    assert run.status == "completed"
    assert provider.retrieved_files == []
    assert run.result_json["retrieval_metadata"]["selected_files"] == 0
    assert run.result_json["affected_items"] == []
