from fastapi import APIRouter, HTTPException
from sqlalchemy import text
from pydantic import BaseModel
from app.db.database import engine
from app.jobs.queue import get_redis_connection
from app.core.config import settings

router = APIRouter(tags=["health"])

# Preserve original boot environment key
ORIGINAL_ENV_API_KEY: str = settings.META_AI_API_KEY
CUSTOM_USER_API_KEY: str | None = None

@router.get("/health")
def health():
    return {"status": "ok", "service": "scopegraph-api"}

@router.get("/ready")
def readiness():
    db_ok = False
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        db_ok = False

    redis_ok = False
    try:
        r = get_redis_connection()
        if r and r.ping():
            redis_ok = True
    except Exception:
        redis_ok = False

    return {
        "status": "ready" if db_ok else "degraded",
        "database": "connected" if db_ok else "unreachable",
        "redis": "connected" if redis_ok else "unreachable_or_disabled",
    }

@router.get("/system/info")
def system_info():
    """
    Returns runtime backend configuration for settings inspection.
    SECURITY STANDARD: The system environment API key in .env is never exposed over the API.
    Runtime keys are never returned; callers only receive presence and source.
    """
    has_api_key = bool(settings.META_AI_API_KEY and settings.META_AI_API_KEY.strip())
    source = "custom" if CUSTOM_USER_API_KEY else ("system" if bool(ORIGINAL_ENV_API_KEY and ORIGINAL_ENV_API_KEY.strip()) else "none")

    provider = settings.META_AI_PROVIDER.lower().strip()
    is_live = provider != "offline_demo" and has_api_key

    return {
        "provider": settings.META_AI_PROVIDER,
        "model": settings.META_AI_MODEL,
        "base_url": settings.META_AI_BASE_URL,
        "is_live": is_live,
        "has_api_key": has_api_key,
        "api_key_source": source,
        "custom_api_key": "",
        "temperature": settings.META_AI_TEMPERATURE,
        "max_tokens": settings.META_AI_MAX_TOKENS,
        "environment": settings.ENVIRONMENT,
    }

class UpdateSettingsPayload(BaseModel):
    provider: str | None = None
    model: str | None = None
    base_url: str | None = None
    api_key: str | None = None
    reset_api_key: bool = False
    temperature: float | None = None
    max_tokens: int | None = None

@router.put("/system/settings")
def update_system_settings(payload: UpdateSettingsPayload):
    """
    Update runtime AI settings dynamically without requiring server restart.
    """
    global CUSTOM_USER_API_KEY

    if settings.ENVIRONMENT.lower() == "production":
        raise HTTPException(status_code=403, detail="Runtime AI settings are disabled in production")
    if payload.provider is not None and payload.provider.strip():
        settings.META_AI_PROVIDER = payload.provider.strip()
    if payload.model is not None and payload.model.strip():
        settings.META_AI_MODEL = payload.model.strip()
    if payload.base_url is not None and payload.base_url.strip():
        settings.META_AI_BASE_URL = payload.base_url.strip()
    if payload.temperature is not None:
        settings.META_AI_TEMPERATURE = round(max(0.0, min(1.0, float(payload.temperature))), 2)
    if payload.max_tokens is not None:
        settings.META_AI_MAX_TOKENS = max(500, min(16000, int(payload.max_tokens)))

    if payload.reset_api_key:
        CUSTOM_USER_API_KEY = None
        settings.META_AI_API_KEY = ORIGINAL_ENV_API_KEY
    elif payload.api_key is not None and payload.api_key.strip():
        cleaned = payload.api_key.strip()
        CUSTOM_USER_API_KEY = cleaned
        settings.META_AI_API_KEY = cleaned

    return system_info()

@router.post("/system/test-ai")
def test_ai_connection():
    """
    Test connectivity with active AI provider and API credentials.
    """
    if settings.ENVIRONMENT.lower() == "production":
        raise HTTPException(status_code=403, detail="Runtime AI connection tests are disabled in production")

    try:
        from app.ai.provider import get_ai_provider
        prov = get_ai_provider()
        name = getattr(prov, "provider_name", "AI Provider")
        if name == "offline_demo":
            return {"success": True, "message": "Offline demo mode is active and responsive."}

        resp = prov.interpret_requirement("Connectivity verification ping")
        model = getattr(prov, "model", settings.META_AI_MODEL)
        return {
            "success": True,
            "message": f"Connected to {name} ({model}) successfully!",
        }
    except Exception as e:
        return {"success": False, "message": str(e)}
