import os
import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

logger = logging.getLogger(__name__)

Base = declarative_base()

def get_engine():
    db_url = settings.DATABASE_URL
    # Ensure correct driver for postgres
    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql+psycopg://", 1)

    connect_args = {}
    if "sqlite" in db_url:
        connect_args["check_same_thread"] = False
        # Ensure directory exists for sqlite
        sqlite_file = db_url.replace("sqlite:///", "")
        if sqlite_file and sqlite_file != ":memory:":
            os.makedirs(os.path.dirname(os.path.abspath(sqlite_file)), exist_ok=True)

    return create_engine(
        db_url,
        connect_args=connect_args,
        pool_pre_ping=True,
    )

engine = get_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    """Initializes tables on startup if not already created."""
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables initialized successfully")
