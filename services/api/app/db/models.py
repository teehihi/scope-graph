import uuid
import datetime
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from app.db.database import Base


def generate_uuid() -> str:
    return str(uuid.uuid4())


def utc_now():
    return datetime.datetime.now(datetime.timezone.utc)


class User(Base):
    """Real user accounts with email/password or OAuth provider identity."""

    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String(255), nullable=False, unique=True, index=True)
    name = Column(String(255), nullable=False, default="Developer")
    # password_hash is null for OAuth-only accounts
    password_hash = Column(String(255), nullable=True)
    is_verified = Column(Boolean, nullable=False, default=False)
    onboarding_completed = Column(Boolean, nullable=False, default=False)
    provider = Column(String(20), nullable=False, default="email")  # email | github | google
    avatar_url = Column(String(1024), nullable=True)
    username = Column(String(255), nullable=True)
    session_token_hash = Column(String(64), nullable=True, index=True)
    session_expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, default=utc_now)
    updated_at = Column(DateTime, nullable=False, default=utc_now, onupdate=utc_now)


class OtpCode(Base):
    """One-time password codes for email verification during registration."""

    __tablename__ = "otp_codes"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String(255), nullable=False, index=True)
    code = Column(String(6), nullable=False)
    purpose = Column(String(30), nullable=False, default="registration")  # registration | password_reset
    used = Column(Boolean, nullable=False, default=False)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, nullable=False, default=utc_now)


class Repository(Base):
    __tablename__ = "repositories"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    description = Column(Text, default="")
    status = Column(String(50), default="pending")  # pending, indexing, ready, error
    error_message = Column(Text, nullable=True)
    workspace_path = Column(String(1024), nullable=True)
    owner_email = Column(String(255), nullable=True, index=True)
    stats = Column(JSON, default=dict)
    created_at = Column(DateTime, default=utc_now)
    indexed_at = Column(DateTime, nullable=True)

    files = relationship("IndexedFile", back_populates="repository", cascade="all, delete-orphan")
    symbols = relationship("IndexedSymbol", back_populates="repository", cascade="all, delete-orphan")
    edges = relationship("DependencyEdge", back_populates="repository", cascade="all, delete-orphan")
    analyses = relationship("AnalysisRun", back_populates="repository", cascade="all, delete-orphan")

class IndexedFile(Base):
    __tablename__ = "indexed_files"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    repository_id = Column(String(36), ForeignKey("repositories.id", ondelete="CASCADE"), nullable=False, index=True)
    path = Column(String(1024), nullable=False, index=True)
    language = Column(String(50), default="python")
    size_bytes = Column(Integer, default=0)
    sha256 = Column(String(64), nullable=True)
    created_at = Column(DateTime, default=utc_now)

    repository = relationship("Repository", back_populates="files")
    symbols = relationship("IndexedSymbol", back_populates="file", cascade="all, delete-orphan")

class IndexedSymbol(Base):
    __tablename__ = "indexed_symbols"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    repository_id = Column(String(36), ForeignKey("repositories.id", ondelete="CASCADE"), nullable=False, index=True)
    file_id = Column(String(36), ForeignKey("indexed_files.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False, index=True)
    symbol_type = Column(String(50), nullable=False)  # function, class, endpoint, model, test, service, method
    line_start = Column(Integer, nullable=True)
    line_end = Column(Integer, nullable=True)
    signature = Column(String(512), nullable=True)
    docstring = Column(Text, nullable=True)
    metadata_json = Column(JSON, default=dict)

    repository = relationship("Repository", back_populates="symbols")
    file = relationship("IndexedFile", back_populates="symbols")

class DependencyEdge(Base):
    __tablename__ = "dependency_edges"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    repository_id = Column(String(36), ForeignKey("repositories.id", ondelete="CASCADE"), nullable=False, index=True)
    source_file_id = Column(String(36), ForeignKey("indexed_files.id", ondelete="CASCADE"), nullable=False)
    target_file_id = Column(String(36), ForeignKey("indexed_files.id", ondelete="CASCADE"), nullable=False)
    source_symbol_id = Column(String(36), ForeignKey("indexed_symbols.id", ondelete="SET NULL"), nullable=True)
    target_symbol_id = Column(String(36), ForeignKey("indexed_symbols.id", ondelete="SET NULL"), nullable=True)
    edge_type = Column(String(50), nullable=False)  # imports, calls, defines, routes_to, tests, reads_from, writes_to
    metadata_json = Column(JSON, default=dict)

    repository = relationship("Repository", back_populates="edges")

class AnalysisRun(Base):
    __tablename__ = "analysis_runs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    repository_id = Column(String(36), ForeignKey("repositories.id", ondelete="CASCADE"), nullable=False, index=True)
    requested_by_email = Column(String(255), nullable=True, index=True)
    requirement_text = Column(Text, nullable=False)
    target_language = Column(String(8), nullable=False, default="en")
    status = Column(String(50), default="queued")  # queued, processing, completed, failed
    provider = Column(String(50), default="offline_demo")
    model = Column(String(100), default="meta-llama/Llama-3.3-70B-Instruct")
    result_json = Column(JSON, default=dict)
    brief_markdown = Column(Text, default="")
    error_message = Column(Text, nullable=True)
    execution_time_seconds = Column(Float, default=0.0)
    created_at = Column(DateTime, default=utc_now)
    completed_at = Column(DateTime, nullable=True)

    repository = relationship("Repository", back_populates="analyses")


class UserSubscription(Base):
    """Billing state keyed to the email used by the current demo authentication flow."""

    __tablename__ = "user_subscriptions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String(255), nullable=False, unique=True, index=True)
    plan = Column(String(20), nullable=False, default="free")
    stripe_customer_id = Column(String(255), nullable=True, index=True)
    stripe_subscription_id = Column(String(255), nullable=True, index=True)
    subscription_status = Column(String(50), nullable=True)
    created_at = Column(DateTime, nullable=False, default=utc_now)
    updated_at = Column(DateTime, nullable=False, default=utc_now, onupdate=utc_now)


class FeatureUsage(Base):
    """Daily metered feature usage keyed to an account or unowned repository."""

    __tablename__ = "feature_usage"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    owner_key = Column(String(255), nullable=False, index=True)
    feature = Column(String(30), nullable=False, index=True)
    created_at = Column(DateTime, nullable=False, default=utc_now, index=True)
