"""Voice requirement ingestion, transcription, and refinement routes."""

import asyncio
import json
import logging
import time
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.ai.keywords import get_repo_keywords
from app.ai.provider import OfflineDemoProvider, get_ai_provider
from app.ai.routing import AIStage, StageExecutionError, build_stage_router
from app.core.config import settings
from app.db.database import SessionLocal, get_db
from app.db.models import Repository

logger = logging.getLogger(__name__)

router = APIRouter(tags=["voice"])


def _get_live_voice_provider():
    try:
        provider = get_ai_provider()
    except ValueError as error:
        raise HTTPException(status_code=503, detail="Online AI provider is not configured for voice input.") from error
    if isinstance(provider, OfflineDemoProvider):
        raise HTTPException(
            status_code=503,
            detail="Voice transcription and refinement require a configured online AI provider.",
        )
    return provider


class RefineRequirementRequest(BaseModel):
    transcript: str
    target_language: str = "vi"


@router.post("/repositories/{repository_id}/voice-requirement")
async def process_voice_requirement(
    repository_id: str,
    file: UploadFile = File(...),
    language: str = Form("vi"),
    target_language: str = Form("vi"),
    db: Session = Depends(get_db),
):
    """
    Ingests spoken requirement audio, runs Stage A (transcribe) and Stage B (refine).
    Audio is discarded immediately after transcription; never persisted to disk or DB.
    """
    repo = db.query(Repository).filter(Repository.id == repository_id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    content_type = file.content_type or "audio/wav"
    audio_bytes = await file.read()
    if not audio_bytes or len(audio_bytes) < 64:
        raise HTTPException(status_code=400, detail="Audio payload is empty or invalid")

    max_bytes = 15 * 1024 * 1024  # 15 MB max audio upload
    if len(audio_bytes) > max_bytes:
        raise HTTPException(status_code=413, detail="Audio file exceeds 15MB limit")

    keywords = get_repo_keywords(db, repository_id, limit=30)
    router = build_stage_router(_get_live_voice_provider())

    t0 = time.perf_counter()
    transcribe_dur = 0.0
    refine_dur = 0.0

    try:
        # Stage A: Transcription
        t_a = time.perf_counter()
        asr_resp = router.execute(
            AIStage.VOICE_TRANSCRIPTION,
            "transcribe_audio",
            audio_bytes,
            content_type,
            language,
            keywords,
        )
        transcribe_dur = round(time.perf_counter() - t_a, 3)
        raw_transcript = asr_resp.data.get("text", "").strip()

        if not raw_transcript:
            raise HTTPException(status_code=502, detail="AI transcription returned an empty transcript. Please retry.")

        # Stage B: Refinement
        t_b = time.perf_counter()
        refine_resp = router.execute(
            AIStage.REQUIREMENT_REFINEMENT,
            "refine_requirement",
            raw_transcript,
            keywords,
            target_language,
        )
        refine_dur = round(time.perf_counter() - t_b, 3)
        refine_data = refine_resp.data

        total_dur = round(time.perf_counter() - t0, 3)

        return {
            "status": "success",
            "raw_transcript": raw_transcript,
            "refined_requirement": refine_data.get("refined_requirement") or raw_transcript,
            "ambiguities": refine_data.get("ambiguities") or [],
            "suggested_colors": refine_data.get("suggested_colors") or [],
            "suggested_options": refine_data.get("suggested_options") or [],
            "clarifications_made": refine_data.get("clarifications_made") or [],
            "refinement_error": refine_data.get("refinement_error"),
            "models_used": {
                "transcription": getattr(asr_resp, "model", settings.META_AI_ASR_MODEL),
                "refinement": getattr(refine_resp, "model", settings.META_AI_MODEL),
            },
            "durations_seconds": {
                "transcription": transcribe_dur,
                "refinement": refine_dur,
                "total": total_dur,
            },
            "keywords_used": keywords[:10],
        }
    except StageExecutionError as error:
        if error.stage == AIStage.REQUIREMENT_REFINEMENT and raw_transcript:
            logger.warning("Voice refinement failed (%s); returning preserved transcript", error.code)
            total_dur = round(time.perf_counter() - t0, 3)
            return {
                "status": "transcribed",
                "raw_transcript": raw_transcript,
                "refined_requirement": raw_transcript,
                "ambiguities": [],
                "suggested_colors": [],
                "suggested_options": [],
                "clarifications_made": [],
                "models_used": {
                    "transcription": getattr(asr_resp, "model", settings.META_AI_ASR_MODEL),
                    "refinement": "",
                },
                "durations_seconds": {
                    "transcription": transcribe_dur,
                    "refinement": 0,
                    "total": total_dur,
                },
                "keywords_used": keywords[:10],
                "refinement_error": "Online AI refinement failed. The transcript is preserved; retry refinement.",
            }
        raise HTTPException(status_code=503, detail="Online AI transcription failed. Please retry.") from error
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Voice processing error: %s", e)
        raise HTTPException(status_code=500, detail=f"Voice processing failed: {str(e)}")
    finally:
        del audio_bytes
        router.close()


@router.post("/repositories/{repository_id}/refine-requirement")
def refine_spoken_requirement(
    repository_id: str,
    payload: RefineRequirementRequest,
    db: Session = Depends(get_db),
):
    """
    Runs Stage B (requirement refinement) on the transcript returned by online ASR.
    """
    repo = db.query(Repository).filter(Repository.id == repository_id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    text = payload.transcript.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Transcript cannot be empty")

    keywords = get_repo_keywords(db, repository_id, limit=30)
    router = build_stage_router(_get_live_voice_provider())

    t0 = time.perf_counter()
    try:
        refine_resp = router.execute(
            AIStage.REQUIREMENT_REFINEMENT,
            "refine_requirement",
            text,
            keywords,
            payload.target_language,
        )
        duration = round(time.perf_counter() - t0, 3)
        refine_data = refine_resp.data

        return {
            "status": "success",
            "raw_transcript": text,
            "refined_requirement": refine_data.get("refined_requirement") or text,
            "ambiguities": refine_data.get("ambiguities") or [],
            "suggested_colors": refine_data.get("suggested_colors") or [],
            "suggested_options": refine_data.get("suggested_options") or [],
            "clarifications_made": refine_data.get("clarifications_made") or [],
            "refinement_error": refine_data.get("refinement_error"),
            "models_used": {
                "refinement": getattr(refine_resp, "model", settings.META_AI_MODEL),
            },
            "duration_seconds": duration,
            "keywords_used": keywords[:10],
        }
    except StageExecutionError as error:
        logger.warning("Standalone voice refinement failed (%s); returning preserved transcript", error.code)
        duration = round(time.perf_counter() - t0, 3)
        return {
            "status": "transcribed",
            "raw_transcript": text,
            "refined_requirement": text,
            "ambiguities": [],
            "suggested_colors": [],
            "suggested_options": [],
            "clarifications_made": [],
            "models_used": {"refinement": ""},
            "duration_seconds": duration,
            "keywords_used": keywords[:10],
            "refinement_error": "Online AI refinement failed. The transcript is preserved; retry refinement.",
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Refinement error: %s", e)
        raise HTTPException(status_code=500, detail=f"Refinement failed: {str(e)}")
    finally:
        router.close()


@router.websocket("/repositories/{repository_id}/voice-stream")
async def voice_streaming_socket(websocket: WebSocket, repository_id: str):
    """
    Realtime WebSocket streaming proxy for audio input.
    Uses the exact same META_AI_API_KEY as the LLM provider to stream to
    Meta ASR realtime WebSocket (wss://api.meta.ai/v1/asr/realtime).
    Accepts binary PCM chunks (16kHz, 16-bit mono), buffers, and yields
    live partial transcripts. Gracefully handles network and provider fallback.
    """
    await websocket.accept()

    db = SessionLocal()
    try:
        repo = db.query(Repository).filter(Repository.id == repository_id).first()
        if not repo:
            await websocket.send_text(json.dumps({"type": "error", "message": "Repository not found"}))
            await websocket.close()
            return
        keywords = get_repo_keywords(db, repository_id, limit=20)
    finally:
        db.close()

    try:
        live_provider = _get_live_voice_provider()
        provider_client = getattr(live_provider, "client", None)
        if provider_client is not None:
            provider_client.close()
    except HTTPException as error:
        await websocket.send_text(json.dumps({"type": "error", "message": error.detail}))
        await websocket.close(code=1011)
        return

    language_names = {
        "vi": "Vietnamese", "en": "English", "ja": "Japanese", "ko": "Korean",
        "zh": "Mandarin Chinese", "fr": "French", "de": "German", "es": "Spanish",
        "hi": "Hindi", "th": "Thai", "it": "Italian", "ru": "Russian",
    }
    language = websocket.query_params.get("language", "vi").lower().replace("_", "-").split("-", 1)[0]
    request_data = {
        "authorization": {"accessToken": f"Bearer {settings.META_AI_API_KEY}"},
        "audioEncoding": "PCM_16KHZ",
        "model": settings.META_AI_ASR_MODEL,
        "mode": "PUSH_TO_TALK",
        "partialMode": "CUMULATIVE",
        "emitAudioProgress": False,
    }
    if language_names.get(language):
        request_data["languageBias"] = [language_names[language]]
    valid_keywords = [
        keyword.strip() for keyword in keywords
        if isinstance(keyword, str) and keyword.strip() and len(keyword.strip()) <= 30
    ]
    if valid_keywords:
        request_data["keywords"] = valid_keywords[:30]

    try:
        import websockets

        async with websockets.connect(settings.META_AI_ASR_WS_URL, open_timeout=10.0) as meta_ws:
            # Meta realtime auth is carried in the first JSON frame, not an HTTP header.
            await meta_ws.send(json.dumps(request_data))
            handshake = json.loads(await asyncio.wait_for(meta_ws.recv(), timeout=10.0))
            if not isinstance(handshake, dict) or not handshake.get("sessionId"):
                raise RuntimeError("Meta realtime ASR handshake was rejected")

            async def relay_events() -> None:
                async for message in meta_ws:
                    if not isinstance(message, str):
                        continue
                    event = json.loads(message)
                    event_type = event.get("type")
                    if event_type == "transcript" and isinstance(event.get("transcript"), str):
                        await websocket.send_text(json.dumps({
                            "type": "transcript",
                            "transcript": event["transcript"],
                            "final": bool(event.get("final")),
                        }))
                    elif event_type == "error":
                        await websocket.send_text(json.dumps({
                            "type": "error",
                            "message": event.get("message") or "Online AI transcription failed. Please retry.",
                        }))
                        return

            relay_task = asyncio.create_task(relay_events())
            await websocket.send_text(json.dumps({"type": "ready"}))

            while True:
                data = await websocket.receive()
                if data.get("bytes"):
                    await meta_ws.send(data["bytes"])
                elif data.get("text"):
                    msg = json.loads(data["text"])
                    if msg.get("action") == "stop":
                        await meta_ws.send(json.dumps({"type": "endStream"}))
                        await relay_task
                        await websocket.send_text(json.dumps({"type": "done"}))
                        break
            if not relay_task.done():
                await relay_task
    except WebSocketDisconnect:
        logger.info("Voice streaming socket disconnected by client")
    except Exception as e:
        logger.warning("Voice streaming socket error (%s)", type(e).__name__)
        try:
            await websocket.send_text(json.dumps({"type": "error", "message": "Online AI transcription failed. Please retry."}))
        except Exception:
            pass
    finally:
        try:
            await websocket.close()
        except Exception:
            pass
