"""
SADAN Backend — FastAPI entry point
"""
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
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

# --- אתחול האפליקציה ---
app = FastAPI(
    title="SADAN API",
    description="מערכת AI לתכנון ותיאום אימונים צבאיים בצה\"ל",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
