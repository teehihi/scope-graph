import os
import json
import logging
import hashlib
import threading
import uuid
from typing import Any, Callable
from redis import Redis
from rq import Queue, Retry
from app.core.config import settings

logger = logging.getLogger(__name__)

_redis_conn: Redis | None = None

def get_redis_connection() -> Redis | None:
    global _redis_conn
    if not settings.REDIS_ENABLED:
        return None
    if _redis_conn is None:
        try:
            r = Redis.from_url(settings.REDIS_URL, decode_responses=True, socket_connect_timeout=2)
            r.ping()
            _redis_conn = r
            logger.info("Connected to Redis successfully at %s", settings.REDIS_URL)
        except Exception as e:
            logger.warning("Redis is not available (%s). Background jobs will execute in-process.", e)
            _redis_conn = None
    return _redis_conn

def get_queue(name: str = "scopegraph_jobs") -> Queue | None:
    conn = get_redis_connection()
    if conn:
        return Queue(name, connection=conn, default_timeout=300)
    return None

def enqueue_job(func: Callable, *args, **kwargs) -> str:
    """
    Enqueues a task to the Redis RQ queue, or runs immediately in-process
    if Redis is unavailable.
    """
    q = get_queue()
    if q:
        job = q.enqueue(
            func,
            *args,
            retry=Retry(max=2, interval=[5, 15]),
            result_ttl=86400,
            failure_ttl=86400,
            **kwargs
        )
        return str(job.id)
    else:
        # Keep HTTP requests non-blocking when Redis is not configured.
        job_id = f"local-{uuid.uuid4()}"
        logger.warning("Redis unavailable; executing %s on a local background thread", func.__name__)
        threading.Thread(target=func, args=args, kwargs=kwargs, daemon=True, name=f"scopegraph-{func.__name__}").start()
        return job_id

# Redis Cache helpers
def get_cache(key: str) -> dict[str, Any] | None:
    r = get_redis_connection()
    if not r:
        return None
    try:
        val = r.get(f"scopegraph:{key}")
        if val:
            return json.loads(val)
    except Exception as e:
        logger.warning("Cache read failed: %s", e)
    return None

def set_cache(key: str, data: dict[str, Any], ttl_seconds: int = 3600) -> bool:
    r = get_redis_connection()
    if not r:
        return False
    try:
        r.setex(f"scopegraph:{key}", ttl_seconds, json.dumps(data))
        return True
    except Exception as e:
        logger.warning("Cache write failed: %s", e)
        return False

def make_analysis_cache_key(repo_id: str, requirement: str, model_id: str, *,
                            index_version: str = "", profile: str = "",
                            provider_signature: str = "", target_language: str = "en") -> str:
    norm_req = " ".join(requirement.lower().strip().split())
    # Bump when indexing or impact-classification semantics change.
    raw = f"sg-multi-ai-v1:{repo_id}:{index_version}:{norm_req}:{profile}:{provider_signature}:{model_id}:{target_language}"
    return hashlib.sha256(raw.encode()).hexdigest()
