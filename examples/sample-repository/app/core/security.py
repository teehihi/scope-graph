import hashlib
import hmac
import time
from app.core.config import settings

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return hmac.compare_digest(hash_password(plain_password), hashed_password)

def generate_signed_token(user_id: int, action: str, expires_in_seconds: int = 3600) -> str:
    timestamp = int(time.time()) + expires_in_seconds
    raw = f"{user_id}:{action}:{timestamp}:{settings.SECRET_KEY}"
    sig = hashlib.sha256(raw.encode()).hexdigest()
    return f"{user_id}.{timestamp}.{sig}"

def verify_signed_token(token: str, action: str) -> int | None:
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None
        user_id_str, timestamp_str, sig = parts
        user_id = int(user_id_str)
        timestamp = int(timestamp_str)
        if time.time() > timestamp:
            return None
        expected_raw = f"{user_id}:{action}:{timestamp}:{settings.SECRET_KEY}"
        expected_sig = hashlib.sha256(expected_raw.encode()).hexdigest()
        if hmac.compare_digest(sig, expected_sig):
            return user_id
    except Exception:
        return None
    return None
