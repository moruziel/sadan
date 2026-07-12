"""
Wall (command-center display) event bus.

The phone publishes UI events; wall displays subscribe and render them live.
One-way, fire-and-forget: the wall never affects the phone, so a wall failure
can't break the demo.

POST /api/wall/event — publish {type, ...} to all connected walls
WS   /api/wall/ws    — wall display subscribes; receives every event as JSON
"""

import asyncio
import json
import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Request

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/wall", tags=["wall"])

_clients: set = set()          # connected wall websockets
_last_context: dict = {}       # latest context event — replayed to new walls


async def broadcast(event: dict):
    """Send an event to every connected wall. Safe to call from any pipeline."""
    global _last_context
    if event.get("type") == "context":
        _last_context = event
    dead = []
    text = json.dumps(event, ensure_ascii=False)
    for ws in _clients:
        try:
            await ws.send_text(text)
        except Exception:
            dead.append(ws)
    for ws in dead:
        _clients.discard(ws)


@router.post("/event")
async def publish_event(request: Request):
    try:
        event = await request.json()
    except Exception:
        return {"ok": False, "error": "bad json"}
    await broadcast(event)
    return {"ok": True, "walls": len(_clients)}


@router.websocket("/ws")
async def wall_socket(websocket: WebSocket):
    await websocket.accept()
    _clients.add(websocket)
    logger.info(f"[Wall] display connected ({len(_clients)} total)")
    # Catch the new wall up with the current screen state
    if _last_context:
        try:
            await websocket.send_text(json.dumps(_last_context, ensure_ascii=False))
        except Exception:
            pass
    try:
        while True:
            # Walls don't send anything meaningful — keep the socket alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        _clients.discard(websocket)
        logger.info(f"[Wall] display disconnected ({len(_clients)} total)")
