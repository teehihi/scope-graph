import json
import logging
import asyncio
from pathlib import Path
from typing import Any
try:
    from mcp.server.mcpserver import MCPServer
except ImportError:
    from mcp.server.fastmcp import FastMCP as MCPServer

from app.db.database import SessionLocal
from app.db.models import Repository, IndexedFile, IndexedSymbol
from app.analysis.orchestrator import AnalysisOrchestrator
from app.graph.engine import GraphEngine
from app.evidence.validator import _is_safe_relative_path

logger = logging.getLogger("scopegraph.mcp")

# Create standard MCP server instance
mcp = MCPServer("scopegraph")

@mcp.tool()
def analyze_change(repository_id: str, requirement: str) -> str:
    """
    Analyzes the impact of a proposed code requirement or feature request
    against an indexed repository. Returns affected files, direct vs indirect
    impact, risks, suggested tests, and evidence-grounded reasoning.
    """
    db = SessionLocal()
    try:
        repo = db.query(Repository).filter(Repository.id == repository_id).first()
        if not repo:
            return json.dumps({
                "status": "error",
                "message": f"Repository '{repository_id}' not found. Please index the repository first."
            })
        if repo.status != "ready":
            return json.dumps({
                "status": "error",
                "message": f"Repository '{repository_id}' is not ready (status: {repo.status})."
            })

        orchestrator = AnalysisOrchestrator(db)
        run = orchestrator.run_analysis(repository_id=repository_id, requirement=requirement)
        return json.dumps({
            "status": run.status,
            "analysis_id": run.id,
            "result": run.result_json,
            "brief": run.brief_markdown,
        }, indent=2)
    except Exception as e:
        logger.exception("Error in analyze_change MCP tool")
        return json.dumps({"status": "error", "message": str(e)})
    finally:
        db.close()

@mcp.tool()
def get_relevant_context(repository_id: str, query: str, limit: int = 5) -> str:
    """
    Retrieves the most relevant repository files, symbols, and source code context
    for an AI coding agent to inspect before writing code.
    """
    db = SessionLocal()
    try:
        repo = db.query(Repository).filter(Repository.id == repository_id).first()
        if not repo:
            return json.dumps({"status": "error", "message": f"Repository '{repository_id}' not found"})

        keywords = [k.lower() for k in query.split() if len(k) > 2]
        root = Path(repo.workspace_path).resolve() if repo.workspace_path else None
        files = [
            file for file in db.query(IndexedFile).filter(IndexedFile.repository_id == repository_id).all()
            if root and _is_safe_relative_path(file.path.replace("\\", "/"))
            and (root / file.path).resolve().is_relative_to(root)
        ]
        symbols = db.query(IndexedSymbol).filter(IndexedSymbol.repository_id == repository_id).all()

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
        top_files = scored_files[:max(0, limit)]

        context_items = []
        for score, f, f_syms in top_files:
            # Read snippet if file exists
            abs_path = (root / f.path).resolve()
            content_preview = ""
            if abs_path.is_file():
                try:
                    with abs_path.open("r", encoding="utf-8", errors="replace") as fp:
                        content_preview = "".join(fp.readlines()[:40])
                except Exception:
                    pass

            context_items.append({
                "file_path": f.path,
                "language": f.language,
                "relevance_score": score,
                "symbols": [{"name": s.name, "type": s.symbol_type, "line": s.line_start} for s in f_syms],
                "content_preview": content_preview,
            })

        return json.dumps({
            "repository_id": repository_id,
            "query": query,
            "context_items": context_items,
        }, indent=2)
    except Exception as e:
        logger.exception("Error in get_relevant_context MCP tool")
        return json.dumps({"status": "error", "message": str(e)})
    finally:
        db.close()

@mcp.tool()
def suggest_tests(repository_id: str, requirement: str) -> str:
    """
    Identifies real existing tests from the indexed repository and suggests
    new tests required to validate the proposed requirement.
    """
    db = SessionLocal()
    try:
        repo = db.query(Repository).filter(Repository.id == repository_id).first()
        if not repo:
            return json.dumps({"status": "error", "message": f"Repository '{repository_id}' not found"})

        # 1. Retrieve all indexed tests from the codebase
        test_symbols = db.query(IndexedSymbol).filter(
            IndexedSymbol.repository_id == repository_id,
            IndexedSymbol.symbol_type == "test"
        ).all()

        files_map = {f.id: f.path for f in db.query(IndexedFile).filter(IndexedFile.repository_id == repository_id).all()}

        existing_tests = []
        for t in test_symbols:
            f_path = files_map.get(t.file_id, "unknown")
            existing_tests.append({
                "test_name": t.name,
                "file_path": f_path,
                "line_start": t.line_start,
                "docstring": t.docstring,
            })

        # 2. Derive recommended tests based on the requirement
        req_lower = requirement.lower()
        proposed_tests = [
            f"Test happy path for: '{requirement}'",
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
            "repository_id": repository_id,
            "requirement": requirement,
            "existing_tests_in_repo": existing_tests,
            "proposed_tests_to_add": proposed_tests,
        }, indent=2)
    except Exception as e:
        logger.exception("Error in suggest_tests MCP tool")
        return json.dumps({"status": "error", "message": str(e)})
    finally:
        db.close()

def main():
    if hasattr(mcp, "run"):
        mcp.run()
    else:
        asyncio.run(mcp.run_stdio_async())

if __name__ == "__main__":
    main()
