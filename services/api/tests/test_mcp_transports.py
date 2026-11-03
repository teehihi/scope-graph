from contextlib import asynccontextmanager

from fastapi.testclient import TestClient
from starlette.applications import Starlette
from starlette.routing import Mount

from app.main import _mcp_session_manager, _mcp_transport_app


@asynccontextmanager
async def _mcp_lifespan(app):
    async with _mcp_session_manager.run():
        yield


def test_streamable_http_mcp_endpoint_initializes_and_lists_scopegraph_tools():
    test_app = Starlette(
        routes=[Mount("/mcp", app=_mcp_transport_app)],
        lifespan=_mcp_lifespan,
    )
    headers = {"Accept": "application/json, text/event-stream"}
    with TestClient(test_app, base_url="https://scopegraph-api.onrender.com") as client:
        initialized = client.post(
            "/mcp/",
            headers=headers,
            json={
                "jsonrpc": "2.0",
                "id": 1,
                "method": "initialize",
                "params": {
                    "protocolVersion": "2025-06-18",
                    "capabilities": {},
                    "clientInfo": {"name": "test-client", "version": "1"},
                },
            },
        )
        assert initialized.status_code == 200
        session_id = initialized.headers["mcp-session-id"]
        session_headers = {
            **headers,
            "MCP-Session-Id": session_id,
            "MCP-Protocol-Version": "2025-06-18",
        }
        client.post(
            "/mcp/",
            headers=session_headers,
            json={"jsonrpc": "2.0", "method": "notifications/initialized"},
        )
        tools = client.post(
            "/mcp/",
            headers=session_headers,
            json={"jsonrpc": "2.0", "id": 2, "method": "tools/list", "params": {}},
        )

    assert tools.status_code == 200
    assert "analyze_change" in tools.text
    assert "get_relevant_context" in tools.text
    assert "suggest_tests" in tools.text
