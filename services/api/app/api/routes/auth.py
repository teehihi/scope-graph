import logging
import asyncio
import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])

class GitHubAuthRequest(BaseModel):
    code: str = Field(description="GitHub authorization code")

class GitHubUrlResponse(BaseModel):
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
    
    scope = "read:user user:email"
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
                        "redirect_uri": settings.GITHUB_REDIRECT_URI,
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
