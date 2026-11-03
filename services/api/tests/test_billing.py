from types import SimpleNamespace

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.routes import billing
from app.core.config import settings
from app.db.database import Base, get_db
from app.db.models import UserSubscription


@pytest.fixture
def billing_client(monkeypatch):
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    TestSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    def override_get_db():
        db = TestSession()
        try:
            yield db
        finally:
            db.close()

    app = FastAPI()
    app.include_router(billing.router, prefix="/api/v1")
    app.dependency_overrides[get_db] = override_get_db

    calls = {"price": None, "checkout_create": None, "checkout_retrieve": None}
    prices = [{
        "id": "price_plus_monthly",
        "active": True,
        "unit_amount": 1900,
        "currency": "usd",
        "recurring": {"interval": "month"},
    }]
    sessions = {}

    class PriceAPI:
        @staticmethod
        def list(**kwargs):
            calls["price"] = kwargs
            return {"data": prices}

    class CheckoutSessionAPI:
        @staticmethod
        def create(**kwargs):
            calls["checkout_create"] = kwargs
            return {"id": "cs_test_123", "url": "https://checkout.stripe.com/c/pay/cs_test_123"}

        @staticmethod
        def retrieve(session_id, **kwargs):
            calls["checkout_retrieve"] = {"session_id": session_id, **kwargs}
            return sessions[session_id]

    class WebhookAPI:
        @staticmethod
        def construct_event(payload, signature, secret):
            if signature != "valid-signature":
                raise ValueError("invalid signature")
            import json

            return json.loads(payload)

    class StripeStub:
        api_key = ""
        Price = PriceAPI
        checkout = SimpleNamespace(Session=CheckoutSessionAPI)
        Webhook = WebhookAPI

    monkeypatch.setattr(billing, "stripe", StripeStub)
    monkeypatch.setattr(settings, "STRIPE_SECRET_KEY", "sk_test_placeholder", raising=False)
    monkeypatch.setattr(settings, "STRIPE_WEBHOOK_SECRET", "", raising=False)
    monkeypatch.setattr(settings, "ENVIRONMENT", "development", raising=False)

    with TestClient(app) as client:
        yield client, TestSession, calls, prices, sessions

    engine.dispose()


def test_create_checkout_session_uses_monthly_plan_price_and_safe_return_origin(billing_client):
    client, _, calls, _, _ = billing_client

    response = client.post(
        "/api/v1/billing/create-checkout-session",
        json={"plan": "plus", "email": "Dev@Example.com"},
        headers={"Origin": "https://www.scopegraph.top"},
    )

    assert response.status_code == 200
    assert response.json() == {
        "checkout_url": "https://checkout.stripe.com/c/pay/cs_test_123",
        "session_id": "cs_test_123",
    }
    assert calls["price"] == {"product": settings.STRIPE_PRODUCT_PLUS, "active": True, "limit": 100}
    create_args = calls["checkout_create"]
    assert create_args["mode"] == "subscription"
    assert create_args["line_items"] == [{"price": "price_plus_monthly", "quantity": 1}]
    assert create_args["customer_email"] == "dev@example.com"
    assert create_args["success_url"].startswith("https://www.scopegraph.top/app/dashboard?billing=success&plan=plus")
    assert "session_id={CHECKOUT_SESSION_ID}" in create_args["success_url"]
    assert create_args["metadata"] == {"plan": "plus", "email": "dev@example.com"}
    assert create_args["subscription_data"]["metadata"] == create_args["metadata"]


def test_checkout_rejects_invalid_plan_and_untrusted_return_url(billing_client):
    client, _, _, _, _ = billing_client

    invalid_plan = client.post(
        "/api/v1/billing/create-checkout-session",
        json={"plan": "free", "email": "dev@example.com"},
    )
    untrusted_origin = client.post(
        "/api/v1/billing/create-checkout-session",
        json={"plan": "plus", "email": "dev@example.com", "return_url": "https://attacker.example"},
    )

    assert invalid_plan.status_code == 422
    assert untrusted_origin.status_code == 400


def test_checkout_returns_not_found_when_monthly_price_does_not_match_plan(billing_client):
    client, _, _, prices, _ = billing_client
    prices[0]["unit_amount"] = 2000

    response = client.post(
        "/api/v1/billing/create-checkout-session",
        json={"plan": "plus", "email": "dev@example.com"},
    )

    assert response.status_code == 404


def test_pro_checkout_uses_the_49_dollar_monthly_price(billing_client):
    client, _, calls, prices, _ = billing_client
    prices[0].update(id="price_pro_monthly", unit_amount=4900)

    response = client.post(
        "/api/v1/billing/create-checkout-session",
        json={"plan": "pro", "email": "dev@example.com"},
    )

    assert response.status_code == 200
    assert calls["price"]["product"] == settings.STRIPE_PRODUCT_PRO
    assert calls["checkout_create"]["line_items"] == [{"price": "price_pro_monthly", "quantity": 1}]
    assert calls["checkout_create"]["metadata"]["plan"] == "pro"


def test_completed_session_confirms_and_persists_subscription(billing_client):
    client, TestSession, calls, _, sessions = billing_client
    sessions["cs_test_paid"] = {
        "id": "cs_test_paid",
        "mode": "subscription",
        "status": "complete",
        "payment_status": "paid",
        "customer_details": {"email": "dev@example.com"},
        "metadata": {"plan": "pro", "email": "dev@example.com"},
        "subscription": {"id": "sub_123", "status": "active"},
        "customer": "cus_123",
    }

    response = client.get("/api/v1/billing/checkout-session/cs_test_paid?email=dev%40example.com")

    assert response.status_code == 200
    assert response.json() == {"plan": "pro", "subscription_status": "active"}
    assert calls["checkout_retrieve"] == {"session_id": "cs_test_paid", "expand": ["subscription"]}
    db = TestSession()
    try:
        account = db.query(UserSubscription).filter_by(email="dev@example.com").one()
        assert account.plan == "pro"
        assert account.stripe_customer_id == "cus_123"
        assert account.stripe_subscription_id == "sub_123"
    finally:
        db.close()


def test_checkout_confirmation_rejects_unpaid_or_wrong_email(billing_client):
    client, _, _, _, sessions = billing_client
    sessions["cs_test_open"] = {
        "mode": "subscription",
        "status": "open",
        "payment_status": "unpaid",
        "customer_email": "dev@example.com",
        "metadata": {"plan": "plus"},
    }

    unpaid = client.get("/api/v1/billing/checkout-session/cs_test_open?email=dev%40example.com")
    wrong_email = client.get("/api/v1/billing/checkout-session/cs_test_open?email=other%40example.com")

    assert unpaid.status_code == 409
    assert wrong_email.status_code == 403


def test_webhook_completed_and_deleted_events_update_plan(billing_client):
    client, TestSession, _, _, _ = billing_client
    completed = {
        "type": "checkout.session.completed",
        "data": {"object": {
            "mode": "subscription",
            "payment_status": "paid",
            "customer_email": "dev@example.com",
            "customer": "cus_123",
            "subscription": "sub_123",
            "metadata": {"plan": "plus", "email": "dev@example.com"},
        }},
    }
    upgraded = client.post("/api/v1/billing/webhook", json=completed)
    deleted = client.post("/api/v1/billing/webhook", json={
        "type": "customer.subscription.deleted",
        "data": {"object": {
            "id": "sub_123",
            "customer": "cus_123",
            "status": "canceled",
            "metadata": {"plan": "plus", "email": "dev@example.com"},
        }},
    })

    assert upgraded.status_code == 200
    assert deleted.status_code == 200
    db = TestSession()
    try:
        account = db.query(UserSubscription).filter_by(email="dev@example.com").one()
        assert account.plan == "free"
        assert account.subscription_status == "canceled"
        assert account.stripe_customer_id == "cus_123"
        assert account.stripe_subscription_id == "sub_123"
    finally:
        db.close()


def test_unpaid_completed_checkout_does_not_activate_plan(billing_client):
    client, TestSession, _, _, _ = billing_client
    response = client.post("/api/v1/billing/webhook", json={
        "type": "checkout.session.completed",
        "data": {"object": {
            "mode": "subscription",
            "payment_status": "unpaid",
            "customer_email": "dev@example.com",
            "metadata": {"plan": "plus", "email": "dev@example.com"},
        }},
    })

    assert response.status_code == 200
    db = TestSession()
    try:
        account = db.query(UserSubscription).filter_by(email="dev@example.com").first()
        assert account is None
    finally:
        db.close()


def test_webhook_validates_signature_when_secret_is_configured(billing_client, monkeypatch):
    client, _, _, _, _ = billing_client
    monkeypatch.setattr(settings, "STRIPE_WEBHOOK_SECRET", "whsec_test", raising=False)
    event = {"type": "customer.subscription.deleted", "data": {"object": {}}}

    invalid = client.post("/api/v1/billing/webhook", json=event, headers={"Stripe-Signature": "invalid"})
    valid = client.post("/api/v1/billing/webhook", json=event, headers={"Stripe-Signature": "valid-signature"})

    assert invalid.status_code == 400
    assert valid.status_code == 200


def test_webhook_requires_signature_secret_in_production(billing_client, monkeypatch):
    client, _, _, _, _ = billing_client
    monkeypatch.setattr(settings, "ENVIRONMENT", "production", raising=False)
    response = client.post("/api/v1/billing/webhook", json={"type": "ignored"})
    assert response.status_code == 503
