from datetime import datetime, timezone

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.billing.entitlements import (
    enforce_ai_limit,
    enforce_daily_feature_limit,
    record_feature_usage,
    require_feature,
)
from app.db.database import Base
from app.db.models import AnalysisRun, Repository, UserSubscription


@pytest.fixture
def billing_db():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    with Session(engine) as db:
        yield db
    engine.dispose()


def add_repository(db: Session, email: str = "dev@example.com") -> Repository:
    repo = Repository(name="demo", owner_email=email, status="ready")
    db.add(repo)
    db.commit()
    db.refresh(repo)
    return repo


def test_require_feature_resolves_active_subscription_plan(billing_db):
    repo = add_repository(billing_db)
    assert require_feature(billing_db, repo, "vision") == "free"

    billing_db.add(UserSubscription(email="dev@example.com", plan="plus", subscription_status="active"))
    billing_db.commit()
    assert require_feature(billing_db, repo, "vision") == "plus"

    with pytest.raises(ValueError, match="Unknown metered feature"):
        require_feature(billing_db, repo, "unsupported_feature")


def test_daily_feature_limit_enforces_quota_and_passes_pro(billing_db):
    repo = add_repository(billing_db)
    now = datetime.now(timezone.utc)

    # Free plan vision limit is 10
    for _ in range(10):
        record_feature_usage(billing_db, repo, "vision")

    with pytest.raises(HTTPException) as error:
        enforce_daily_feature_limit(billing_db, repo, "vision", now)
    assert error.value.status_code == 429

    # Upgrade to pro removes the limit
    billing_db.add(UserSubscription(email="dev@example.com", plan="pro", subscription_status="active"))
    billing_db.commit()
    enforce_daily_feature_limit(billing_db, repo, "vision", now)


def test_free_ai_daily_limit_counts_runs_for_account_repositories(billing_db):
    repo = add_repository(billing_db)
    now = datetime.now(timezone.utc)
    for _ in range(15):
        billing_db.add(AnalysisRun(repository_id=repo.id, requirement_text="change", created_at=now))
    billing_db.commit()

    with pytest.raises(HTTPException) as error:
        enforce_ai_limit(billing_db, repo, now)
    assert error.value.status_code == 429


def test_pro_plan_has_no_ai_analysis_limit(billing_db):
    repo = add_repository(billing_db)
    billing_db.add(UserSubscription(email="dev@example.com", plan="pro", subscription_status="active"))
    now = datetime.now(timezone.utc)
    for _ in range(510):
        billing_db.add(AnalysisRun(repository_id=repo.id, requirement_text="change", created_at=now))
    billing_db.commit()

    enforce_ai_limit(billing_db, repo, now)

