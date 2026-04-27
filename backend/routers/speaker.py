"""
SADAN Speaker Router
====================
Endpoints for speaker enrollment, verification, and management.

POST /api/speaker/enroll   — enroll a new speaker
GET  /api/speaker/list     — list enrolled speakers + enable status
DELETE /api/speaker/{name} — remove a speaker
POST /api/speaker/toggle   — enable / disable verification
POST /api/speaker/verify-test — test-only: verify base64 audio chunk
"""

import base64
import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from backend.services.speaker_verify import get_verifier

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/speaker", tags=["speaker"])


# ── request models ─────────────────────────────────────────────────────────────

class EnrollRequest(BaseModel):
    name: str
    audio_base64: str   # base64-encoded raw 16-bit PCM at 16 kHz

class ToggleRequest(BaseModel):
    enabled: bool

class VerifyTestRequest(BaseModel):
    audio_base64: str


# ── endpoints ──────────────────────────────────────────────────────────────────

@router.post("/enroll")
def enroll(req: EnrollRequest):
    """Enroll a speaker from raw PCM audio (base64-encoded)."""
    try:
        pcm = base64.b64decode(req.audio_base64)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid base64 audio")

    verifier = get_verifier()
    try:
        message = verifier.enroll(req.name, pcm)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"[SpeakerRouter] enroll error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Enrollment failed — see server logs")

    return {"success": True, "message": message, "name": req.name}


@router.get("/list")
def list_speakers():
    """Return the list of enrolled speakers and the enabled state."""
    verifier = get_verifier()
    return {
        "speakers": verifier.list_speakers(),
        "enabled":  verifier.enabled,
        "count":    len(verifier.list_speakers()),
    }


@router.delete("/{name}")
def remove_speaker(name: str):
    """Remove an enrolled speaker by name."""
    verifier = get_verifier()
    if name not in verifier.list_speakers():
        raise HTTPException(status_code=404, detail=f"Speaker '{name}' not found")
    verifier.remove(name)
    return {"success": True, "message": f"Speaker '{name}' removed"}


@router.post("/toggle")
def toggle(req: ToggleRequest):
    """Enable or disable speaker verification."""
    verifier = get_verifier()
    verifier.toggle(req.enabled)
    status = "מופעל" if req.enabled else "מושבת"
    return {
        "enabled": verifier.enabled,
        "message": f"זיהוי קולי {status}",
    }


@router.post("/verify-test")
def verify_test(req: VerifyTestRequest):
    """
    Test endpoint: verify a base64-encoded audio chunk against enrolled speakers.
    Returns score and best match name.
    """
    try:
        pcm = base64.b64decode(req.audio_base64)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid base64 audio")

    verifier = get_verifier()
    try:
        is_known, name, score = verifier.verify(pcm)
    except Exception as e:
        logger.error(f"[SpeakerRouter] verify error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Verification failed")

    return {
        "is_known": is_known,
        "name":     name,
        "score":    round(score, 4),
        "threshold": 0.25,
    }
