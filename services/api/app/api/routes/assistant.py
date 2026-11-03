import logging
import time
from collections import defaultdict, deque
from threading import Lock
from typing import Literal

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field

from app.ai.provider import get_ai_provider

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/assistant", tags=["assistant"])

_REQUESTS_PER_MINUTE = 15
_request_times: dict[str, deque[float]] = defaultdict(deque)
_request_lock = Lock()


class ChatMessage(BaseModel):
    model_config = ConfigDict(extra="forbid")

    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=2000)


class ChatRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    message: str = Field(min_length=1, max_length=2000)
    history: list[ChatMessage] = Field(default_factory=list, max_length=12)
    language: Literal["en", "vi", "ja", "ko", "zh", "es", "fr", "de", "hi", "th", "it", "ru"] = "en"


def _enforce_rate_limit(client_key: str) -> None:
    now = time.monotonic()
    with _request_lock:
        recent = _request_times[client_key]
        while recent and now - recent[0] >= 60:
            recent.popleft()
        if len(recent) >= _REQUESTS_PER_MINUTE:
            raise HTTPException(status_code=429, detail="Assistant request limit reached")
        recent.append(now)
        if len(_request_times) > 10_000:
            stale_keys = [key for key, values in _request_times.items() if not values or now - values[-1] >= 60]
            for key in stale_keys:
                _request_times.pop(key, None)


@router.post("/chat")
def chat(payload: ChatRequest, request: Request):
    _enforce_rate_limit(request.client.host if request.client else "unknown")
    message = payload.message.strip()
    if not message:
        raise HTTPException(status_code=422, detail="Message must not be blank")

    messages = [
        {"role": item.role, "content": item.content.strip()[:2000]}
        for item in payload.history[-12:]
        if item.content.strip()
    ]
    messages.append({"role": "user", "content": message})
    try:
        response = get_ai_provider().chat(messages, language=payload.language)
    except (ValueError, TimeoutError) as error:
        logger.warning("Assistant provider unavailable (%s)", type(error).__name__)
        raise HTTPException(status_code=503, detail="Assistant is temporarily unavailable") from None
    except Exception as error:
        logger.exception("Assistant request failed (%s)", type(error).__name__)
        raise HTTPException(status_code=502, detail="Assistant could not complete the request") from None

    grounded = response.data.get("grounded") is True
    answer = response.data.get("answer", "").strip() if grounded else ""
    if grounded and not answer:
        raise HTTPException(status_code=502, detail="Assistant returned an empty response")
    return {"answer": answer, "grounded": grounded, "model": response.model}
