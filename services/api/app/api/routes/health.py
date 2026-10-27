from fastapi import APIRouter
from sqlalchemy import text
from app.db.database import engine
from app.jobs.queue import get_redis_connection

router = APIRouter(tags=["health"])

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
