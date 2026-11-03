import os
import sys
import logging
import threading
import time
from redis import Redis
from rq import Worker, Queue
from app.core.config import settings
from app.core.logging import setup_logging
from app.jobs.tasks import task_cleanup_expired_analyses


def _cleanup_loop():
    while True:
        task_cleanup_expired_analyses()
        time.sleep(24 * 60 * 60)

def start_worker():
    setup_logging(settings.LOG_LEVEL)
    logger = logging.getLogger("scopegraph.worker")
    logger.info("Initializing ScopeGraph Redis Worker connecting to %s...", settings.REDIS_URL)

    try:
        redis_conn = Redis.from_url(settings.REDIS_URL)
        redis_conn.ping()
    except Exception as e:
        logger.error("Failed to connect to Redis at %s: %s", settings.REDIS_URL, e)
        sys.exit(1)

    listen_queues = ["scopegraph_jobs"]
    logger.info("ScopeGraph Worker ready and listening on queues: %s", listen_queues)
    threading.Thread(target=_cleanup_loop, daemon=True, name="analysis-retention-cleanup").start()
    worker = Worker(listen_queues, connection=redis_conn)
    worker.work()

if __name__ == "__main__":
    start_worker()
