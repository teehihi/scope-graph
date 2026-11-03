import json
import logging
import re
from urllib.parse import urlsplit

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.database import get_db
from app.db.models import UserSubscription

try:
    import stripe
except ImportError:  # Keep non-billing development commands usable before requirements are installed.
    stripe = None


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/billing", tags=["billing"])
EMAIL_PATTERN = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
PLAN_PRODUCTS = {"plus": ("STRIPE_PRODUCT_PLUS", 1900), "pro": ("STRIPE_PRODUCT_PRO", 4900)}


class CheckoutSessionRequest(BaseModel):
    plan: str
    email: str = Field(min_length=3, max_length=254)
    return_url: str | None = None

    @field_validator("plan")
    @classmethod
    def validate_plan(cls, value: str) -> str:
        if value not in PLAN_PRODUCTS:
            raise ValueError("plan must be plus or pro")
        return value

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        cleaned = value.strip().lower()
        if not EMAIL_PATTERN.fullmatch(cleaned):
            raise ValueError("email must be a valid email address")
        return cleaned


def _stripe_client():
    if stripe is None:
        raise HTTPException(status_code=503, detail="Stripe billing is unavailable")
    if not settings.STRIPE_SECRET_KEY:
        raise HTTPException(status_code=503, detail="Stripe billing is not configured")
    stripe.api_key = settings.STRIPE_SECRET_KEY
    return stripe


def _value(record, key: str, default=None):
    if isinstance(record, dict):
        return record.get(key, default)
    try:
        return record.get(key, default)
    except (AttributeError, TypeError):
        return getattr(record, key, default)


def _object_id(value) -> str | None:
    if isinstance(value, str):
        return value
    result = _value(value, "id")
    return str(result) if result else None


def _email(value: str | None) -> str | None:
    if not isinstance(value, str) or not value:
        return None
    cleaned = value.strip().lower()
    return cleaned if EMAIL_PATTERN.fullmatch(cleaned) else None


def _frontend_origin(request: Request, return_url: str | None) -> str:
    candidate = return_url or request.headers.get("origin") or "https://www.scopegraph.top"
    try:
        parsed = urlsplit(candidate)
        port = parsed.port
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid return_url") from exc
    host = (parsed.hostname or "").lower()
    allowed_hosts = {"www.scopegraph.top", "scopegraph.top", "scopegraph.vercel.app", "localhost", "127.0.0.1"}
    if parsed.scheme not in {"http", "https"} or host not in allowed_hosts or parsed.username or parsed.password:
        raise HTTPException(status_code=400, detail="return_url must use a ScopeGraph or local development origin")
    if host in {"www.scopegraph.top", "scopegraph.top", "scopegraph.vercel.app"} and (parsed.scheme != "https" or port not in {None, 443}):
        raise HTTPException(status_code=400, detail="ScopeGraph return URLs must use HTTPS")
    netloc = parsed.netloc.lower()
    return f"{parsed.scheme}://{netloc}"


def _resolve_monthly_price(stripe_client, plan: str) -> str:
    setting_name, expected_amount = PLAN_PRODUCTS[plan]
    product_id = getattr(settings, setting_name)
    try:
        prices = stripe_client.Price.list(product=product_id, active=True, limit=100)
    except Exception as exc:
        logger.warning("Stripe price lookup failed (%s)", type(exc).__name__)
        raise HTTPException(status_code=502, detail="Could not load the selected subscription price") from exc

    price_items = _value(prices, "data", []) or []
    matches = [
        price for price in price_items
        if _value(_value(price, "recurring", {}), "interval") == "month"
        and int(_value(_value(price, "recurring", {}), "interval_count", 1) or 1) == 1
        and int(_value(price, "unit_amount", 0) or 0) == expected_amount
        and str(_value(price, "currency", "")).lower() == "usd"
        and bool(_value(price, "active", True))
    ]
    if not matches:
        raise HTTPException(status_code=404, detail="No active monthly price is configured for this plan")
    return str(_value(matches[0], "id"))


def _find_or_create_subscription(db: Session, email: str) -> UserSubscription:
    account = db.query(UserSubscription).filter(UserSubscription.email == email).first()
    if account is None:
        account = UserSubscription(email=email, plan="free")
        db.add(account)
    return account


def _persist_subscription(
    db: Session,
    *,
    email: str,
    plan: str,
    customer_id: str | None,
    subscription_id: str | None,
    status: str | None,
) -> UserSubscription:
    account = _find_or_create_subscription(db, email)
    account.plan = plan
    account.stripe_customer_id = customer_id or account.stripe_customer_id
    account.stripe_subscription_id = subscription_id or account.stripe_subscription_id
    account.subscription_status = status
    db.commit()
    db.refresh(account)
    return account


def _set_stripe_status(db: Session, subscription, *, deleted: bool = False) -> None:
    metadata = _value(subscription, "metadata", {}) or {}
    email = _email(_value(metadata, "email"))
    subscription_id = _object_id(subscription)
    customer_id = _object_id(_value(subscription, "customer"))
    account = None
    if email:
        account = db.query(UserSubscription).filter(UserSubscription.email == email).first()
    if account is None and subscription_id:
        account = db.query(UserSubscription).filter(
            UserSubscription.stripe_subscription_id == subscription_id
        ).first()
    if account is None and customer_id:
        account = db.query(UserSubscription).filter(UserSubscription.stripe_customer_id == customer_id).first()
    if account is None:
        if not deleted or not email:
            return
        account = _find_or_create_subscription(db, email)

    status = "canceled" if deleted else str(_value(subscription, "status", "unknown"))
    if deleted:
        account.plan = "free"
    else:
        plan = _value(metadata, "plan")
        if status in {"canceled", "unpaid", "incomplete_expired"}:
            account.plan = "free"
        elif plan in PLAN_PRODUCTS and status in {"active", "trialing"}:
            account.plan = plan
    account.subscription_status = status
    account.stripe_customer_id = customer_id or account.stripe_customer_id
    account.stripe_subscription_id = subscription_id or account.stripe_subscription_id
    db.commit()


@router.post("/create-checkout-session")
def create_checkout_session(payload: CheckoutSessionRequest, request: Request):
    stripe_client = _stripe_client()
    price_id = _resolve_monthly_price(stripe_client, payload.plan)
    origin = _frontend_origin(request, payload.return_url)
    success_url = (
        f"{origin}/app/dashboard?billing=success&plan={payload.plan}"
        "&session_id={CHECKOUT_SESSION_ID}"
    )
    cancel_url = f"{origin}/app/dashboard?billing=cancel"
    try:
        session = stripe_client.checkout.Session.create(
            mode="subscription",
            line_items=[{"price": price_id, "quantity": 1}],
            customer_email=payload.email,
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={"plan": payload.plan, "email": payload.email},
            subscription_data={"metadata": {"plan": payload.plan, "email": payload.email}},
        )
    except Exception as exc:
        logger.warning("Stripe checkout creation failed (%s)", type(exc).__name__)
        raise HTTPException(status_code=502, detail="Could not start Stripe Checkout") from exc

    checkout_url = _value(session, "url")
    session_id = _value(session, "id")
    if not checkout_url or not session_id:
        raise HTTPException(status_code=502, detail="Stripe returned an incomplete checkout session")
    return {"checkout_url": checkout_url, "session_id": session_id}


@router.get("/subscription")
def get_subscription(email: str = Query(min_length=3, max_length=254), db: Session = Depends(get_db)):
    normalized_email = _email(email)
    if not normalized_email:
        raise HTTPException(status_code=422, detail="A valid email address is required")
    account = db.query(UserSubscription).filter(UserSubscription.email == normalized_email).first()
    return {
        "plan": account.plan if account else "free",
        "subscription_status": account.subscription_status if account else None,
    }


@router.get("/checkout-session/{session_id}")
def confirm_checkout_session(
    session_id: str,
    email: str = Query(min_length=3, max_length=254),
    db: Session = Depends(get_db),
):
    normalized_email = _email(email)
    if not normalized_email:
        raise HTTPException(status_code=422, detail="A valid email address is required")
    stripe_client = _stripe_client()
    try:
        session = stripe_client.checkout.Session.retrieve(session_id, expand=["subscription"])
    except Exception as exc:
        logger.warning("Stripe checkout verification failed (%s)", type(exc).__name__)
        raise HTTPException(status_code=502, detail="Could not verify the Stripe Checkout session") from exc

    session_email = _email(
        _value(_value(session, "customer_details", {}), "email") or _value(session, "customer_email")
    )
    if session_email != normalized_email:
        raise HTTPException(status_code=403, detail="Checkout session does not belong to this account")
    metadata = _value(session, "metadata", {}) or {}
    plan = _value(metadata, "plan")
    if (
        _value(session, "mode") != "subscription"
        or _value(session, "status") != "complete"
        or _value(session, "payment_status") not in {"paid", "no_payment_required"}
        or plan not in PLAN_PRODUCTS
    ):
        raise HTTPException(status_code=409, detail="Checkout is not complete")

    subscription = _value(session, "subscription")
    subscription_id = _object_id(subscription)
    status = _value(subscription, "status", "active") or "active"
    customer_id = _object_id(_value(session, "customer"))
    account = _persist_subscription(
        db,
        email=normalized_email,
        plan=plan,
        customer_id=customer_id,
        subscription_id=subscription_id,
        status=str(status),
    )
    return {"plan": account.plan, "subscription_status": account.subscription_status}


@router.post("/webhook")
async def stripe_webhook(
    request: Request,
    stripe_signature: str | None = Header(default=None, alias="Stripe-Signature"),
    db: Session = Depends(get_db),
):
    stripe_client = stripe
    if stripe_client is None:
        raise HTTPException(status_code=503, detail="Stripe billing is unavailable")
    raw_body = await request.body()
    if settings.STRIPE_WEBHOOK_SECRET:
        if not stripe_signature:
            raise HTTPException(status_code=400, detail="Missing Stripe-Signature header")
        try:
            event = stripe_client.Webhook.construct_event(
                raw_body, stripe_signature, settings.STRIPE_WEBHOOK_SECRET
            )
        except Exception as exc:
            logger.warning("Stripe webhook signature validation failed (%s)", type(exc).__name__)
            raise HTTPException(status_code=400, detail="Invalid Stripe webhook signature or payload") from exc
    else:
        if settings.ENVIRONMENT.lower() not in {"development", "test"}:
            raise HTTPException(status_code=503, detail="Stripe webhook signing is not configured")
        try:
            event = json.loads(raw_body)
        except (json.JSONDecodeError, UnicodeDecodeError) as exc:
            raise HTTPException(status_code=400, detail="Invalid Stripe webhook payload") from exc

    event_type = _value(event, "type")
    event_data = _value(event, "data", {}) or {}
    event_object = _value(event_data, "object", {}) or {}

    if event_type == "checkout.session.completed":
        metadata = _value(event_object, "metadata", {}) or {}
        plan = _value(metadata, "plan")
        email = _email(
            _value(metadata, "email")
            or _value(_value(event_object, "customer_details", {}), "email")
            or _value(event_object, "customer_email")
        )
        if (
            _value(event_object, "mode") == "subscription"
            and _value(event_object, "payment_status") in {"paid", "no_payment_required"}
            and plan in PLAN_PRODUCTS
            and email
        ):
            subscription = _value(event_object, "subscription")
            status = _value(subscription, "status") or "active"
            _persist_subscription(
                db,
                email=email,
                plan=plan,
                customer_id=_object_id(_value(event_object, "customer")),
                subscription_id=_object_id(subscription),
                status=str(status),
            )
    elif event_type == "customer.subscription.deleted":
        _set_stripe_status(db, event_object, deleted=True)
    elif event_type == "customer.subscription.updated":
        _set_stripe_status(db, event_object)

    return {"status": "success"}
