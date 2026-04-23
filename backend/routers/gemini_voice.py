"""
Gemini Live voice router.

GET  /gemini-voice      → browser test page (HTML)
WS   /gemini-voice/ws  → audio bridge: browser ↔ Gemini Live
"""

import logging
from pathlib import Path

from fastapi import APIRouter, WebSocket
from fastapi.responses import HTMLResponse

from backend.services.gemini_live_pipeline import GeminiLivePipeline

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/gemini-voice", tags=["gemini-voice"])

_HTML_FILE = Path(__file__).parent.parent / "static" / "gemini_test.html"


@router.get("", response_class=HTMLResponse)
async def get_test_page():
    """Serve the browser voice-chat test page."""
    return HTMLResponse(_HTML_FILE.read_text(encoding="utf-8"))


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    logger.info("[Gemini Voice] Browser connected")
    pipeline = GeminiLivePipeline(websocket)
    await pipeline.run()
    logger.info("[Gemini Voice] Browser session ended")
