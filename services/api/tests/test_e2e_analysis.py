import os
import json
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db.database import Base
from app.db.models import Repository
from app.indexing.engine import IndexingEngine
from app.analysis.orchestrator import AnalysisOrchestrator
from app.mcp import server as mcp_server

@pytest.fixture
def test_db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()

def test_full_e2e_indexing_and_analysis(test_db):
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
