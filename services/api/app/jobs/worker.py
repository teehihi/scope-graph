import os
import sys
import logging
from redis import Redis
from rq import Worker, Queue, Connection
from app.core.config import settings
from app.core.logging import setup_logging

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
    with Connection(redis_conn):
        worker = Worker(map(Queue, listen_queues))
        logger.info("ScopeGraph Worker ready and listening on queues: %s", listen_queues)
        worker.work()

if __name__ == "__main__":
    start_worker()
