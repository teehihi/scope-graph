import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

def _find_env_file() -> tuple[str, ...]:
    candidates = [
        Path.cwd() / ".env",
        Path("/app/.env"),
        Path(__file__).resolve().parent / ".env",
        Path(__file__).resolve().parents[1] / ".env" if len(Path(__file__).resolve().parents) > 1 else None,
        Path(__file__).resolve().parents[2] / ".env" if len(Path(__file__).resolve().parents) > 2 else None,
        Path(__file__).resolve().parents[3] / ".env" if len(Path(__file__).resolve().parents) > 3 else None,
    ]
    existing = [str(p) for p in candidates if p and p.exists()]
    return tuple(existing) if existing else (".env",)

class Settings(BaseSettings):
    ENVIRONMENT: str = Field(default="development", description="Runtime environment")
    LOG_LEVEL: str = Field(default="INFO", description="Log level")
    PORT: int = Field(default=8000, description="API port")
    HOST: str = Field(default="0.0.0.0", description="API host")

    # PostgreSQL
    DATABASE_URL: str = Field(
        default="sqlite:///./data/scopegraph.db",
        description="Database connection URL. Defaults to local SQLite for zero-friction standalone dev, supports PostgreSQL"
    )

    # Redis
    REDIS_URL: str = Field(
        default="redis://localhost:6379/0",
        description="Redis URL for task queue and caching"
    )
    REDIS_ENABLED: bool = Field(default=True, description="Enable Redis queue/cache if reachable")

    # Storage and Limits
    WORKSPACE_DIR: str = Field(default="./data/workspaces", description="Root directory for uploaded repositories")
    MAX_UPLOAD_SIZE_MB: int = Field(default=25, description="Max upload archive size in MB")
    MAX_EXTRACTED_SIZE_MB: int = Field(default=100, description="Max extracted size in MB")
    MAX_FILE_COUNT: int = Field(default=500, description="Max files to scan")
    MAX_FILE_SIZE_KB: int = Field(default=500, description="Max individual file size to read in KB")
    MAX_SCREENSHOT_BYTES: int = Field(default=5_000_000, ge=1, description="Maximum screenshot payload bytes")
    MAX_SCREENSHOT_DIMENSION: int = Field(default=4096, ge=1, description="Maximum screenshot width or height")
    MAX_SCREENSHOT_PIXELS: int = Field(default=8_000_000, ge=1, description="Maximum screenshot pixel count")

    # AI context retrieval
    AI_RETRIEVAL_TOP_K: int = Field(default=8, ge=1, le=100, description="Maximum files sent to impact reasoning")
    AI_CONTEXT_TOKEN_BUDGET: int = Field(default=3000, ge=1, description="Approximate context token budget")

    # Meta AI / Inference Provider
    # Options: meta_model_api, fireworks, baseten, modal, together, groq, generic_openai_compat, offline_demo
    META_AI_PROVIDER: str = Field(default="offline_demo", description="Active AI inference provider")
    META_AI_API_KEY: str = Field(default="", description="API key for Meta AI or inference partner")
    META_AI_BASE_URL: str = Field(default="https://api.meta.ai/v1", description="Inference base URL")
    META_AI_MODEL: str = Field(default="muse-spark-1.3", description="Exact model name or ID")
    META_AI_TEMPERATURE: float = Field(default=0.1, description="Sampling temperature")
    META_AI_MAX_TOKENS: int = Field(default=6000, description="Max completion tokens")
    META_AI_MAX_RETRIES: int = Field(default=2, ge=0, le=5, description="Retries after transient inference failures")
    META_AI_RETRY_BACKOFF_SECONDS: float = Field(default=0.5, ge=0, le=10, description="Initial retry delay")

    # GitHub OAuth
    GITHUB_CLIENT_ID: str = Field(default="", description="GitHub OAuth Client ID")
    GITHUB_CLIENT_SECRET: str = Field(default="", description="GitHub OAuth Client Secret")
    GITHUB_REDIRECT_URI: str = Field(
        default="http://localhost:3000/auth/callback/github",
        description="GitHub OAuth callback URL"
    )

    model_config = SettingsConfigDict(
        env_file=_find_env_file(),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
