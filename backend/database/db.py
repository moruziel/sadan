from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from backend.config import settings

engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False},  # נדרש ל-SQLite
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    """FastAPI dependency — מחזיר session ומשחרר אותו בסוף הבקשה."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """יצירת כל הטבלאות אם לא קיימות."""
    from backend.models import db_models  # noqa: F401 — import for side effects
    Base.metadata.create_all(bind=engine)
