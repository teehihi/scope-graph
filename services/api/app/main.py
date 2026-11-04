import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.applications import Starlette
from app.core.config import settings
from app.core.request_limits import ScreenshotRequestBodyLimit
from app.core.logging import setup_logging
from app.db.database import init_db
from app.api.routes import health, repositories, analysis, auth, voice, billing, assistant, ui_proposals
from app.mcp.server import mcp
from mcp.server.transport_security import TransportSecuritySettings

logger = setup_logging(settings.LOG_LEVEL)

_mcp_transport_security = TransportSecuritySettings(
    allowed_hosts=[
        "scopegraph-api.onrender.com",
        "scopegraph.vercel.app",
        "www.scopegraph.top",
        "scopegraph.top",
        "localhost",
        "127.0.0.1",
    ],
    allowed_origins=[
        "https://scopegraph.vercel.app",
        "https://www.scopegraph.top",
        "https://scopegraph.top",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
)
_mcp_http_app = mcp.streamable_http_app(
    streamable_http_path="/",
    transport_security=_mcp_transport_security,
)
_mcp_sse_app = mcp.sse_app(transport_security=_mcp_transport_security)
_mcp_session_manager = mcp.session_manager
_mcp_transport_app = Starlette(routes=[*_mcp_http_app.routes, *_mcp_sse_app.routes])

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting ScopeGraph API server (env=%s, port=%s)...", settings.ENVIRONMENT, settings.PORT)
    os.makedirs(settings.WORKSPACE_DIR, exist_ok=True)
    init_db()

    # Auto-seed sample repository if database is fresh
    try:
        from app.db.database import SessionLocal
        from app.db.models import Repository
        from app.api.routes.repositories import load_sample_repository
        db = SessionLocal()
        try:
            if db.query(Repository).count() == 0:
                logger.info("Fresh database detected — auto-seeding sample repository...")
                load_sample_repository(db)
                logger.info("Sample repository auto-seeded successfully!")
        finally:
            db.close()
    except Exception as e:
        logger.warning("Could not auto-seed sample repository: %s", e)

    async with _mcp_session_manager.run():
        yield
    logger.info("Shutting down ScopeGraph API server...")

app = FastAPI(
    title="ScopeGraph API",
    description="AI-powered code impact analysis and context retrieval platform for developers and AI coding agents.",
    version="1.0.0",
    lifespan=lifespan,
)

# Enable CORS for frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(ScreenshotRequestBodyLimit)

# Include routes
app.include_router(health.router)
app.include_router(health.router, prefix="/api/v1")
app.include_router(auth.router, prefix="/api/v1")
app.include_router(repositories.router, prefix="/api/v1")
app.include_router(analysis.router, prefix="/api/v1")
app.include_router(voice.router, prefix="/api/v1")
app.include_router(billing.router, prefix="/api/v1")
app.include_router(assistant.router, prefix="/api/v1")
app.include_router(ui_proposals.router, prefix="/api/v1")

# Expose Streamable HTTP at /mcp/ and retain SSE compatibility at /mcp/sse.
app.mount("/mcp", _mcp_transport_app)

@app.api_route("/", methods=["GET", "HEAD"])
def root():
    return {
        "name": "ScopeGraph API",
        "tagline": "Understand the impact before you change the code.",
        "docs_url": "/docs",
        "health_url": "/health",
    }
