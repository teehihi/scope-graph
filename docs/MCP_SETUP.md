# ScopeGraph MCP Server Setup Guide

ScopeGraph implements the official Model Context Protocol (MCP), enabling external coding agents (such as Claude Code, Cursor, Codex, and Windsurf) to query repository structure, analyze changes, and retrieve grounded context before editing code.

## 1. Available Tools

### `analyze_change`
Runs semantic impact analysis against an indexed repository.
- **Inputs**: `repository_id` (string), `requirement` (string)
- **Outputs**: Affected files (direct vs indirect), regression risks, suggested tests, and complete implementation brief.

### `get_relevant_context`
Retrieves prioritized files, symbols, and code previews for a given task.
- **Inputs**: `repository_id` (string), `query` (string), `limit` (int, default 5)
- **Outputs**: Top relevant source files with line-level symbol summaries and previews.

### `suggest_tests`
Identifies real existing tests from the repository and proposes new unit/integration tests for the requirement.
- **Inputs**: `repository_id` (string), `requirement` (string)
- **Outputs**: List of existing repository tests and recommended tests to implement.

---

## 2. Configuration Examples

### Claude Desktop (`claude_desktop_config.json`)
```json
{
  "mcpServers": {
    "scopegraph": {
      "command": "/Users/tee/UTE/ScopeGraph/.venv/bin/python",
      "args": [
        "-m",
        "app.mcp.server"
      ],
      "cwd": "/Users/tee/UTE/ScopeGraph/services/api",
      "env": {
        "PYTHONPATH": "/Users/tee/UTE/ScopeGraph/services/api",
        "DATABASE_URL": "sqlite:////Users/tee/UTE/ScopeGraph/data/scopegraph.db"
      }
    }
  }
}
```

### Claude Code CLI
```bash
claude mcp add scopegraph -- /Users/tee/UTE/ScopeGraph/.venv/bin/python -m app.mcp.server
```

### Cursor IDE (`.cursor/mcp.json`)
```json
{
  "mcpServers": {
    "scopegraph": {
      "command": "/Users/tee/UTE/ScopeGraph/.venv/bin/python",
      "args": ["-m", "app.mcp.server"],
      "cwd": "/Users/tee/UTE/ScopeGraph/services/api",
      "env": {
        "PYTHONPATH": "/Users/tee/UTE/ScopeGraph/services/api"
      }
    }
  }
}
```

---

## 3. Testing the MCP Server Directly

Run the MCP server manually:
```bash
source .venv/bin/activate
cd services/api
python -m app.mcp.server
```
