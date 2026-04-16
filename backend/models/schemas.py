"""
Pydantic schemas — מודלי request/response של ה-API.
"""
from datetime import datetime
from pydantic import BaseModel


# --- Request ---

class ChatRequest(BaseModel):
    message: str
    session_id: str | None = None  # None = session חדש


class UpdateFlowStepRequest(BaseModel):
    flow_step: str


class UpdateCoordinationStatusRequest(BaseModel):
    status: str
    notes: str | None = None


# --- Response ---

class ChatResponse(BaseModel):
    session_id: str
    agent_name: str
    agent_description: str
    response: str
    flow_step: str


class SessionSummary(BaseModel):
    session_id: str
    flow_step: str
    unit_name: str | None
    training_name: str | None
    created_at: datetime
    updated_at: datetime
    message_count: int


class CoordinationRequestOut(BaseModel):
    id: str
    party_name: str
    is_blocker: bool
    status: str
    notes: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class HealthResponse(BaseModel):
    status: str
    version: str = "0.1.0"
