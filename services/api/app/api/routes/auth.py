import logging
import asyncio
import hashlib
import random
import secrets
import smtplib
import string
from datetime import datetime, timezone, timedelta
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, EmailStr
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.database import get_db
from app.db.models import User, OtpCode
from app.jobs.queue import get_cache, set_cache
from app.core.sessions import issue_session_token, revoke_session, require_session_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _hash_password(password: str) -> str:
    import hashlib
    salt = secrets.token_hex(16)
    pw_hash = hashlib.sha256((salt + password).encode()).hexdigest()
    return f"{salt}:{pw_hash}"

def _verify_password(password: str, password_hash: str) -> bool:
    import hashlib
    try:
        salt, pw_hash = password_hash.split(":", 1)
        return hashlib.sha256((salt + password).encode()).hexdigest() == pw_hash
    except Exception:
        return False

def _generate_otp() -> str:
    return "".join(random.choices(string.digits, k=6))

def _send_otp_email(to_email: str, otp: str, name: str = "") -> bool:
    """Send OTP via Resend HTTPS or SMTP; only local development may log the code."""
    subject = "ScopeGraph – Your verification code"
    body_html = f"""
<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#F7F8F5;border-radius:16px">
  <h2 style="font-size:20px;font-weight:700;color:#151923;margin-bottom:8px">Verify your email</h2>
  <p style="color:#8B929E;font-size:14px;margin-bottom:24px">
    Hi{f' {name}' if name else ''}! Enter this code to complete your ScopeGraph registration.
  </p>
  <div style="background:#fff;border-radius:12px;border:1px solid #E4E7E1;padding:24px;text-align:center;letter-spacing:8px;font-size:32px;font-weight:700;color:#151923">
    {otp}
  </div>
  <p style="color:#8B929E;font-size:12px;margin-top:16px">
    This code expires in 10 minutes. If you didn't request this, you can safely ignore this email.
  </p>
</div>
"""

    if settings.RESEND_API_KEY:
        try:
            response = httpx.post(
                "https://api.resend.com/emails",
                headers={"Authorization": f"Bearer {settings.RESEND_API_KEY}"},
                json={
                    "from": settings.SMTP_FROM,
                    "to": [to_email],
                    "subject": subject,
                    "html": body_html,
                },
                timeout=10.0,
            )
            if response.is_success:
                logger.info("Registration verification email accepted by provider for %s", to_email)
                return True
            logger.warning(
                "Email provider rejected verification email for %s (HTTP %s)",
                to_email,
                response.status_code,
            )
            return False
        except httpx.HTTPError as exc:
            logger.warning("Email provider request failed for %s (%s)", to_email, type(exc).__name__)
            return False

    if not settings.SMTP_HOST or not settings.SMTP_USER:
        if settings.ENVIRONMENT.lower() != "production":
            logger.info("=== DEV OTP for %s: %s ===", to_email, otp)
            return True
        logger.error("Registration email is unavailable because email delivery is not configured")
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = settings.SMTP_FROM
        msg["To"] = to_email
        msg.attach(MIMEText(body_html, "html"))

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as smtp:
            if settings.SMTP_USE_TLS:
                smtp.starttls()
            smtp.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            smtp.sendmail(settings.SMTP_FROM, [to_email], msg.as_string())
        return True
    except Exception as exc:
        logger.warning("Failed to send OTP email to %s: %r", to_email, exc)
        return False

def _normalize_email(email: str) -> str:
    return email.strip().lower()


class GitHubAuthRequest(BaseModel):
    code: str = Field(description="GitHub authorization code")
    redirect_uri: str | None = Field(default=None, description="Optional custom redirect URI")

class GitHubUrlResponse(BaseModel):
    url: str
    client_id: str

class GoogleAuthRequest(BaseModel):
    code: str = Field(description="Google authorization code")
    redirect_uri: str | None = Field(default=None, description="Optional custom redirect URI")

class GoogleUrlResponse(BaseModel):
    url: str
    client_id: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    username: str | None = None
    avatar_url: str | None = None
    provider: str = "github"

class AuthResponse(BaseModel):
    user: UserResponse
    access_token: str
    token_type: str = "bearer"

@router.get("/github/url", response_model=GitHubUrlResponse)
async def get_github_auth_url():
    """Generate GitHub OAuth authorize URL."""
    if not settings.GITHUB_CLIENT_ID:
        raise HTTPException(
            status_code=400,
            detail="GitHub OAuth is not configured. Please set GITHUB_CLIENT_ID in your .env file."
        )
    
    scope = "read:user user:email repo"
    url = (
        f"https://github.com/login/oauth/authorize"
        f"?client_id={settings.GITHUB_CLIENT_ID}"
        f"&redirect_uri={settings.GITHUB_REDIRECT_URI}"
        f"&scope={scope}"
    )
    return GitHubUrlResponse(url=url, client_id=settings.GITHUB_CLIENT_ID)

@router.post("/github", response_model=AuthResponse)
async def exchange_github_code(req: GitHubAuthRequest):
    """Exchange authorization code for access token and user profile."""
    if not settings.GITHUB_CLIENT_ID or not settings.GITHUB_CLIENT_SECRET:
        raise HTTPException(
            status_code=400,
            detail="GitHub OAuth is not configured. Please set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in .env."
        )

    redirect_uri = req.redirect_uri or settings.GITHUB_REDIRECT_URI

    async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
        # 1. Exchange code for access_token with retry
        token_data = None
        for attempt in range(3):
            try:
                token_resp = await client.post(
                    "https://github.com/login/oauth/access_token",
                    headers={"Accept": "application/json"},
                    data={
                        "client_id": settings.GITHUB_CLIENT_ID,
                        "client_secret": settings.GITHUB_CLIENT_SECRET,
                        "code": req.code,
                        "redirect_uri": redirect_uri,
                    },
                    timeout=15.0,
                )
                if token_resp.status_code == 200:
                    token_data = token_resp.json()
                    break
            except Exception as exc:
                logger.warning("Attempt %s to exchange GitHub code failed: %r", attempt + 1, exc)
                if attempt < 2:
                    await asyncio.sleep(0.5)

        if not token_data:
            logger.error("Failed to connect to GitHub OAuth server after 3 attempts")
            raise HTTPException(status_code=502, detail="Failed to connect to GitHub OAuth server")

        if "error" in token_data:
            error_desc = token_data.get("error_description", token_data["error"])
            logger.warning("GitHub OAuth token error: %s", error_desc)
            raise HTTPException(status_code=400, detail=f"GitHub OAuth error: {error_desc}")

        gh_token = token_data.get("access_token")
        if not gh_token:
            raise HTTPException(status_code=400, detail="No access token returned by GitHub")

        # 2. Fetch User Profile with retry
        gh_headers = {
            "Authorization": f"Bearer {gh_token}",
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "ScopeGraph-App/1.0",
        }

        user_data = None
        for attempt in range(3):
            try:
                user_resp = await client.get("https://api.github.com/user", headers=gh_headers, timeout=15.0)
                if user_resp.status_code == 200:
                    user_data = user_resp.json()
                    break
                else:
                    logger.warning("GitHub user endpoint returned status %s (attempt %s)", user_resp.status_code, attempt + 1)
            except Exception as exc:
                logger.warning("Attempt %s to fetch GitHub user profile failed: %r", attempt + 1, exc)
                if attempt < 2:
                    await asyncio.sleep(0.5)

        # 3. Handle user profile (graceful fallback if GitHub API is unreachable)
        if user_data:
            username = user_data.get("login")
            name = user_data.get("name") or username
            avatar_url = user_data.get("avatar_url")
            email = user_data.get("email")
            user_id = str(user_data.get("id"))

            # 4. If email is private, fetch primary verified email from /user/emails
            if not email:
                try:
                    emails_resp = await client.get("https://api.github.com/user/emails", headers=gh_headers, timeout=10.0)
                    if emails_resp.status_code == 200:
                        emails_data = emails_resp.json()
                        for em in emails_data:
                            if em.get("primary") and em.get("verified"):
                                email = em.get("email")
                                break
                        if not email and emails_data:
                            email = emails_data[0].get("email")
                except Exception as e:
                    logger.warning("Could not fetch user emails from GitHub: %r", e)

            if not email:
                email = f"{username}@users.noreply.github.com"
        else:
            logger.warning("GitHub API user profile request failed after 3 attempts; creating fallback profile")
            username = "github_user"
            name = "GitHub Developer"
            email = f"{username}@users.noreply.github.com"
            avatar_url = None
            user_id = "gh_user"

        logger.info("Successfully authenticated GitHub user: %s (%s)", username, email)

        return AuthResponse(
            user=UserResponse(
                id=user_id,
                email=email,
                name=name,
                username=username,
                avatar_url=avatar_url,
                provider="github",
            ),
            access_token=gh_token,
        )

@router.get("/google/url", response_model=GoogleUrlResponse)
async def get_google_auth_url(redirect_uri: str | None = None):
    """Generate Google OAuth authorize URL."""
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=400,
            detail="Google OAuth is not configured. Please set GOOGLE_CLIENT_ID in your .env file."
        )

    target_redirect = redirect_uri or settings.GOOGLE_REDIRECT_URI
    scope = "openid email profile"
    url = (
        f"https://accounts.google.com/o/oauth2/v2/auth"
        f"?client_id={settings.GOOGLE_CLIENT_ID}"
        f"&redirect_uri={target_redirect}"
        f"&response_type=code"
        f"&scope={scope}"
        f"&access_type=offline"
        f"&prompt=select_account"
    )
    return GoogleUrlResponse(url=url, client_id=settings.GOOGLE_CLIENT_ID)

@router.post("/google", response_model=AuthResponse)
async def exchange_google_code(req: GoogleAuthRequest):
    """Exchange authorization code for Google access token and user profile."""
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        raise HTTPException(
            status_code=400,
            detail="Google OAuth is not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env."
        )

    redirect_uri = req.redirect_uri or settings.GOOGLE_REDIRECT_URI

    async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
        # 1. Exchange code for access_token with retry
        token_data = None
        for attempt in range(3):
            try:
                token_resp = await client.post(
                    "https://oauth2.googleapis.com/token",
                    data={
                        "client_id": settings.GOOGLE_CLIENT_ID,
                        "client_secret": settings.GOOGLE_CLIENT_SECRET,
                        "code": req.code,
                        "grant_type": "authorization_code",
                        "redirect_uri": redirect_uri,
                    },
                    headers={"Accept": "application/json"},
                    timeout=15.0,
                )
                if token_resp.status_code == 200:
                    token_data = token_resp.json()
                    break
                else:
                    logger.warning(
                        "Google token endpoint returned status %s: %s (attempt %s)",
                        token_resp.status_code,
                        token_resp.text,
                        attempt + 1
                    )
            except Exception as exc:
                logger.warning("Attempt %s to exchange Google code failed: %r", attempt + 1, exc)
                if attempt < 2:
                    await asyncio.sleep(0.5)

        if not token_data:
            logger.error("Failed to connect to Google OAuth server after 3 attempts")
            raise HTTPException(status_code=502, detail="Failed to connect to Google OAuth server")

        if "error" in token_data:
            error_desc = token_data.get("error_description", token_data["error"])
            logger.warning("Google OAuth token error: %s", error_desc)
            raise HTTPException(status_code=400, detail=f"Google OAuth error: {error_desc}")

        access_token = token_data.get("access_token")
        if not access_token:
            raise HTTPException(status_code=400, detail="No access token returned by Google")

        # 2. Fetch User Profile
        user_headers = {"Authorization": f"Bearer {access_token}"}
        user_data = None
        for attempt in range(3):
            try:
                user_resp = await client.get(
                    "https://www.googleapis.com/oauth2/v3/userinfo",
                    headers=user_headers,
                    timeout=15.0
                )
                if user_resp.status_code == 200:
                    user_data = user_resp.json()
                    break
                else:
                    logger.warning("Google userinfo endpoint returned status %s (attempt %s)", user_resp.status_code, attempt + 1)
            except Exception as exc:
                logger.warning("Attempt %s to fetch Google user profile failed: %r", attempt + 1, exc)
                if attempt < 2:
                    await asyncio.sleep(0.5)

        if not user_data:
            logger.error("Failed to fetch Google user profile after 3 attempts")
            raise HTTPException(status_code=502, detail="Failed to fetch Google user profile")

        sub = str(user_data.get("sub", ""))
        email = user_data.get("email") or f"{sub}@gmail.com"
        name = user_data.get("name") or user_data.get("given_name") or "Google User"
        avatar_url = user_data.get("picture")
        username = email.split("@")[0] if "@" in email else (sub or "google_user")

        logger.info("Successfully authenticated Google user: %s (%s)", username, email)

        return AuthResponse(
            user=UserResponse(
                id=sub or "google_user",
                email=email,
                name=name,
                username=username,
                avatar_url=avatar_url,
                provider="google",
            ),
            access_token=access_token,
        )

class GitHubRepoItem(BaseModel):
    id: int
    name: str
    full_name: str
    private: bool
    html_url: str
    clone_url: str
    description: str | None = None
    default_branch: str = "main"
    language: str | None = None
    updated_at: str | None = None

@router.get("/github/repos", response_model=list[GitHubRepoItem])
async def list_user_github_repos(token: str | None = None, refresh: bool = False):
    """
    List public and private GitHub repositories of the authenticated user.
    Uses Redis caching (5 min TTL) for instant response times.
    """
    if not token:
        raise HTTPException(status_code=401, detail="GitHub access token is required")

    cache_key = f"gh_repos:{hashlib.sha256(token.encode()).hexdigest()[:16]}"
    if not refresh:
        cached_data = get_cache(cache_key)
        if cached_data and isinstance(cached_data, list):
            return [GitHubRepoItem(**item) for item in cached_data]

    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "ScopeGraph-App/1.0",
    }

    # Fast connect timeout (5s) and bounded read timeout (12s)
    timeout_cfg = httpx.Timeout(12.0, connect=5.0)

    async with httpx.AsyncClient(timeout=timeout_cfg, follow_redirects=True) as client:
        last_exc = None
        for attempt in range(3):
            try:
                resp = await client.get(
                    "https://api.github.com/user/repos",
                    headers=headers,
                    params={"sort": "updated", "per_page": 100, "affiliation": "owner,collaborator,organization_member"},
                )
                if resp.status_code == 200:
                    repos = resp.json()
                    items = []
                    for r in repos:
                        items.append(
                            GitHubRepoItem(
                                id=r.get("id"),
                                name=r.get("name"),
                                full_name=r.get("full_name"),
                                private=r.get("private", False),
                                html_url=r.get("html_url", ""),
                                clone_url=r.get("clone_url", ""),
                                description=r.get("description"),
                                default_branch=r.get("default_branch", "main"),
                                language=r.get("language"),
                                updated_at=r.get("updated_at"),
                            )
                        )
                    # Cache in Redis with 300s TTL for instant subsequent loads
                    set_cache(cache_key, [item.model_dump() for item in items], ttl_seconds=300)
                    return items
                elif resp.status_code in (401, 403):
                    logger.warning("GitHub API /user/repos rejected token: %s", resp.text)
                    raise HTTPException(status_code=resp.status_code, detail="Invalid or expired GitHub access token. Please reconnect your account.")
                else:
                    logger.warning("GitHub API /user/repos attempt %d failed with status %s: %s", attempt + 1, resp.status_code, resp.text)
            except HTTPException:
                raise
            except (httpx.TimeoutException, httpx.NetworkError) as net_err:
                last_exc = net_err
                logger.warning("GitHub API /user/repos retry %d/3 after network error: %r", attempt + 1, net_err)
                if attempt < 2:
                    await asyncio.sleep(0.3)
            except Exception as exc:
                last_exc = exc
                break

        # Fallback to cache even if expired if GitHub has network timeout
        fallback_data = get_cache(cache_key)
        if fallback_data and isinstance(fallback_data, list):
            logger.info("Serving stale cached GitHub repos after network error")
            return [GitHubRepoItem(**item) for item in fallback_data]

        logger.error("Error fetching repositories from GitHub after retries: %r", last_exc)
        raise HTTPException(status_code=502, detail=f"Error connecting to GitHub: {str(last_exc or 'Timeout')}")


# ---------------------------------------------------------------------------
# Email / Password Authentication Endpoints
# ---------------------------------------------------------------------------

class RegisterRequest(BaseModel):
    email: str = Field(min_length=3, max_length=254)
    name: str = Field(min_length=1, max_length=255)
    password: str = Field(min_length=8, max_length=128)

class VerifyOtpRequest(BaseModel):
    email: str = Field(min_length=3, max_length=254)
    otp: str = Field(min_length=6, max_length=6)
    name: str = Field(default="", max_length=255)
    password: str = Field(default="", max_length=128)

class LoginRequest(BaseModel):
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=1, max_length=128)

class EmailAuthResponse(BaseModel):
    user: UserResponse
    access_token: str
    token_type: str = "bearer"
    is_new_user: bool = False
    onboarding_completed: bool = False

class CheckEmailResponse(BaseModel):
    exists: bool
    provider: str | None = None

class ResendOtpRequest(BaseModel):
    email: str = Field(min_length=3, max_length=254)
    name: str = Field(default="", max_length=255)


@router.get("/check-email", response_model=CheckEmailResponse)
def check_email(email: str, db: Session = Depends(get_db)):
    """Check if an email already has an account."""
    normalized = _normalize_email(email)
    user = db.query(User).filter(User.email == normalized).first()
    if not user:
        return CheckEmailResponse(exists=False)
    return CheckEmailResponse(exists=True, provider=user.provider)


@router.post("/register/send-otp")
def register_send_otp(req: RegisterRequest, db: Session = Depends(get_db)):
    """
    Step 1 of registration: validate inputs and send OTP to email.
    Does NOT create the user yet — user is created only after OTP is verified.
    """
    normalized_email = _normalize_email(req.email)

    existing = db.query(User).filter(User.email == normalized_email).first()
    if existing:
        if existing.provider != "email":
            raise HTTPException(
                status_code=409,
                detail=f"This email is already linked to a {existing.provider.title()} account. Please sign in with {existing.provider.title()}."
            )
        if existing.is_verified:
            raise HTTPException(status_code=409, detail="An account with this email already exists. Please log in.")

    # Rate-limit: max 3 OTPs per email per 10 minutes
    from app.db.models import utc_now as _utc_now
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=10)
    recent_count = (
        db.query(OtpCode)
        .filter(OtpCode.email == normalized_email, OtpCode.created_at >= cutoff, OtpCode.purpose == "registration")
        .count()
    )
    if recent_count >= 3:
        raise HTTPException(status_code=429, detail="Too many verification attempts. Please wait a few minutes and try again.")

    # Invalidate previous unused OTPs for this email
    db.query(OtpCode).filter(
        OtpCode.email == normalized_email,
        OtpCode.purpose == "registration",
        OtpCode.used == False,
    ).delete()

    otp_code = _generate_otp()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
    otp = OtpCode(email=normalized_email, code=otp_code, purpose="registration", expires_at=expires_at)
    db.add(otp)
    db.commit()

    if not _send_otp_email(normalized_email, otp_code, req.name):
        db.delete(otp)
        db.commit()
        raise HTTPException(
            status_code=503,
            detail="Could not deliver the verification email. Please try again later.",
        )
    logger.info("Registration verification email delivered to %s", normalized_email)
    return {"message": "Verification code sent to your email.", "email": normalized_email}


@router.post("/register/verify-otp", response_model=EmailAuthResponse)
def register_verify_otp(req: VerifyOtpRequest, db: Session = Depends(get_db)):
    """
    Step 2 of registration: verify OTP, then create the user account.
    """
    normalized_email = _normalize_email(req.email)

    otp_record = (
        db.query(OtpCode)
        .filter(
            OtpCode.email == normalized_email,
            OtpCode.purpose == "registration",
            OtpCode.used == False,
        )
        .order_by(OtpCode.created_at.desc())
        .first()
    )

    if not otp_record:
        raise HTTPException(status_code=400, detail="No pending verification found for this email. Please request a new code.")

    if datetime.now(timezone.utc) > otp_record.expires_at.replace(tzinfo=timezone.utc) if otp_record.expires_at.tzinfo is None else otp_record.expires_at:
        raise HTTPException(status_code=400, detail="Verification code has expired. Please request a new one.")

    if otp_record.code != req.otp.strip():
        raise HTTPException(status_code=400, detail="Invalid verification code. Please check and try again.")

    # Mark OTP as used
    otp_record.used = True

    # Check if user was already created (partial retry)
    user = db.query(User).filter(User.email == normalized_email).first()
    if user and user.is_verified:
        token = issue_session_token(user)
        db.commit()
        return EmailAuthResponse(
            user=UserResponse(id=user.id, email=user.email, name=user.name, provider=user.provider),
            access_token=token,
            is_new_user=False,
            onboarding_completed=user.onboarding_completed,
        )

    if user:
        # Unverified partial record — update it
        user.is_verified = True
        if req.name:
            user.name = req.name
        if req.password:
            user.password_hash = _hash_password(req.password)
    else:
        if not req.password:
            raise HTTPException(status_code=400, detail="Password is required to create your account.")
        user = User(
            email=normalized_email,
            name=req.name or normalized_email.split("@")[0],
            password_hash=_hash_password(req.password),
            is_verified=True,
            provider="email",
            onboarding_completed=False,
        )
        db.add(user)

    db.commit()
    db.refresh(user)

    token = issue_session_token(user)
    db.commit()
    logger.info("User registered successfully: %s", normalized_email)
    return EmailAuthResponse(
        user=UserResponse(id=user.id, email=user.email, name=user.name, provider=user.provider),
        access_token=token,
        is_new_user=True,
        onboarding_completed=False,
    )


@router.post("/login", response_model=EmailAuthResponse)
def email_login(req: LoginRequest, db: Session = Depends(get_db)):
    """Login with email and password."""
    normalized_email = _normalize_email(req.email)
    user = db.query(User).filter(User.email == normalized_email).first()

    if not user:
        raise HTTPException(status_code=401, detail="No account found with this email. Please register first.")

    if user.provider != "email":
        raise HTTPException(
            status_code=409,
            detail=f"This account uses {user.provider.title()} sign-in. Please use the {user.provider.title()} button to log in."
        )

    if not user.is_verified:
        raise HTTPException(status_code=403, detail="Please verify your email before logging in. Check your inbox for a verification code.")

    if not user.password_hash or not _verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect password. Please try again.")

    token = issue_session_token(user)
    db.commit()
    logger.info("User logged in: %s", normalized_email)
    return EmailAuthResponse(
        user=UserResponse(id=user.id, email=user.email, name=user.name, provider=user.provider),
        access_token=token,
        is_new_user=False,
        onboarding_completed=user.onboarding_completed,
    )


@router.post("/resend-otp")
def resend_otp(req: ResendOtpRequest, db: Session = Depends(get_db)):
    """Resend OTP verification code."""
    normalized_email = _normalize_email(req.email)

    # Rate-limit
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=10)
    recent_count = (
        db.query(OtpCode)
        .filter(OtpCode.email == normalized_email, OtpCode.created_at >= cutoff, OtpCode.purpose == "registration")
        .count()
    )
    if recent_count >= 3:
        raise HTTPException(status_code=429, detail="Too many attempts. Please wait a few minutes before trying again.")

    # Invalidate old OTPs
    db.query(OtpCode).filter(
        OtpCode.email == normalized_email,
        OtpCode.purpose == "registration",
        OtpCode.used == False,
    ).delete()

    otp_code = _generate_otp()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
    otp = OtpCode(email=normalized_email, code=otp_code, purpose="registration", expires_at=expires_at)
    db.add(otp)
    db.commit()

    if not _send_otp_email(normalized_email, otp_code, req.name):
        db.delete(otp)
        db.commit()
        raise HTTPException(
            status_code=503,
            detail="Could not deliver the verification email. Please try again later.",
        )
    logger.info("Registration verification email resent to %s", normalized_email)
    return {"message": "New verification code sent.", "email": normalized_email}


@router.post("/oauth/complete-profile")
def oauth_complete_onboarding(
    payload: dict,
    db: Session = Depends(get_db),
):
    """
    Called by OAuth callback to upsert a user record and return whether
    they are a new user (need onboarding) or returning (go to dashboard).
    """
    email = _normalize_email(payload.get("email", ""))
    provider = payload.get("provider", "")
    name = payload.get("name") or ""
    avatar_url = payload.get("avatar_url")
    username = payload.get("username")
    provider_token = payload.get("access_token")

    if not email or not provider:
        raise HTTPException(status_code=422, detail="email and provider are required")
    if provider not in {"github", "google"} or not provider_token:
        raise HTTPException(status_code=401, detail="OAuth verification is required")
    try:
        if provider == "github":
            headers = {"Authorization": f"Bearer {provider_token}", "Accept": "application/vnd.github+json"}
            profile_response = httpx.get("https://api.github.com/user", headers=headers, timeout=8.0)
            emails_response = httpx.get("https://api.github.com/user/emails", headers=headers, timeout=8.0)
            profile_response.raise_for_status()
            emails_response.raise_for_status()
            profile = profile_response.json()
            verified_emails = {
                item.get("email", "").strip().lower()
                for item in emails_response.json()
                if isinstance(item, dict) and item.get("verified") is True
            }
            if email not in verified_emails:
                raise HTTPException(status_code=401, detail="OAuth account does not match the submitted email")
        else:
            profile_response = httpx.get(
                "https://www.googleapis.com/oauth2/v3/userinfo",
                headers={"Authorization": f"Bearer {provider_token}"}, timeout=8.0,
            )
            profile_response.raise_for_status()
            profile = profile_response.json()
            if profile.get("email_verified") is not True or str(profile.get("email", "")).strip().lower() != email:
                raise HTTPException(status_code=401, detail="OAuth account does not match the submitted email")
    except HTTPException:
        raise
    except httpx.HTTPError as error:
        logger.warning("OAuth session validation failed (%s)", type(error).__name__)
        raise HTTPException(status_code=401, detail="Could not verify OAuth account") from None

    user = db.query(User).filter(User.email == email).first()

    is_new = False
    if not user:
        user = User(
            email=email,
            name=name or email.split("@")[0],
            is_verified=True,
            provider=provider,
            avatar_url=avatar_url,
            username=username,
            onboarding_completed=False,
        )
        db.add(user)
        is_new = True
    else:
        # Update profile data from provider if not already set
        if not user.avatar_url and avatar_url:
            user.avatar_url = avatar_url
        if not user.username and username:
            user.username = username

    db.commit()
    db.refresh(user)
    session_token = issue_session_token(user)
    db.commit()

    return {
        "is_new_user": is_new,
        "onboarding_completed": user.onboarding_completed,
        "user_id": user.id,
        "session_token": session_token,
    }


@router.post("/mark-onboarded")
def mark_onboarded(email: str, db: Session = Depends(get_db)):
    """Mark a user's onboarding as complete."""
    normalized_email = _normalize_email(email)
    user = db.query(User).filter(User.email == normalized_email).first()
    if user:
        user.onboarding_completed = True
        db.commit()
    return {"ok": True}


@router.post("/logout")
def logout_session(user: User = Depends(require_session_user), db: Session = Depends(get_db)):
    revoke_session(user)
    db.commit()
    return {"ok": True}
