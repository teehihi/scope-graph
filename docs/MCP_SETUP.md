# ScopeGraph MCP Server Setup

ScopeGraph exposes three Model Context Protocol tools: `analyze_change`, `get_relevant_context`, and `suggest_tests`.

## Remote setup (Windows and macOS)

The hosted endpoint is `https://www.scopegraph.top/mcp/` and uses Streamable HTTP. The legacy SSE endpoint remains available at `https://www.scopegraph.top/mcp/sse` for clients that only support SSE. Both endpoints are routed through the ScopeGraph API service.

### Cursor

Create or edit `.cursor/mcp.json` in the project root (or `~/.cursor/mcp.json` for a global configuration):

```json
{
  "mcpServers": {
    "scopegraph": {
      "url": "https://www.scopegraph.top/mcp/"
    }
  }
}
```

Save the file, restart Cursor, then open the MCP list and confirm the ScopeGraph tools are enabled.

### Antigravity IDE / App

Do not search the MCP Store for ScopeGraph. The Store lists published entries; this server is added as a custom MCP server.

1. Open **Settings -> Customizations -> Installed MCP Servers**.
2. Choose **Open MCP Config** or **View raw config**.
3. Add this entry under `mcpServers`, save, then reload Antigravity:

```json
{
  "mcpServers": {
    "scopegraph": {
      "serverUrl": "https://www.scopegraph.top/mcp/"
    }
  }
}
```

Antigravity requires Streamable HTTP for remote servers; the `/mcp/sse` endpoint is not compatible with it.

### Claude Desktop remote connector

Remote servers are added in **Settings -> Connectors -> Add custom connector**. Paste `https://www.scopegraph.top/mcp/` as the connector URL and add it. Remote connectors are not configured in `claude_desktop_config.json`.

## Local setup (Windows and macOS)

Use local mode only when the repository is indexed in the local database on the same computer. Local mode does not read repositories stored in ScopeGraph Cloud.

Requirements: Git and Python 3.13 or newer. Clone this repository, then run the commands from its root directory.

### macOS

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r services/api/requirements.txt
cd services/api
../../.venv/bin/alembic -c alembic.ini upgrade head
```

### Windows PowerShell

```powershell
py -3.13 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r services/api/requirements.txt
Push-Location services/api
..\..\.venv\Scripts\alembic.exe -c alembic.ini upgrade head
Pop-Location
```

In ScopeGraph **Settings -> MCP Setup -> Local CLI**, select Windows or macOS and paste the absolute path to the cloned repository root. The displayed `stdio` configuration uses that path to locate the Python virtual environment and API package. Copy it into the selected client’s MCP configuration, save, and restart/reload the client.

Client configuration locations:

- Cursor: `.cursor/mcp.json` or `~/.cursor/mcp.json`
- Antigravity: Settings -> Customizations -> Installed MCP Servers -> Open MCP Config
- Claude Desktop local server: Settings -> Developer -> Edit Config

## Verify the connection

After reconnecting, confirm the server is enabled and the three tools appear in the client’s MCP tool list. To call a tool, use the `repository_id` shown by the ScopeGraph repository view. `get_relevant_context` is read-only; `analyze_change` runs an impact analysis and consumes the configured AI quota.
