"""Comprehensive security regression tests for ScopeGraph MCP server.

Covers:
1. Tool annotations (readOnlyHint, destructiveHint, idempotentHint, openWorldHint)
2. Input validation (invalid IDs, length boundaries, empty inputs)
3. Sensitive file exclusion (.env, keys, credentials)
4. Path traversal and symlink escapes
5. Secret redaction from preview snippets
6. Production live inference fail-closed protection
7. Generic error masking (no stack trace or internal leak)
"""

import json
import pytest
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.database import Base
from app.db.models import Repository, IndexedFile, IndexedSymbol
from app.mcp import server as mcp_server
from app.indexing.scanner import is_sensitive_path, scan_workspace
from app.core.config import settings


@pytest.fixture
def test_db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()


def test_mcp_annotations_are_explicit_and_truthful():
    """Verify that all exposed tools have accurate, explicit annotations."""
    tools = {
        "analyze_change": mcp_server._ANALYZE_CHANGE_ANNOTATIONS,
        "get_relevant_context": mcp_server._GET_RELEVANT_CONTEXT_ANNOTATIONS,
        "suggest_tests": mcp_server._SUGGEST_TESTS_ANNOTATIONS,
    }

    # Tool A: analyze_change modifies DB (AnalysisRun), calls external LLMs
    a = tools["analyze_change"]
    assert a is not None
    assert a.read_only_hint is False
    assert a.destructive_hint is False
    assert a.idempotent_hint is False
    assert a.open_world_hint is True

    # Tool B: get_relevant_context is read-only, local only, idempotent
    b = tools["get_relevant_context"]
    assert b is not None
    assert b.read_only_hint is True
    assert b.destructive_hint is False
    assert b.idempotent_hint is True
    assert b.open_world_hint is False

    # Tool C: suggest_tests is read-only, local only, idempotent
    c = tools["suggest_tests"]
    assert c is not None
    assert c.read_only_hint is True
    assert c.destructive_hint is False
    assert c.idempotent_hint is True
    assert c.open_world_hint is False


def test_mcp_input_validation_rejects_malicious_inputs():
    """Verify input validation on all MCP tools."""
    # Invalid repository_id
    bad_ids = ["", "   ", "../escape", "repo;rm -rf", "a" * 150, "repo$()"]
    for bad_id in bad_ids:
        res_a = json.loads(mcp_server.analyze_change(bad_id, "Valid requirement"))
        assert res_a["status"] == "error"
        assert "Invalid repository_id" in res_a["message"] or "empty" in res_a["message"].lower()

        res_b = json.loads(mcp_server.get_relevant_context(bad_id, "query"))
        assert res_b["status"] == "error"

        res_c = json.loads(mcp_server.suggest_tests(bad_id, "Valid requirement"))
        assert res_c["status"] == "error"

    # Empty requirement
    res_a_empty = json.loads(mcp_server.analyze_change("valid-repo", "   "))
    assert res_a_empty["status"] == "error"
    assert "Requirement cannot be empty" in res_a_empty["message"]

    res_c_empty = json.loads(mcp_server.suggest_tests("valid-repo", "   "))
    assert res_c_empty["status"] == "error"
    assert "Requirement cannot be empty" in res_c_empty["message"]

    # Oversized requirement (> 4000 chars)
    oversized = "a" * 4001
    res_a_over = json.loads(mcp_server.analyze_change("valid-repo", oversized))
    assert res_a_over["status"] == "error"
    assert "exceeds maximum allowed length" in res_a_over["message"]


def test_is_sensitive_path_detection():
    """Verify that is_sensitive_path catches env files, keys, and private folders."""
    sensitive_examples = [
        ".env",
        ".env.local",
        ".env.production",
        "subfolder/.env",
        "subfolder/.env.test",
        "server.key",
        "cert.pem",
        "cert.crt",
        ".ssh/id_rsa",
        "id_ed25519",
        "secrets/token.txt",
    ]
    for p in sensitive_examples:
        assert is_sensitive_path(p) is True, f"Failed to identify sensitive path: {p}"

    safe_examples = [
        "app/api/users.py",
        "tests/test_auth.py",
        "README.md",
        "package.json",
        "config.py",
    ]
    for p in safe_examples:
        assert is_sensitive_path(p) is False, f"Falsely identified as sensitive: {p}"


def test_scanner_excludes_sensitive_files_and_symlink_escapes(tmp_path):
    """Verify scanner ignores .env, keys, and symlinks pointing outside workspace."""
    workspace = tmp_path / "workspace"
    workspace.mkdir()
    outside = tmp_path / "outside_secret.txt"
    outside.write_text("SUPER_SECRET_EXTERNAL_KEY\n", encoding="utf-8")

    # Regular file
    (workspace / "main.py").write_text("print('hello')\n", encoding="utf-8")
    # Sensitive file
    (workspace / ".env").write_text("API_KEY=12345\n", encoding="utf-8")
    (workspace / "private.key").write_text("PRIVATE_KEY\n", encoding="utf-8")
    # Symlink escape
    (workspace / "escape_link.py").symlink_to(outside)

    scanned = scan_workspace(str(workspace))
    scanned_paths = [f.rel_path for f in scanned]

    assert "main.py" in scanned_paths
    assert ".env" not in scanned_paths
    assert "private.key" not in scanned_paths
    assert "escape_link.py" not in scanned_paths


def test_get_relevant_context_filters_sensitive_files(test_db, tmp_path, monkeypatch):
    """Verify get_relevant_context never returns .env or secret files even if indexed."""
    workspace = tmp_path / "workspace"
    workspace.mkdir()
    (workspace / "app.py").write_text("def run(): pass\n", encoding="utf-8")
    (workspace / ".env").write_text("DATABASE_PASSWORD=secret\n", encoding="utf-8")

    test_db.add_all([
        Repository(id="mcp-test-sec", name="MCP Sec", workspace_path=str(workspace), status="ready"),
        IndexedFile(id="file-app", repository_id="mcp-test-sec", path="app.py"),
        IndexedFile(id="file-env", repository_id="mcp-test-sec", path=".env"),
        IndexedSymbol(id="sym-app", repository_id="mcp-test-sec", file_id="file-app", name="run", symbol_type="function", line_start=1),
        IndexedSymbol(id="sym-env", repository_id="mcp-test-sec", file_id="file-env", name="DATABASE_PASSWORD", symbol_type="config", line_start=1),
    ])
    test_db.commit()
    monkeypatch.setattr(mcp_server, "SessionLocal", lambda: test_db)

    res = json.loads(mcp_server.get_relevant_context("mcp-test-sec", "DATABASE_PASSWORD", limit=5))
    returned_paths = [item["file_path"] for item in res["context_items"]]

    assert ".env" not in returned_paths
    assert "secret" not in json.dumps(res)


def test_get_relevant_context_redacts_credentials_in_source_preview(test_db, tmp_path, monkeypatch):
    """Verify credentials in source code previews are redacted."""
    workspace = tmp_path / "workspace"
    workspace.mkdir()
    code = (
        "def connect():\n"
        "    api_key = 'AKIAIOSFODNN7EXAMPLE'\n"
        "    gh_token = 'ghp_123456789012345678901234567890123456'\n"
        "    return True\n"
    )
    (workspace / "connect.py").write_text(code, encoding="utf-8")

    test_db.add_all([
        Repository(id="mcp-redact-repo", name="MCP Redact", workspace_path=str(workspace), status="ready"),
        IndexedFile(id="file-conn", repository_id="mcp-redact-repo", path="connect.py"),
        IndexedSymbol(id="sym-conn", repository_id="mcp-redact-repo", file_id="file-conn", name="connect", symbol_type="function", line_start=1),
    ])
    test_db.commit()
    monkeypatch.setattr(mcp_server, "SessionLocal", lambda: test_db)

    res = json.loads(mcp_server.get_relevant_context("mcp-redact-repo", "connect", limit=5))
    preview = res["context_items"][0]["content_preview"]

    assert "AKIAIOSFODNN7EXAMPLE" not in preview
    assert "ghp_123456789012345678901234567890123456" not in preview
    assert "[REDACTED_SECRET]" in preview


def test_analyze_change_fails_closed_in_production(test_db, monkeypatch):
    """Verify analyze_change rejects nonexistent or unready repository in production."""
    monkeypatch.setattr(mcp_server, "SessionLocal", lambda: test_db)
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    monkeypatch.setattr(settings, "META_AI_PROVIDER", "meta_model_api")
    monkeypatch.setattr(settings, "AI_PROVIDER_PROFILE", "meta_only")

    res = json.loads(mcp_server.analyze_change("any-repo", "Valid requirement"))
    assert res["status"] == "error"
    assert "not found" in res["message"].lower() or "requires authenticated production access" in res["message"].lower()


def test_mcp_error_handling_masks_internal_details(test_db, monkeypatch):
    """Verify error messages returned to agents do not contain internal exception stacktraces."""
    monkeypatch.setattr(mcp_server, "SessionLocal", lambda: 1 / 0)

    res_a = json.loads(mcp_server.analyze_change("valid-id", "some requirement"))
    assert res_a["status"] == "error"
    assert "ZeroDivisionError" not in res_a["message"]
    assert "An error occurred" in res_a["message"]

    res_b = json.loads(mcp_server.get_relevant_context("valid-id", "query"))
    assert res_b["status"] == "error"
    assert "ZeroDivisionError" not in res_b["message"]
    assert "An error occurred" in res_b["message"]

    res_c = json.loads(mcp_server.suggest_tests("valid-id", "req"))
    assert res_c["status"] == "error"
    assert "ZeroDivisionError" not in res_c["message"]
    assert "An error occurred" in res_c["message"]
