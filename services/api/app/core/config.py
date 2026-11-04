import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

def _find_env_file() -> tuple[str, ...]:
    candidates = [
        Path.cwd() / ".env",
        Path(__file__).resolve().parent / ".env",
        Path(__file__).resolve().parents[1] / ".env" if len(Path(__file__).resolve().parents) > 1 else None,
        Path(__file__).resolve().parents[2] / ".env" if len(Path(__file__).resolve().parents) > 2 else None,
        Path(__file__).resolve().parents[3] / ".env" if len(Path(__file__).resolve().parents) > 3 else None,
        Path(__file__).resolve().parents[4] / ".env" if len(Path(__file__).resolve().parents) > 4 else None,
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
    DATABASE_URL_UNPOOLED: str | None = Field(
        default=None,
        description="Unpooled database connection URL (recommended by Neon for schema migrations/DDL)"
    )

    # Redis
    REDIS_URL: str = Field(
        default="redis://localhost:6379/0",
        description="Redis URL for task queue and caching"
    )
    REDIS_ENABLED: bool = Field(default=True, description="Enable Redis queue/cache if reachable")

    # Stripe Billing
    STRIPE_PUBLISHABLE_KEY: str = Field(default="")
    STRIPE_SECRET_KEY: str = Field(default="")
    STRIPE_PRODUCT_PLUS: str = Field(default="prod_VYfLUY5c7cyCC1")
    STRIPE_PRODUCT_PRO: str = Field(default="prod_VYfMFqbyB9dPy4")
    STRIPE_WEBHOOK_SECRET: str = Field(default="")

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
    UI_PROPOSAL_LIVE_ENABLED: bool = Field(default=False, description="Explicit local opt-in for paid UI proposal inference")

    # Meta Voice / Speech-to-Text
    META_AI_ASR_MODEL: str = Field(default="muse-voice-transcribe-1.0", description="Meta ASR model for voice transcription")
    META_AI_ASR_BASE_URL: str = Field(default="https://api.meta.ai/v1/asr", description="Meta ASR base URL")
    META_AI_ASR_WS_URL: str = Field(default="wss://api.meta.ai/v1/asr/realtime", description="Meta ASR realtime WebSocket URL")


    # Explicit stage routing. Empty partner settings never activate remote inference.
    AI_PROVIDER_PROFILE: str = Field(default="meta_only", description="meta_only or multi_ai")
    MULTI_AI_META_REQUEST_BUDGET: int = Field(default=15, ge=1, le=50)
    BASETEN_VISION_BASE_URL: str = ""
    BASETEN_VISION_MODEL: str = ""
    BASETEN_VISION_API_KEY: str = ""
    BASETEN_VISION_CAPABLE: bool = False
    BASETEN_VISION_TIMEOUT_SECONDS: float = Field(default=45, gt=0, le=180)
    BASETEN_VISION_MAX_RETRIES: int = Field(default=1, ge=0, le=3)
    BASETEN_VISION_MAX_TOKENS: int = Field(default=1500, ge=100, le=12000)
    BASETEN_VISION_REQUEST_BUDGET: int = Field(default=2, ge=1, le=10)
    BASETEN_VISION_META_FALLBACK: bool = False
    MODAL_REASONING_BASE_URL: str = ""
    MODAL_REASONING_MODEL: str = ""
    MODAL_REASONING_API_KEY: str = ""
    MODAL_REASONING_TIMEOUT_SECONDS: float = Field(default=60, gt=0, le=180)
    MODAL_REASONING_MAX_RETRIES: int = Field(default=1, ge=0, le=3)
    MODAL_REASONING_MAX_TOKENS: int = Field(default=4000, ge=100, le=12000)
    MODAL_REASONING_REQUEST_BUDGET: int = Field(default=2, ge=1, le=10)
    MODAL_REASONING_META_FALLBACK: bool = False

    # Email delivery for OTP verification. Resend uses HTTPS on Render Free.
    RESEND_API_KEY: str = Field(default="", description="Resend API key for HTTPS email delivery")
    SMTP_HOST: str = Field(default="", description="SMTP host for sending emails")
    SMTP_PORT: int = Field(default=587, description="SMTP port")
    SMTP_USER: str = Field(default="", description="SMTP username")
    SMTP_PASSWORD: str = Field(default="", description="SMTP password")
    SMTP_FROM: str = Field(default="ScopeGraph <verify@auth.scopegraph.top>", description="Sender email address")
    SMTP_USE_TLS: bool = Field(default=True, description="Use STARTTLS")
    ANALYSIS_RETENTION_DAYS: int = Field(default=7, ge=1, le=30)
    WEB_APP_URL: str = Field(default="https://www.scopegraph.top", description="Public web app URL")

    # Auth JWT
    SECRET_KEY: str = Field(default="scopegraph-dev-secret-change-in-production", description="JWT signing secret")
    JWT_ALGORITHM: str = Field(default="HS256")
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=60 * 24 * 7)  # 7 days

    # GitHub OAuth
    GITHUB_CLIENT_ID: str = Field(default="", description="GitHub OAuth Client ID")
    GITHUB_CLIENT_SECRET: str = Field(default="", description="GitHub OAuth Client Secret")
    GITHUB_REDIRECT_URI: str = Field(
        default="http://localhost:3000/auth/callback/github",
        description="GitHub OAuth callback URL"
    )

    # Google OAuth
    GOOGLE_CLIENT_ID: str = Field(default="", description="Google OAuth Client ID")
    GOOGLE_CLIENT_SECRET: str = Field(default="", description="Google OAuth Client Secret")
    GOOGLE_REDIRECT_URI: str = Field(
        default="https://www.scopegraph.top/auth/callback/google",
        description="Google OAuth callback URL"
    )

    model_config = SettingsConfigDict(
        env_file=_find_env_file(),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
