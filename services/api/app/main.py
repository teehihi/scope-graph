import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.logging import setup_logging
from app.db.database import init_db
from app.api.routes import health, repositories, analysis, auth

logger = setup_logging(settings.LOG_LEVEL)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting ScopeGraph API server (env=%s, port=%s)...", settings.ENVIRONMENT, settings.PORT)
    os.makedirs(settings.WORKSPACE_DIR, exist_ok=True)
    init_db()
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

# Include routes
app.include_router(health.router)
app.include_router(auth.router, prefix="/api/v1")
app.include_router(repositories.router, prefix="/api/v1")
app.include_router(analysis.router, prefix="/api/v1")

@app.get("/")
def root():
    return {
        "name": "ScopeGraph API",
        "tagline": "Understand the impact before you change the code.",
        "docs_url": "/docs",
        "health_url": "/health",
    }
