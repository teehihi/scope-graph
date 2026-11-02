import os
import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

logger = logging.getLogger(__name__)

Base = declarative_base()

def normalize_database_url(db_url: str | None) -> str:
    """Normalize database connection URLs to ensure the correct psycopg driver dialect is used."""
    if not db_url:
        return "sqlite:///./data/scopegraph.db"
    if db_url.startswith("postgres://"):
        return db_url.replace("postgres://", "postgresql+psycopg://", 1)
    if db_url.startswith("postgresql://") and not db_url.startswith("postgresql+"):
        return db_url.replace("postgresql://", "postgresql+psycopg://", 1)
    return db_url

def get_engine():
    db_url = normalize_database_url(settings.DATABASE_URL)

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
