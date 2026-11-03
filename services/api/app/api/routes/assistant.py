import logging
import re
import time
import unicodedata
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


_LOCAL_SMALLTALK = {
    "en": {
        "greeting": "Hi! I’m Scout, your ScopeGraph assistant. Ask me about dependency graphs, impact analysis, or MCP.",
        "thanks": "You’re welcome! Let me know if you have a question about ScopeGraph.",
        "farewell": "See you later! I’ll be here when you need help with ScopeGraph.",
    },
    "vi": {
        "greeting": "Chào bạn! Mình là Scout, trợ lý ScopeGraph. Bạn cần hỏi gì về đồ thị phụ thuộc, phân tích tác động hay MCP?",
        "thanks": "Không có gì nha! Cứ hỏi mình nếu bạn cần tìm hiểu thêm về ScopeGraph.",
        "farewell": "Tạm biệt nha! Khi nào cần hỗ trợ về ScopeGraph thì gọi mình nhé.",
    },
    "ja": {"greeting": "こんにちは！ScopeGraphアシスタントのScoutです。依存関係グラフ、影響分析、MCPについてお手伝いします。", "thanks": "どういたしまして！ScopeGraphについて質問があれば聞いてください。", "farewell": "またお会いしましょう！ScopeGraphについて必要なときはいつでもどうぞ。"},
    "ko": {"greeting": "안녕하세요! ScopeGraph 도우미 Scout입니다. 의존성 그래프, 영향 분석, MCP에 대해 도와드릴게요.", "thanks": "천만에요! ScopeGraph에 대해 궁금한 점이 있으면 물어보세요.", "farewell": "안녕히 가세요! ScopeGraph 도움이 필요하면 언제든 찾아오세요."},
    "zh": {"greeting": "你好！我是 ScopeGraph 助手 Scout，可以帮你了解依赖图、影响分析和 MCP。", "thanks": "不客气！有 ScopeGraph 相关问题，随时问我。", "farewell": "再见！需要 ScopeGraph 帮助时随时来找我。"},
    "es": {"greeting": "¡Hola! Soy Scout, el asistente de ScopeGraph. Puedo ayudarte con grafos de dependencias, análisis de impacto y MCP.", "thanks": "¡De nada! Pregúntame si necesitas ayuda con ScopeGraph.", "farewell": "¡Hasta luego! Aquí estaré cuando necesites ayuda con ScopeGraph."},
    "fr": {"greeting": "Bonjour ! Je suis Scout, l’assistant ScopeGraph. Je peux vous aider avec les graphes de dépendances, l’analyse d’impact et MCP.", "thanks": "Avec plaisir ! Posez-moi vos questions sur ScopeGraph.", "farewell": "À bientôt ! Je serai là si vous avez besoin d’aide avec ScopeGraph."},
    "de": {"greeting": "Hallo! Ich bin Scout, der ScopeGraph-Assistent. Ich helfe bei Abhängigkeitsgraphen, Auswirkungsanalysen und MCP.", "thanks": "Gern geschehen! Frag mich, wenn du Hilfe zu ScopeGraph brauchst.", "farewell": "Bis bald! Wenn du Hilfe zu ScopeGraph brauchst, bin ich da."},
    "hi": {"greeting": "नमस्ते! मैं Scout, आपका ScopeGraph सहायक हूँ। मैं dependency graphs, impact analysis और MCP में मदद कर सकता हूँ।", "thanks": "आपका स्वागत है! ScopeGraph के बारे में कोई सवाल हो तो पूछें।", "farewell": "फिर मिलेंगे! ScopeGraph में मदद चाहिए तो वापस आएँ।"},
    "th": {"greeting": "สวัสดี! ฉัน Scout ผู้ช่วย ScopeGraph ช่วยตอบเรื่องกราฟ dependency, การวิเคราะห์ผลกระทบ และ MCP ได้", "thanks": "ยินดีเลย! ถ้ามีคำถามเกี่ยวกับ ScopeGraph ถามได้เสมอ", "farewell": "แล้วพบกันใหม่นะ ถ้าต้องการความช่วยเหลือเกี่ยวกับ ScopeGraph แวะมาได้เสมอ"},
    "it": {"greeting": "Ciao! Sono Scout, l’assistente di ScopeGraph. Posso aiutarti con grafi delle dipendenze, analisi d’impatto e MCP.", "thanks": "Prego! Chiedimi pure se hai bisogno di aiuto con ScopeGraph.", "farewell": "A presto! Sarò qui quando ti servirà aiuto con ScopeGraph."},
    "ru": {"greeting": "Здравствуйте! Я Scout, помощник ScopeGraph. Я помогу разобраться в графах зависимостей, анализе влияния и MCP.", "thanks": "Пожалуйста! Спрашивайте, если нужна помощь со ScopeGraph.", "farewell": "До встречи! Обращайтесь, если понадобится помощь со ScopeGraph."},
}

_LOCAL_VIETNAMESE_REPLY = {
    "en": "Yes! Ask me in Vietnamese and I’ll reply in Vietnamese.",
    "vi": "Được chứ! Bạn cứ hỏi bằng tiếng Việt, mình sẽ trả lời bằng tiếng Việt nha.",
    "ja": "はい！ベトナム語で質問していただければ、ベトナム語でお答えします。",
    "ko": "네! 베트남어로 질문하시면 베트남어로 답변할게요.",
    "zh": "当然可以！你可以用越南语提问，我会用越南语回答。",
    "es": "¡Sí! Pregúntame en vietnamita y te responderé en vietnamita.",
    "fr": "Oui ! Posez votre question en vietnamien et je vous répondrai en vietnamien.",
    "de": "Ja! Frag mich auf Vietnamesisch und ich antworte auf Vietnamesisch.",
    "hi": "हाँ! आप वियतनामी में पूछें, मैं वियतनामी में जवाब दूँगा।",
    "th": "ได้เลย! ถามเป็นภาษาเวียดนามได้ แล้วฉันจะตอบเป็นภาษาเวียดนาม",
    "it": "Sì! Chiedimi in vietnamita e ti risponderò in vietnamita.",
    "ru": "Да! Задавайте вопросы на вьетнамском, и я отвечу на вьетнамском.",
}


def _smalltalk_intent(message: str) -> str | None:
    """Match only standalone pleasantries so real questions still reach the assistant."""
    normalized = unicodedata.normalize("NFKD", message.casefold())
    normalized = normalized.replace("đ", "d")
    normalized = "".join(char for char in normalized if not unicodedata.combining(char))
    normalized = re.sub(r"[^\w\s]", " ", normalized, flags=re.UNICODE)
    normalized = " ".join(normalized.split())
    phrases = {
        "greeting": {"hi", "hello", "hey", "hiya", "howdy", "yo", "alo", "xin chao", "chao", "chao ban", "chao scout", "hello ba nha", "hi scout", "hey scout", "good morning", "good afternoon", "good evening"},
        "thanks": {"thanks", "thank you", "thx", "cam on", "cam on nha", "cam on ban", "merci", "gracias", "danke", "arigato", "cảm ơn"},
        "farewell": {"bye", "goodbye", "see you", "see ya", "tam biet", "hen gap lai", "good night"},
        "vietnamese": {"noi tieng viet duoc khong", "ban noi tieng viet khong", "do you speak vietnamese", "can you speak vietnamese", "speak vietnamese"},
    }
    for intent, candidates in phrases.items():
        if normalized in candidates:
            return intent
    return None


@router.post("/chat")
def chat(payload: ChatRequest, request: Request):
    _enforce_rate_limit(request.client.host if request.client else "unknown")
    message = payload.message.strip()
    if not message:
        raise HTTPException(status_code=422, detail="Message must not be blank")

    intent = _smalltalk_intent(message)
    if intent:
        if intent == "vietnamese":
            answer = _LOCAL_VIETNAMESE_REPLY.get(payload.language, _LOCAL_VIETNAMESE_REPLY["en"])
        else:
            language_replies = _LOCAL_SMALLTALK.get(payload.language, _LOCAL_SMALLTALK["en"])
            answer = language_replies[intent]
        return {
            "answer": answer,
            "grounded": True,
            "model": "local-smalltalk",
        }

    messages = [
        {"role": item.role, "content": item.content.strip()[:2000]}
        for item in payload.history[-12:]
        if item.content.strip()
    ]
    messages.append({"role": "user", "content": message})
    try:
        response = get_ai_provider().chat(messages, language=payload.language)
    except (ValueError, TimeoutError) as error:
        logger.warning("Assistant provider unavailable (%s): %s", type(error).__name__, error)
        raise HTTPException(status_code=503, detail="Assistant is temporarily unavailable") from None
    except Exception as error:
        logger.exception("Assistant request failed (%s)", type(error).__name__)
        raise HTTPException(status_code=502, detail="Assistant could not complete the request") from None

    grounded = response.data.get("grounded") is True
    answer = response.data.get("answer", "").strip() if grounded else ""
    if grounded and not answer:
        raise HTTPException(status_code=502, detail="Assistant returned an empty response")
    return {"answer": answer, "grounded": grounded, "model": response.model}
