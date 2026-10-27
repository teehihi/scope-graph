import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

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

    # Meta AI / Inference Provider
    # Options: meta_model_api, fireworks, baseten, modal, together, groq, generic_openai_compat, offline_demo
    META_AI_PROVIDER: str = Field(default="offline_demo", description="Active AI inference provider")
    META_AI_API_KEY: str = Field(default="", description="API key for Meta AI or inference partner")
    META_AI_BASE_URL: str = Field(default="https://api.meta.com/v1", description="Inference base URL")
    META_AI_MODEL: str = Field(default="meta-llama/Llama-3.3-70B-Instruct", description="Exact model name or ID")
    META_AI_TEMPERATURE: float = Field(default=0.1, description="Sampling temperature")
    META_AI_MAX_TOKENS: int = Field(default=3000, description="Max completion tokens")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
