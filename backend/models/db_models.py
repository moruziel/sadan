"""
מודלי SQLAlchemy — טבלאות ה-DB של SADAN MVP.
"""
import uuid
from datetime import datetime
from sqlalchemy import String, Text, DateTime, Enum as SAEnum, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.database.db import Base


def _new_id() -> str:
    return str(uuid.uuid4())


class TrainingSession(Base):
    """
    session אחד = תהליך תכנון אימון אחד מקצה לקצה.
    שומר את שלב הזרימה הנוכחי והיסטוריית השיחה.
    """
    __tablename__ = "training_sessions"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_new_id)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
    flow_step: Mapped[str] = mapped_column(
        SAEnum(
            "initial",
            "planning",
            "plan_selected",
            "exercise_files_done",
            "coordination_sent",
            "approved",
            name="flow_step_enum",
        ),
        default="initial",
    )
    unit_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    training_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    selected_plan: Mapped[str | None] = mapped_column(Text, nullable=True)

    messages: Mapped[list["Message"]] = relationship(
        "Message", back_populates="session", cascade="all, delete-orphan"
    )
    coordination_requests: Mapped[list["CoordinationRequest"]] = relationship(
        "CoordinationRequest", back_populates="session", cascade="all, delete-orphan"
    )


class Message(Base):
    """הודעה אחת בשיחה (user / assistant)."""
    __tablename__ = "messages"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_new_id)
    session_id: Mapped[str] = mapped_column(ForeignKey("training_sessions.id"))
    role: Mapped[str] = mapped_column(SAEnum("user", "assistant", name="role_enum"))
    content: Mapped[str] = mapped_column(Text)
    agent_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    session: Mapped["TrainingSession"] = relationship("TrainingSession", back_populates="messages")


class CoordinationRequest(Base):
    """בקשת תיאום לגורם ספציפי."""
    __tablename__ = "coordination_requests"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_new_id)
    session_id: Mapped[str] = mapped_column(ForeignKey("training_sessions.id"))
    party_name: Mapped[str] = mapped_column(String(100))  # שם גורם התיאום
    is_blocker: Mapped[bool] = mapped_column(default=False)
    request_content: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(
        SAEnum("pending", "approved", "approved_with_conditions", "rejected", "in_progress",
               name="coord_status_enum"),
        default="pending",
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    session: Mapped["TrainingSession"] = relationship(
        "TrainingSession", back_populates="coordination_requests"
    )
