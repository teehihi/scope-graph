from datetime import datetime, timezone

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.billing.entitlements import enforce_ai_limit, require_feature
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


def test_paid_features_require_active_subscription(billing_db):
    repo = add_repository(billing_db)
    with pytest.raises(HTTPException) as error:
        require_feature(billing_db, repo, "vision")
    assert error.value.status_code == 403

    billing_db.add(UserSubscription(email="dev@example.com", plan="plus", subscription_status="active"))
    billing_db.commit()
    assert require_feature(billing_db, repo, "vision") == "plus"


def test_canceled_subscription_loses_paid_features(billing_db):
    repo = add_repository(billing_db)
    billing_db.add(UserSubscription(email="dev@example.com", plan="pro", subscription_status="canceled"))
    billing_db.commit()

    with pytest.raises(HTTPException) as error:
        require_feature(billing_db, repo, "voice")
    assert error.value.status_code == 403


def test_free_ai_daily_limit_counts_runs_for_account_repositories(billing_db):
    repo = add_repository(billing_db)
    now = datetime.now(timezone.utc)
    for _ in range(5):
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
