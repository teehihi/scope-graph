"""Plan lookups and server-side feature/usage enforcement for billing."""

from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.models import AnalysisRun, Repository, UserSubscription

ACTIVE_STATUSES = {"active", "trialing"}
AI_LIMITS = {"free": (5, "day"), "plus": (500, "month"), "pro": (None, "month")}


def active_plan_for_email(db: Session, email: str | None) -> str:
    email = (email or "").strip().lower()
    if not email:
        return "free"
    subscription = db.query(UserSubscription).filter(UserSubscription.email == email).first()
    if not subscription:
        return "free"
    if subscription.plan in {"plus", "pro"} and subscription.subscription_status in ACTIVE_STATUSES:
        return subscription.plan
    return "free"


def plan_for_repository(db: Session, repository: Repository) -> str:
    return active_plan_for_email(db, repository.owner_email)


def require_feature(db: Session, repository: Repository, feature: str) -> str:
    plan = plan_for_repository(db, repository)
    if feature in {"vision", "voice", "multi_ai"} and plan not in {"plus", "pro"}:
        raise HTTPException(status_code=403, detail=f"{feature} requires a Developer Plus or Team & Enterprise Pro subscription")
    return plan


def enforce_ai_limit(db: Session, repository: Repository, now: datetime | None = None) -> None:
    plan = plan_for_repository(db, repository)
    limit, period = AI_LIMITS[plan]
    if limit is None:
        return
    now = now or datetime.now(timezone.utc)
    start = (
        now.replace(hour=0, minute=0, second=0, microsecond=0)
        if period == "day"
        else now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    )
    owner_email = (repository.owner_email or "").strip().lower()
    if not owner_email:
        # Public/sample repositories have no account identity; account quotas
        # are enforced for repositories linked to a billing email.
        return
    count = (
        db.query(AnalysisRun)
        .join(Repository, AnalysisRun.repository_id == Repository.id)
        .filter(func.lower(Repository.owner_email) == owner_email, AnalysisRun.created_at >= start)
        .count()
    )
    if count >= limit:
        raise HTTPException(status_code=429, detail=f"Your {plan} plan has reached its AI analysis limit for this {period}")

