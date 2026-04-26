"""
Gemini Live voice router.

GET  /gemini-voice      → browser test page (HTML)
WS   /gemini-voice/ws  → audio bridge: browser ↔ Gemini Live (SADAN advisor)
"""

import logging
from pathlib import Path

from fastapi import APIRouter, WebSocket
from fastapi.responses import HTMLResponse

from backend.services.gemini_live_pipeline import GeminiLivePipeline

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/gemini-voice", tags=["gemini-voice"])

_HTML_FILE = Path(__file__).parent.parent / "static" / "gemini_test.html"

# ── SADAN advisor system prompt — used for in-app voice chat ──────────────────
# Different from approval call prompts (APPROVAL_SCRIPTS in voice.py).
# This prompt is loaded when the user opens the voice chat in the app.
SADAN_ADVISOR_PROMPT = """\
אתה סדן — סוכן AI מומחה לתכנון ותיאום אימונים צבאיים בצה"ל.
אתה מוטמע בתוך אפליקציית תכנון תרגילים ומשמש כיועץ אישי לקצין התכנון.

תפקידך הכפול:
1. מומחה צבאי — עונה על שאלות מקצועיות לגבי תכנון תרגילים, שטחי אימון, בטיחות, לוגיסטיקה ותיאום.
2. מדריך אפליקציה — מסביר כיצד להשתמש במסכי האפליקציה ומנחה את המשתמש שלב אחר שלב.

מסכי האפליקציה שאתה מכיר:
- בחירת שטח — מפה תלת-מימדית לבחירה וסינון שטח אימון.
- תצוגת שטח (Area) — שכבות מפה, כוחות שכנים, גבולות, מידע על השטח.
- שאלון תרגיל — הגדרת מטרת האימון, רמת כשירות, אמל"ח, תאריכים וכוח.
- מתווים — 3 תוכניות עם ציון, הסבר ומפה מוקטנת. המפקד בוחר מתווה.
- תיק תרגיל — 7 פרקים: מטרות, לוגיסטיקה, בטיחות, תקשורת, לוח זמנים, כוחות שכנים, הערות.
- בוחן — 5 שאלות אמריקאיות מהתיק. סף מעבר 4/5.
- אישורים — 9 גורמי תיאום. סדן מתקשר אוטומטית לקבל אישור מכל גורם.

כללי שיחה:
- עברית בלבד.
- תשובות קצרות וממוקדות — מקסימום 2-3 משפטים.
- שאלה אחת בכל פעם.
- טון מקצועי ונינוח.
- אם אינך יודע — אמור "אבדוק ואחזור אליך" ואל תמציא פרטים.
"""


@router.get("", response_class=HTMLResponse)
async def get_test_page():
    """Serve the browser voice-chat test page."""
    return HTMLResponse(_HTML_FILE.read_text(encoding="utf-8"))


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """In-app voice chat — uses SADAN advisor prompt (not approval call prompts)."""
    await websocket.accept()
    logger.info("[Gemini Voice] Browser connected — advisor session")
    pipeline = GeminiLivePipeline(websocket, system_prompt=SADAN_ADVISOR_PROMPT)
    await pipeline.run()
    logger.info("[Gemini Voice] Browser session ended")
