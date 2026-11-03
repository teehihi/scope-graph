import hashlib
import secrets
import datetime

from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import User
from app.core.config import settings


def issue_session_token(user: User) -> str:
    """Create an opaque bearer token and store only its digest."""
    token = secrets.token_urlsafe(32)
    user.session_token_hash = hashlib.sha256(token.encode()).hexdigest()
    user.session_expires_at = (
        datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)
        + datetime.timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return token


def optional_session_user(
    authorization: str | None = Header(None),
    db: Session = Depends(get_db),
) -> User | None:
    if not authorization:
        return None
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        return None
    digest = hashlib.sha256(token.encode()).hexdigest()
    now = datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)
    return db.query(User).filter(
        User.session_token_hash == digest,
        User.session_expires_at > now,
        User.is_verified.is_(True),
    ).first()


def revoke_session(user: User) -> None:
    user.session_token_hash = None
    user.session_expires_at = None


def require_session_user(user: User | None = Depends(optional_session_user)) -> User:
    if not user:
        raise HTTPException(status_code=401, detail="A valid account session is required")
    return user
