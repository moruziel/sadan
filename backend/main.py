"""
SADAN Backend — FastAPI entry point
"""
import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)
# suppress noisy third-party loggers
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)
logging.getLogger("deepgram").setLevel(logging.WARNING)

from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from sqlalchemy.orm import Session

from backend.config import settings
from backend.database.db import get_db, init_db
from backend.models.db_models import TrainingSession, Message, CoordinationRequest
from backend.models.schemas import (
    ChatRequest,
    ChatResponse,
    SessionSummary,
    CoordinationRequestOut,
    UpdateFlowStepRequest,
    UpdateCoordinationStatusRequest,
    HealthResponse,
)
from backend.agents.orchestrator import Orchestrator
from backend.agents.training_planner_agent import TrainingPlannerAgent
from backend.agents.exercise_file_agent import ExerciseFileAgent
from backend.agents.coordination_agent import CoordinationAgent
from backend.agents.approval_tracker_agent import ApprovalTrackerAgent
from backend.routers import voice as voice_router
from backend.routers import gemini_voice as gemini_voice_router
from backend.routers import speaker as speaker_router

# --- אתחול האפליקציה ---
app = FastAPI(
    title="SADAN API",
    description="מערכת AI לתכנון ותיאום אימונים צבאיים בצה\"ל",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "Accept"],
)

@app.middleware("http")
async def add_cors_headers(request: Request, call_next):
    if request.method == "OPTIONS":
        return Response(
            status_code=200,
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept",
            },
        )
    response = await call_next(request)
    response.headers["Access-Control-Allow-Origin"] = "*"
    return response

# --- אתחול ה-Orchestrator + רישום סוכנים ---
# להוספת סוכן חדש: צור קובץ ב-agents/ וירש מ-BaseAgent → הוסף שורה כאן
orchestrator = Orchestrator()
orchestrator.register(TrainingPlannerAgent())
orchestrator.register(ExerciseFileAgent())
orchestrator.register(CoordinationAgent())
orchestrator.register(ApprovalTrackerAgent())


@app.on_event("startup")
def on_startup():
    init_db()
    _warm_up_clients()
    _print_status()


def _warm_up_clients():
    """Pre-initialize singletons so first call has no cold-start delay."""
    try:
        from backend.services.voice_pipeline_v2 import VoicePipelineV2
        VoicePipelineV2._get_tts_client()
    except Exception as e:
        logging.getLogger(__name__).warning(f"TTS warm-up failed: {e}")


def _print_status():
    import os
    from backend.config import settings

    W = 54
    print("\n" + "=" * W)
    print("  SADAN — Service Status")
    print("=" * W)

    # Claude API
    if settings.anthropic_api_key:
        print("  [OK] Claude AI          — active (claude-sonnet-4-6)")
    else:
        print("  [!!] Claude AI          — missing ANTHROPIC_API_KEY")

    # Google TTS
    try:
        import google.cloud.texttospeech
        print("  [OK] Google TTS         — active (he-IL-Chirp3-HD-Charon)")
    except ImportError:
        print("  [!!] Google TTS         — missing google-cloud-texttospeech")

    # Google STT V2
    try:
        import google.cloud.speech_v2
        print("  [OK] Google STT V2      — active (chirp_2 / he-IL / us-central1)")
    except ImportError:
        print("  [!!] Google STT V2      — missing google-cloud-speech")

    # Vonage
    if settings.vonage_api_key and settings.vonage_app_id:
        print(f"  [OK] Vonage Voice       — active (+{settings.vonage_from_number})")
    else:
        print("  [--] Vonage Voice       — disabled (missing keys)")

    # Cloudflare tunnel / ngrok
    if settings.ngrok_host:
        print(f"  [OK] Tunnel             — {settings.ngrok_host}")
    else:
        print("  [--] Tunnel             — not set (NGROK_HOST empty, calls use TTS fallback)")

    # WhatsApp server
    try:
        import urllib.request
        urllib.request.urlopen("http://localhost:3001/status", timeout=2)
        print("  [OK] WhatsApp server    — active (port 3001)")
    except Exception:
        print("  [--] WhatsApp server    — not running (port 3001)")

    print("=" * W)
    print("  Frontend : http://localhost:5173")
    print("  API docs : http://localhost:8000/docs")
    print("=" * W + "\n")


# ── Routers ───────────────────────────────────
app.include_router(voice_router.router)
app.include_router(gemini_voice_router.router)
app.include_router(speaker_router.router)


# ─────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────

@app.get("/health", response_model=HealthResponse, tags=["system"])
def health_check():
    return HealthResponse(status="ok")


@app.post("/api/chat", response_model=ChatResponse, tags=["chat"])
def chat(request: ChatRequest, db: Session = Depends(get_db)):
    """
    הנקודת כניסה הראשית.
    מקבל הודעה (עם session_id אופציונלי), מנתב לסוכן המתאים, ומחזיר תשובה.
    """
    # קבל או צור session
    if request.session_id:
        session = db.get(TrainingSession, request.session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session לא נמצא")
    else:
        session = TrainingSession()
        db.add(session)
        db.flush()

    # בנה היסטוריית שיחה
    history = [
        {"role": msg.role, "content": msg.content}
        for msg in sorted(session.messages, key=lambda m: m.created_at)
    ]

    context = {
        "flow_step": session.flow_step,
        "unit_name": session.unit_name,
        "training_name": session.training_name,
        "session_id": session.id,
    }

    # הרץ דרך ה-Orchestrator
    result = orchestrator.process(request.message, history, context)

    # שמור הודעות
    db.add(Message(session_id=session.id, role="user", content=request.message))
    db.add(Message(
        session_id=session.id,
        role="assistant",
        content=result["response"],
        agent_name=result["agent_name"],
    ))

    db.commit()
    db.refresh(session)

    return ChatResponse(
        session_id=session.id,
        agent_name=result["agent_name"],
        agent_description=result["agent_description"],
        response=result["response"],
        flow_step=session.flow_step,
    )


@app.get("/api/sessions/{session_id}", response_model=SessionSummary, tags=["sessions"])
def get_session(session_id: str, db: Session = Depends(get_db)):
    session = db.get(TrainingSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session לא נמצא")
    return SessionSummary(
        session_id=session.id,
        flow_step=session.flow_step,
        unit_name=session.unit_name,
        training_name=session.training_name,
        created_at=session.created_at,
        updated_at=session.updated_at,
        message_count=len(session.messages),
    )


@app.patch("/api/sessions/{session_id}/flow-step", tags=["sessions"])
def update_flow_step(
    session_id: str,
    request: UpdateFlowStepRequest,
    db: Session = Depends(get_db),
):
    """עדכן את שלב הזרימה של session — נקרא מה-frontend לאחר פעולת משתמש."""
    session = db.get(TrainingSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session לא נמצא")
    session.flow_step = request.flow_step
    db.commit()
    return {"session_id": session_id, "flow_step": request.flow_step}


@app.get(
    "/api/sessions/{session_id}/coordination",
    response_model=list[CoordinationRequestOut],
    tags=["coordination"],
)
def get_coordination_requests(session_id: str, db: Session = Depends(get_db)):
    session = db.get(TrainingSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session לא נמצא")
    return session.coordination_requests


@app.patch(
    "/api/coordination/{request_id}/status",
    response_model=CoordinationRequestOut,
    tags=["coordination"],
)
def update_coordination_status(
    request_id: str,
    request: UpdateCoordinationStatusRequest,
    db: Session = Depends(get_db),
):
    """עדכן סטטוס אישור של גורם תיאום."""
    coord_req = db.get(CoordinationRequest, request_id)
    if not coord_req:
        raise HTTPException(status_code=404, detail="בקשת תיאום לא נמצאה")
    coord_req.status = request.status
    if request.notes:
        coord_req.notes = request.notes
    db.commit()
    db.refresh(coord_req)
    return coord_req
