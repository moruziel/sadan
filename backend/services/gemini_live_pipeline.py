"""
Gemini Live speech-to-speech pipeline.

Two modes:
  GeminiLivePipeline  — Browser WebSocket ↔ Gemini Live (browser demo)
  GeminiVonagePipeline — Vonage WebSocket ↔ Gemini Live (phone calls)

Audio specs:
  Browser input  : raw 16-bit PCM, 16 kHz, little-endian
  Vonage input   : raw 16-bit PCM, 24 kHz, little-endian  → resampled to 16 kHz
  Gemini output  : raw 16-bit PCM, 24 kHz, little-endian
"""

import asyncio
import logging

import numpy as np

logger = logging.getLogger(__name__)

PROJECT_ID = "sadan-494209"
LOCATION = "us-central1"

# GA model on Vertex AI — native audio dialog (Hebrew supported)
MODEL = "gemini-live-2.5-flash-native-audio"

INPUT_SAMPLE_RATE = 16000   # browser sends 16 kHz PCM
OUTPUT_SAMPLE_RATE = 24000  # Gemini returns 24 kHz PCM

SADAN_SYSTEM_PROMPT = """\
אתה סדן, סוכן בינה מלאכותית של מערך האימונים בצה"ל.
אתה מתקשר עם רז לאישור תרגיל מחלקה בשטח אימונים 309ה.

כללים:
- דבר עברית בלבד.
- תשובות קצרות — מקסימום 15 מילים.
- שאלה אחת בכל פעם.
- קצב דיבור ברור ונינוח.

זרימת השיחה:
1. וודא שזה רז: "האם אני מדבר עם רז?"
2. רז אישר: "תרגיל מחלקה ב-309ה ב-5 במאי. שלחתי פרטים בוואטסאפ — קיבלת?"
3. קיבל: "תרגיל רטוב, 30 לוחמים, חבלה ודימוי אויב. מאשר?"
4. אישר: "תודה רז. מתועד במערכת. יום טוב."
5. שאלות — תשובה קצרה בלבד, הפרטים המלאים בוואטסאפ.\
"""


class GeminiLivePipeline:
    """Bridges browser WebSocket ↔ Gemini Live API (Vertex AI)."""

    def __init__(self, websocket, system_prompt: str = SADAN_SYSTEM_PROMPT):
        self.websocket = websocket
        self.system_prompt = system_prompt

    async def run(self):
        try:
            from google import genai
            from google.genai import types
        except ImportError:
            logger.error("[Gemini Live] google-genai not installed. Run: pip install google-genai")
            return

        client = genai.Client(vertexai=True, project=PROJECT_ID, location=LOCATION)

        config = types.LiveConnectConfig(
            response_modalities=[types.Modality.AUDIO],
            system_instruction=types.Content(
                parts=[types.Part(text=self.system_prompt)]
            ),
            # Charon: neutral, professional voice — works well for Hebrew
            speech_config=types.SpeechConfig(
                voice_config=types.VoiceConfig(
                    prebuilt_voice_config=types.PrebuiltVoiceConfig(
                        voice_name="Charon"
                    )
                )
            ),
        )

        logger.info(f"[Gemini Live] Connecting — model={MODEL}")
        try:
            async with client.aio.live.connect(model=MODEL, config=config) as session:
                logger.info("[Gemini Live] ✅ Session open")

                send_task = asyncio.create_task(self._send_audio(session))
                recv_task = asyncio.create_task(self._receive_audio(session))

                # Run until one side closes (browser disconnect or Gemini closes)
                done, pending = await asyncio.wait(
                    [send_task, recv_task],
                    return_when=asyncio.FIRST_COMPLETED,
                )
                for t in pending:
                    t.cancel()
                    try:
                        await t
                    except asyncio.CancelledError:
                        pass

        except Exception as e:
            logger.error(f"[Gemini Live] Session error: {e}", exc_info=True)
        finally:
            logger.info("[Gemini Live] Session closed")

    # ── Audio I/O ──────────────────────────────────────────────

    async def _send_audio(self, session):
        """Browser → FastAPI → Gemini: forward raw 16 kHz PCM chunks."""
        from fastapi import WebSocketDisconnect
        from google.genai import types

        try:
            while True:
                msg = await self.websocket.receive()
                if "bytes" in msg and msg["bytes"]:
                    await session.send_realtime_input(
                        audio=types.Blob(
                            data=msg["bytes"],
                            mime_type=f"audio/pcm;rate={INPUT_SAMPLE_RATE}",
                        )
                    )
        except WebSocketDisconnect:
            logger.info("[Gemini Live] Browser disconnected")
        except Exception as e:
            logger.warning(f"[Gemini Live] Send error: {e}")

    async def _receive_audio(self, session):
        """Gemini → FastAPI → Browser: forward 24 kHz PCM audio chunks."""
        try:
            while True:
                # session.receive() yields one turn's worth of events;
                # the outer while-True re-enters for the next turn.
                async for response in session.receive():
                    if not response.server_content:
                        continue
                    sc = response.server_content

                    # Audio chunks
                    if sc.model_turn:
                        for part in sc.model_turn.parts:
                            if part.inline_data and part.inline_data.data:
                                await self.websocket.send_bytes(
                                    bytes(part.inline_data.data)
                                )

                    if sc.interrupted:
                        logger.info("[Gemini Live] ↩ User interrupted — barge-in")
                        # Notify browser to flush its audio queue
                        await self.websocket.send_text('{"type":"interrupted"}')

                    if sc.turn_complete:
                        logger.info("[Gemini Live] ✓ Turn complete")

        except Exception as e:
            logger.warning(f"[Gemini Live] Receive error: {e}")


# ── Audio resampling ───────────────────────────────────────────────────────────

VONAGE_SAMPLE_RATE = 24000  # Vonage sends 24 kHz
GEMINI_INPUT_RATE  = 16000  # Gemini Live requires 16 kHz


def _resample_24k_to_16k(data: bytes) -> bytes:
    """Downsample raw 16-bit PCM from 24 kHz → 16 kHz using linear interpolation."""
    if not data:
        return b""
    samples = np.frombuffer(data, dtype="<i2").astype(np.float64)
    target_len = max(1, len(samples) * GEMINI_INPUT_RATE // VONAGE_SAMPLE_RATE)
    old_idx = np.linspace(0, len(samples) - 1, target_len)
    resampled = np.interp(old_idx, np.arange(len(samples)), samples)
    return resampled.astype("<i2").tobytes()


# ── Vonage phone-call pipeline ─────────────────────────────────────────────────

VONAGE_CHUNK_SIZE = 960   # 20 ms at 24 kHz (960 bytes = 480 samples × 2 bytes)


class GeminiVonagePipeline:
    """
    Bridges a Vonage phone call WebSocket ↔ Gemini Live API.

    Vonage sends/expects audio/l16;rate=24000 (raw 16-bit PCM 24 kHz).
    Gemini Live requires 16 kHz input, outputs 24 kHz.

    Flow:
      Vonage (24 kHz) → resample → Gemini (16 kHz in / 24 kHz out) → Vonage (24 kHz)
    """

    def __init__(self, websocket, script_id: str, opening: str, system_prompt: str):
        self.websocket = websocket
        self.script_id = script_id
        self.opening = opening
        self.system_prompt = system_prompt

    async def run(self):
        try:
            from google import genai
            from google.genai import types
        except ImportError:
            logger.error("[Gemini Vonage] google-genai not installed")
            return

        client = genai.Client(vertexai=True, project=PROJECT_ID, location=LOCATION)

        # Prepend opening instruction to system prompt so Gemini knows what to say first
        full_system = (
            f"כשהשיחה מתחילה, אמור מיד את המשפט הבא בדיוק: \"{self.opening}\"\n\n"
            f"{self.system_prompt}"
        )

        config = types.LiveConnectConfig(
            response_modalities=[types.Modality.AUDIO],
            system_instruction=types.Content(
                parts=[types.Part(text=full_system)]
            ),
            speech_config=types.SpeechConfig(
                voice_config=types.VoiceConfig(
                    prebuilt_voice_config=types.PrebuiltVoiceConfig(
                        voice_name="Charon"
                    )
                )
            ),
        )

        logger.info(f"[Gemini Vonage] Connecting — script={self.script_id}")
        try:
            async with client.aio.live.connect(model=MODEL, config=config) as session:
                logger.info("[Gemini Vonage] ✅ Session open")

                # Trigger Gemini to speak the opening greeting immediately
                await session.send_client_content(
                    turns=types.Content(
                        role="user",
                        parts=[types.Part(text="התחל שיחה")],
                    ),
                    turn_complete=True,
                )

                send_task = asyncio.create_task(self._send_audio(session))
                recv_task = asyncio.create_task(self._receive_audio(session))

                done, pending = await asyncio.wait(
                    [send_task, recv_task],
                    return_when=asyncio.FIRST_COMPLETED,
                )
                for t in pending:
                    t.cancel()
                    try:
                        await t
                    except asyncio.CancelledError:
                        pass

        except Exception as e:
            logger.error(f"[Gemini Vonage] Session error: {e}", exc_info=True)
        finally:
            logger.info(f"[Gemini Vonage] Session closed — script={self.script_id}")

    async def _send_audio(self, session):
        """Vonage → resample 24 kHz→16 kHz → Gemini."""
        from fastapi import WebSocketDisconnect
        from google.genai import types

        try:
            while True:
                msg = await self.websocket.receive()
                if "bytes" in msg and msg["bytes"]:
                    pcm_16k = _resample_24k_to_16k(msg["bytes"])
                    await session.send_realtime_input(
                        audio=types.Blob(
                            data=pcm_16k,
                            mime_type=f"audio/pcm;rate={GEMINI_INPUT_RATE}",
                        )
                    )
                elif "text" in msg:
                    logger.debug(f"[Gemini Vonage] Vonage control: {msg['text'][:60]}")
        except WebSocketDisconnect:
            logger.info("[Gemini Vonage] Call disconnected (Vonage)")
        except Exception as e:
            logger.warning(f"[Gemini Vonage] Send error: {e}")

    async def _receive_audio(self, session):
        """Gemini (24 kHz) → Vonage in 20 ms chunks."""
        try:
            while True:
                async for response in session.receive():
                    if not response.server_content:
                        continue
                    sc = response.server_content

                    if sc.model_turn:
                        for part in sc.model_turn.parts:
                            if part.inline_data and part.inline_data.data:
                                buf = bytearray(part.inline_data.data)
                                # Send in 20 ms chunks — Vonage expects steady stream
                                while len(buf) >= VONAGE_CHUNK_SIZE:
                                    await self.websocket.send_bytes(
                                        bytes(buf[:VONAGE_CHUNK_SIZE])
                                    )
                                    buf = buf[VONAGE_CHUNK_SIZE:]
                                    await asyncio.sleep(0.001)
                                if buf:
                                    await self.websocket.send_bytes(bytes(buf))

                    if sc.interrupted:
                        logger.info("[Gemini Vonage] ↩ Barge-in detected")

                    if sc.turn_complete:
                        logger.info("[Gemini Vonage] ✓ Turn complete")

        except Exception as e:
            logger.warning(f"[Gemini Vonage] Receive error: {e}")
