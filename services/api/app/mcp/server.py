import json
import logging
import asyncio
import re
from pathlib import Path
from typing import Any
from pydantic import Field

try:
    from mcp.server.mcpserver import MCPServer
    from mcp.types import ToolAnnotations
except ImportError:
    from mcp.server.fastmcp import FastMCP as MCPServer
    ToolAnnotations = None

from app.db.database import SessionLocal
from app.db.models import Repository, IndexedFile, IndexedSymbol
from app.analysis.orchestrator import AnalysisOrchestrator
from app.graph.engine import GraphEngine
from app.evidence.validator import _is_safe_relative_path
from app.indexing.scanner import is_sensitive_path
from app.billing.entitlements import enforce_ai_limit

logger = logging.getLogger("scopegraph.mcp")

# Create standard MCP server instance
mcp = MCPServer("scopegraph")

# Regex patterns for redacting credentials and secrets in source snippets
_SENSITIVE_SNIPPET_PATTERNS = [
    re.compile(r'(?i)\b(AKIA[0-9A-Z]{16})\b'),
    re.compile(r'(?i)\b(ghp_[0-9a-zA-Z]{36}|github_pat_[0-9a-zA-Z_]{82})\b'),
    re.compile(r'(?i)\b(bearer\s+[a-zA-Z0-9_\-\.]{20,})\b'),
    re.compile(r'(?i)\b(AIza[0-9A-Za-z\-_]{35})\b'),
    re.compile(r'-----BEGIN [A-Z ]+ PRIVATE KEY-----'),
    re.compile(r'(?i)\b(password|secret|api_key|access_token|private_key)\b\s*[:=]\s*[\'\"][^\'\"]+[\'\"]'),
]

def _sanitize_source_preview(raw_text: str) -> str:
    """Redacts suspected sensitive tokens and credentials from preview text."""
    sanitized = raw_text
    for pattern in _SENSITIVE_SNIPPET_PATTERNS:
        sanitized = pattern.sub("[REDACTED_SECRET]", sanitized)
    return sanitized

def _validate_repo_id(repository_id: str) -> str | None:
    """Basic validation for repository identifier format."""
    cleaned = (repository_id or "").strip()
    if not cleaned or len(cleaned) > 128:
        return None
    if not re.match(r"^[a-zA-Z0-9_\-\.]+$", cleaned):
        return None
    return cleaned

# Explicit Tool Annotations matching actual implementation behavior:
# Tool A: analyze_change -> Writes AnalysisRun to DB, calls external AI model, non-idempotent
_ANALYZE_CHANGE_ANNOTATIONS = ToolAnnotations(
    read_only_hint=False,
    destructive_hint=False,
    idempotent_hint=False,
    open_world_hint=True,
) if ToolAnnotations else None

# Tool B: get_relevant_context -> Read-only DB queries and filesystem reading, idempotent, local repository only
_GET_RELEVANT_CONTEXT_ANNOTATIONS = ToolAnnotations(
    read_only_hint=True,
    destructive_hint=False,
    idempotent_hint=True,
    open_world_hint=False,
) if ToolAnnotations else None

# Tool C: suggest_tests -> Read-only DB queries, deterministic derivation, idempotent, local only
_SUGGEST_TESTS_ANNOTATIONS = ToolAnnotations(
    read_only_hint=True,
    destructive_hint=False,
    idempotent_hint=True,
    open_world_hint=False,
) if ToolAnnotations else None


@mcp.tool(
    name="analyze_change",
    description="Analyzes the impact of a proposed code requirement or feature request against an indexed repository. Returns affected files, direct vs indirect impact, risks, suggested tests, and evidence-grounded reasoning.",
    annotations=_ANALYZE_CHANGE_ANNOTATIONS,
)
def analyze_change(
    repository_id: str = Field(..., description="Identifier of the indexed repository", max_length=128),
    requirement: str = Field(..., description="Proposed change description or feature requirement", min_length=1, max_length=4000),
) -> str:
    """
    Analyzes the impact of a proposed code requirement or feature request
    against an indexed repository. Returns affected files, direct vs indirect
    impact, risks, suggested tests, and evidence-grounded reasoning.
    """
    valid_id = _validate_repo_id(repository_id)
    if not valid_id:
        return json.dumps({
            "status": "error",
            "message": "Invalid repository_id format. Must be alphanumeric, dashes, underscores, or dots (max 128 chars)."
        })

    req_text = (requirement or "").strip()
    if not req_text:
        return json.dumps({
            "status": "error",
            "message": "Requirement cannot be empty."
        })
    if len(req_text) > 4000:
        return json.dumps({
            "status": "error",
            "message": "Requirement exceeds maximum allowed length of 4000 characters."
        })

    db = None
    try:
        db = SessionLocal()
        repo = db.query(Repository).filter(Repository.id == valid_id).first()
        if not repo:
            return json.dumps({
                "status": "error",
                "message": f"Repository '{valid_id}' not found. Please index the repository first."
            })
        if repo.status != "ready":
            return json.dumps({
                "status": "error",
                "message": f"Repository '{valid_id}' is not ready (status: {repo.status})."
            })

        enforce_ai_limit(db, repo)

        orchestrator = AnalysisOrchestrator(db)
        run = orchestrator.run_analysis(repository_id=valid_id, requirement=req_text)
        return json.dumps({
            "status": run.status,
            "analysis_id": run.id,
            "result": run.result_json,
            "brief": run.brief_markdown,
        }, indent=2)
    except Exception as e:
        logger.exception("Error in analyze_change MCP tool")
        return json.dumps({"status": "error", "message": "An error occurred during impact analysis."})
    finally:
        if db is not None:
            db.close()


@mcp.tool(
    name="get_relevant_context",
    description="Retrieves the most relevant repository files, symbols, and source code context for an AI coding agent to inspect before writing code.",
    annotations=_GET_RELEVANT_CONTEXT_ANNOTATIONS,
)
def get_relevant_context(
    repository_id: str = Field(..., description="Identifier of the indexed repository", max_length=128),
    query: str = Field(..., description="Query or code concept to search for in repository context", min_length=1, max_length=1000),
    limit: int = Field(default=5, description="Maximum number of context files to retrieve (1-20)", ge=1, le=20),
) -> str:
    """
    Retrieves the most relevant repository files, symbols, and source code context
    for an AI coding agent to inspect before writing code.
    """
    valid_id = _validate_repo_id(repository_id)
    if not valid_id:
        return json.dumps({
            "status": "error",
            "message": "Invalid repository_id format."
        })

    actual_limit = limit.default if hasattr(limit, "default") and not isinstance(limit, int) else limit
    safe_limit = max(1, min(actual_limit if isinstance(actual_limit, int) else 5, 20))
    query_text = (query or "").strip()
    if not query_text:
        return json.dumps({"repository_id": valid_id, "query": "", "context_items": []})

    db = None
    try:
        db = SessionLocal()
        repo = db.query(Repository).filter(Repository.id == valid_id).first()
        if not repo:
            return json.dumps({"status": "error", "message": f"Repository '{valid_id}' not found"})

        keywords = [k.lower() for k in query_text.split() if len(k) > 2]
        root = Path(repo.workspace_path).resolve() if repo.workspace_path else None
        if not root or not root.is_dir():
            return json.dumps({"repository_id": valid_id, "query": query_text, "context_items": []})

        # Filter out unsafe paths, symlink escapes, and sensitive files
        files = []
        for file in db.query(IndexedFile).filter(IndexedFile.repository_id == valid_id).all():
            norm_path = file.path.replace("\\", "/")
            if not _is_safe_relative_path(norm_path):
                continue
            if is_sensitive_path(norm_path):
                continue
            try:
                candidate_abs = (root / file.path).resolve()
                if not candidate_abs.is_relative_to(root):
                    continue
            except (ValueError, OSError):
                continue
            files.append(file)

        symbols = db.query(IndexedSymbol).filter(IndexedSymbol.repository_id == valid_id).all()

        symbols_by_file: dict[str, list[IndexedSymbol]] = {}
        for s in symbols:
            symbols_by_file.setdefault(s.file_id, []).append(s)

        scored_files = []
        for f in files:
            f_syms = symbols_by_file.get(f.id, [])
            score = 0
            for kw in keywords:
                if kw in f.path.lower():
                    score += 5
                for s in f_syms:
                    if kw in s.name.lower():
                        score += 3

            if score > 0:
                scored_files.append((score, f, f_syms))

        scored_files.sort(key=lambda x: x[0], reverse=True)
        top_files = scored_files[:safe_limit]

        context_items = []
        for score, f, f_syms in top_files:
            abs_path = (root / f.path).resolve()
            content_preview = ""
            # Ensure path is strictly within workspace root and not a symlink to outside
            if abs_path.is_file() and abs_path.is_relative_to(root):
                try:
                    with abs_path.open("r", encoding="utf-8", errors="replace") as fp:
                        raw_preview = "".join(fp.readlines()[:40])
                        content_preview = _sanitize_source_preview(raw_preview)
                except Exception:
                    content_preview = ""

            context_items.append({
                "file_path": f.path,
                "language": f.language,
                "relevance_score": score,
                "symbols": [{"name": s.name, "type": s.symbol_type, "line": s.line_start} for s in f_syms],
                "content_preview": content_preview,
            })

        return json.dumps({
            "repository_id": valid_id,
            "query": query_text,
            "context_items": context_items,
        }, indent=2)
    except Exception as e:
        logger.exception("Error in get_relevant_context MCP tool")
        return json.dumps({"status": "error", "message": "An error occurred retrieving context."})
    finally:
        if db is not None:
            db.close()


@mcp.tool(
    name="suggest_tests",
    description="Identifies real existing tests from the indexed repository and suggests new tests required to validate the proposed requirement.",
    annotations=_SUGGEST_TESTS_ANNOTATIONS,
)
def suggest_tests(
    repository_id: str = Field(..., description="Identifier of the indexed repository", max_length=128),
    requirement: str = Field(..., description="Proposed change description or feature requirement", min_length=1, max_length=4000),
) -> str:
    """
    Identifies real existing tests from the indexed repository and suggests
    new tests required to validate the proposed requirement.
    """
    valid_id = _validate_repo_id(repository_id)
    if not valid_id:
        return json.dumps({
            "status": "error",
            "message": "Invalid repository_id format."
        })

    req_text = (requirement or "").strip()
    if not req_text:
        return json.dumps({
            "status": "error",
            "message": "Requirement cannot be empty."
        })
    if len(req_text) > 4000:
        return json.dumps({
            "status": "error",
            "message": "Requirement exceeds maximum allowed length of 4000 characters."
        })

    db = None
    try:
        db = SessionLocal()
        repo = db.query(Repository).filter(Repository.id == valid_id).first()
        if not repo:
            return json.dumps({"status": "error", "message": f"Repository '{valid_id}' not found"})

        # 1. Retrieve all indexed tests from the codebase
        test_symbols = db.query(IndexedSymbol).filter(
            IndexedSymbol.repository_id == valid_id,
            IndexedSymbol.symbol_type == "test"
        ).all()

        files_map = {
            f.id: f.path
            for f in db.query(IndexedFile).filter(IndexedFile.repository_id == valid_id).all()
            if not is_sensitive_path(f.path)
        }

        existing_tests = []
        for t in test_symbols:
            f_path = files_map.get(t.file_id)
            if not f_path:
                continue
            existing_tests.append({
                "test_name": t.name,
                "file_path": f_path,
                "line_start": t.line_start,
                "docstring": t.docstring,
            })

        # 2. Derive recommended tests based on the requirement
        req_lower = req_text.lower()
        proposed_tests = [
            f"Test happy path for: '{req_text[:120]}'",
            "Test authorization gate: unauthenticated access fails with 401",
            "Test input validation: malformed parameters reject with 422",
        ]
        if "email" in req_lower or "verification" in req_lower:
            proposed_tests.extend([
                "Test verification token generation and expiration handling",
                "Test replay protection: confirming an already-used token returns 400",
                "Test state persistence: profile remains unmutated until verification succeeds",
            ])

        return json.dumps({
            "repository_id": valid_id,
            "requirement": req_text,
            "existing_tests_in_repo": existing_tests,
            "proposed_tests_to_add": proposed_tests,
        }, indent=2)
    except Exception as e:
        logger.exception("Error in suggest_tests MCP tool")
        return json.dumps({"status": "error", "message": "An error occurred deriving test suggestions."})
    finally:
        if db is not None:
            db.close()


def main():
    if hasattr(mcp, "run"):
        mcp.run()
    else:
        asyncio.run(mcp.run_stdio_async())

if __name__ == "__main__":
    main()
