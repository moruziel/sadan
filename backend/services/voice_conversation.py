"""
VoiceConversationSession
------------------------
Manages one live AI voice call:

  Vonage WebSocket (audio in)
      → Deepgram Nova-2 Hebrew (streaming STT)
      → Claude (response)
      → ElevenLabs pcm_16000 (TTS)
      → Vonage WebSocket (audio out)

One instance per active call. Created by the WebSocket endpoint,
destroyed when the call disconnects.
"""

import asyncio
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# System prompt for the SADAN coordination agent
SADAN_SYSTEM_PROMPT = """You are SADAN, an AI coordination system for IDF military training exercises.
You called this person to request approval for a training exercise.

Rules:
- Speak Hebrew only. Short sentences. Military/professional tone.
- You already introduced yourself and stated the request — wait for their response.
- Answer questions from the exercise details below.
- If they approve: thank them, say the system will update automatically.
- If they need another person to approve: ask for name and number, say SADAN will call them.
- If they have concerns: address them, note full package was sent to their WhatsApp and email.
- If they ask to call back later: confirm and say SADAN will call again at their requested time.
- Keep responses under 3 sentences — this is a phone call.

Exercise details:
- Unit: Battalion 51, company exercise
- Area: 309H (Betondot firing range)
- Date: May 5th, day and night
- Type: Live fire (wet exercise)
- Force: ~30 fighters
- Ammo: 500 rounds 5.56mm, 6 x 100g demolition charges, simulated enemy
- Safety: full safety plan sent to WhatsApp + email
- Medical: medic + medical vehicle on site
- Evac: simulated helicopter evacuation, window 10:00–12:00
"""


class VoiceConversationSession:
    """One active voice conversation. Tied to a single Vonage WebSocket call."""

    def __init__(self, websocket, script_id: str, opening_message: str):
        self.websocket = websocket
        self.script_id = script_id
        self.opening_message = opening_message
        self.conversation_history: list[dict] = []
        self._dg_connection = None
        self._is_speaking = False          # True while AI audio is streaming out
        self._audio_buffer = bytearray()   # accumulates audio while AI speaking
        self._pending_response: Optional[asyncio.Task] = None

    # ── Public API ────────────────────────────────────────────

    async def run(self):
        """
        Main entry point. Called once per WebSocket connection.
        Handles the full lifecycle: greeting → listen → respond → loop.
        """
        try:
            # 1. Speak the opening message
            await self._speak(self.opening_message)

            # 2. Start Deepgram streaming STT
            await self._start_deepgram()

            # 3. Forward incoming audio to Deepgram until call ends
            await self._forward_audio_loop()

        except Exception as e:
            logger.error(f"VoiceConversation error: {e}", exc_info=True)
        finally:
            await self._cleanup()

    async def receive_audio(self, audio_bytes: bytes):
        """Called by WebSocket handler for each incoming audio chunk."""
        if self._is_speaking:
            return  # ignore input while AI is speaking
        if self._dg_connection:
            await self._dg_connection.send(audio_bytes)

    # ── Private: Deepgram ─────────────────────────────────────

    async def _start_deepgram(self):
        from deepgram import (
            DeepgramClient, LiveTranscriptionEvents, LiveOptions
        )
        from backend.config import settings

        dg = DeepgramClient(settings.deepgram_api_key)
        self._dg_connection = dg.listen.asynclive.v("1")

        async def on_transcript(self_dg, result, **kwargs):
            try:
                alt = result.channel.alternatives[0]
                transcript = alt.transcript.strip()
                if result.is_final and transcript:
                    logger.info(f"[STT] {transcript}")
                    asyncio.create_task(self._handle_user_turn(transcript))
            except Exception as e:
                logger.error(f"Transcript handler error: {e}")

        async def on_error(self_dg, error, **kwargs):
            logger.error(f"[Deepgram] Error: {error}")

        async def on_close(self_dg, close, **kwargs):
            logger.info(f"[Deepgram] Connection closed: {close}")

        self._dg_connection.on(LiveTranscriptionEvents.Transcript, on_transcript)
        self._dg_connection.on(LiveTranscriptionEvents.Error, on_error)
        self._dg_connection.on(LiveTranscriptionEvents.Close, on_close)

        from deepgram import LiveOptions
        options = LiveOptions(
            model="nova-2",
            language="multi",   # "he" returns HTTP 400 — "multi" supports Hebrew
            encoding="linear16",
            sample_rate=16000,
            punctuate=True,
            endpointing=600,      # 600ms silence = end of utterance
            interim_results=False,
        )

        started = await self._dg_connection.start(options)
        if not started:
            logger.error("Deepgram failed to start — will continue without STT")
            self._dg_connection = None
            return
        logger.info("Deepgram streaming STT started (he, nova-2)")

    async def _forward_audio_loop(self):
        """Read audio frames from Vonage WebSocket and send to Deepgram."""
        from fastapi import WebSocketDisconnect
        try:
            while True:
                msg = await self.websocket.receive()
                if "bytes" in msg:
                    await self.receive_audio(msg["bytes"])
                elif "text" in msg:
                    # Vonage sends JSON control messages (connect/disconnect events)
                    logger.debug(f"Vonage control: {msg['text'][:120]}")
        except WebSocketDisconnect:
            logger.info("Call disconnected (WebSocket closed)")
        except Exception as e:
            logger.warning(f"Audio loop ended: {e}")

    # ── Private: Conversation ─────────────────────────────────

    async def _handle_user_turn(self, transcript: str):
        """User finished speaking. Get Claude response and speak it."""
        self.conversation_history.append({"role": "user", "content": transcript})

        response_text = await self._get_claude_response()
        if response_text:
            self.conversation_history.append({"role": "assistant", "content": response_text})
            await self._speak(response_text)

    async def _get_claude_response(self) -> str:
        import anthropic
        from backend.config import settings

        try:
            client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
            msg = await client.messages.create(
                model=settings.claude_model,
                max_tokens=200,
                system=SADAN_SYSTEM_PROMPT,
                messages=self.conversation_history,
            )
            text = msg.content[0].text
            logger.info(f"[Claude] {text[:80]}")
            return text
        except Exception as e:
            logger.error(f"Claude error: {e}")
            return "מצטער, לא שמעתי. תוכל לחזור?"

    # ── Private: TTS ──────────────────────────────────────────

    async def _speak(self, text: str):
        """
        Generate speech with ElevenLabs (pcm_16000) and stream to Vonage.
        Sends audio in fixed 640-byte chunks (20ms at 16kHz 16-bit mono)
        to prevent choppy playback.
        Blocks incoming audio while speaking.
        """
        from backend.config import settings

        if not settings.elevenlabs_api_key:
            logger.warning("ElevenLabs key missing — skipping TTS")
            return

        self._is_speaking = True
        logger.info(f"[TTS] Speaking: {text[:60]}")

        CHUNK_SIZE = 640  # 20ms at 16kHz, 16-bit mono = 640 bytes

        try:
            from elevenlabs.client import ElevenLabs
            el = ElevenLabs(api_key=settings.elevenlabs_api_key)

            audio_stream = el.text_to_speech.convert(
                voice_id=settings.elevenlabs_voice_id,
                text=text,
                model_id=settings.elevenlabs_model,
                output_format="pcm_16000",  # raw LINEAR16 16kHz — matches Vonage
            )

            # Buffer and send in fixed 20ms chunks
            buffer = bytearray()
            for chunk in audio_stream:
                if chunk:
                    buffer.extend(chunk)
                    while len(buffer) >= CHUNK_SIZE:
                        await self.websocket.send_bytes(bytes(buffer[:CHUNK_SIZE]))
                        buffer = buffer[CHUNK_SIZE:]
                        await asyncio.sleep(0.001)  # ~1ms yield between chunks

            # Flush remaining audio
            if buffer:
                await self.websocket.send_bytes(bytes(buffer))

            # Small pause after speaking so Vonage processes end of audio
            await asyncio.sleep(0.3)

        except Exception as e:
            logger.error(f"ElevenLabs TTS error: {e}")
        finally:
            self._is_speaking = False

    # ── Cleanup ───────────────────────────────────────────────

    async def _cleanup(self):
        if self._dg_connection:
            try:
                await self._dg_connection.finish()
            except Exception:
                pass
        logger.info(f"[Session] Call ended. Turns: {len(self.conversation_history)}")
