"""Plan lookups and server-side feature/usage enforcement for billing."""

from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.models import AnalysisRun, FeatureUsage, Repository, UserSubscription

ACTIVE_STATUSES = {"active", "trialing"}
AI_LIMITS = {"free": (15, "day"), "plus": (500, "month"), "pro": (None, "month")}
DAILY_FEATURE_LIMITS = {
    "vision": {"free": 10, "plus": 36, "pro": None},
    "voice": {"free": 30, "plus": 50, "pro": None},
}


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


def _usage_key(repository: Repository) -> str:
    email = (repository.owner_email or "").strip().lower()
    return email or f"repository:{repository.id}"


def require_feature(db: Session, repository: Repository, feature: str) -> str:
    """Return the plan for an included feature; daily metering is enforced separately."""
    if feature not in {"vision", "voice", "multi_ai"}:
        raise ValueError("Unknown metered feature")
    plan = plan_for_repository(db, repository)
    return plan


def enforce_daily_feature_limit(
    db: Session, repository: Repository, feature: str, now: datetime | None = None,
) -> None:
    plan = plan_for_repository(db, repository)
    limit = DAILY_FEATURE_LIMITS.get(feature, {}).get(plan)
    if limit is None:
        return
    owner_key = _usage_key(repository)
    now = now or datetime.now(timezone.utc)
    start = now.astimezone(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=None)
    count = (
        db.query(FeatureUsage)
        .filter(
            func.lower(FeatureUsage.owner_key) == owner_key,
            FeatureUsage.feature == feature,
            FeatureUsage.created_at >= start,
        )
        .count()
    )
    if count >= limit:
        raise HTTPException(status_code=429, detail=f"Your {plan} plan has reached its daily {feature} limit")


def record_feature_usage(db: Session, repository: Repository, feature: str) -> None:
    owner_key = _usage_key(repository)
    db.add(FeatureUsage(owner_key=owner_key, feature=feature))
    db.commit()


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
    query = db.query(AnalysisRun).join(Repository, AnalysisRun.repository_id == Repository.id)
    if owner_email:
        query = query.filter(func.lower(Repository.owner_email) == owner_email)
    else:
        query = query.filter(AnalysisRun.repository_id == repository.id)
    count = query.filter(AnalysisRun.created_at >= start).count()
    if count >= limit:
        raise HTTPException(status_code=429, detail=f"Your {plan} plan has reached its AI analysis limit for this {period}")

