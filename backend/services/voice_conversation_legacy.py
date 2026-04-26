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

# Fallback system prompt — overridden per call via VoiceConversationSession(system_prompt=...)
DEFAULT_SYSTEM_PROMPT = """You are SADAN, an AI coordination agent for IDF training exercises.
Speak Hebrew only. Keep every response to 1-2 short sentences — this is a phone call."""


class VoiceConversationSession:
    """One active voice conversation. Tied to a single Vonage WebSocket call."""

    def __init__(self, websocket, script_id: str, opening_message: str, system_prompt: str = ""):
        self.websocket = websocket
        self.script_id = script_id
        self.opening_message = opening_message
        self.system_prompt = system_prompt or DEFAULT_SYSTEM_PROMPT
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
        Deepgram starts in parallel with the opening TTS so STT is ready
        the moment the AI finishes speaking.
        """
        try:
            # Speak opening first — Deepgram would timeout if started while TTS is playing
            await self._speak(self.opening_message)

            # Start Deepgram only after AI finishes speaking
            await self._start_deepgram()

            # Forward incoming audio to Deepgram until call ends
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
                confidence = getattr(alt, 'confidence', None)
                conf_str = f"{confidence:.2f}" if confidence is not None else "?"
                # start_time = when speech started (seconds from call start, from Deepgram metadata)
                start = getattr(result, 'start', None)
                duration = getattr(result, 'duration', None)
                timing = f" [{start:.1f}s+{duration:.1f}s]" if start is not None and duration is not None else ""
                logger.debug(f"[STT] interim{timing}: '{transcript}' conf={conf_str}")
                if result.is_final and transcript:
                    logger.info(f"[STT] FINAL{timing}: '{transcript}' (conf={conf_str})")
                    if not self._is_speaking:
                        asyncio.create_task(self._handle_user_turn(transcript))
                    else:
                        logger.info(f"[STT] ignored — AI is speaking (echo suppression)")
            except Exception as e:
                logger.error(f"Transcript handler error: {e}", exc_info=True)

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
            language="multi",   # he/nova-2 returns HTTP 400; multi works and Claude understands phonetic Hebrew
            encoding="linear16",
            sample_rate=16000,
            punctuate=True,
            endpointing=300,
            interim_results=False,
        )

        started = await self._dg_connection.start(options)
        if not started:
            logger.error("Deepgram failed to start — will continue without STT")
            self._dg_connection = None
            return
        logger.info("✅ Deepgram STT started (multi/nova-2, 16kHz, endpointing=300ms)")

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
        if self._is_speaking:
            logger.info(f"[Turn] ⏭️  skipped (AI speaking): '{transcript}'")
            return

        t0 = asyncio.get_event_loop().time()
        logger.info(f"[Turn] 👤 User: '{transcript}'")
        self.conversation_history.append({"role": "user", "content": transcript})

        response_text = await self._get_claude_response()
        t_claude = asyncio.get_event_loop().time()
        logger.info(f"[TIMING] Claude: {t_claude - t0:.2f}s")

        if response_text:
            self.conversation_history.append({"role": "assistant", "content": response_text})
            await self._speak(response_text)
            t_done = asyncio.get_event_loop().time()
            logger.info(f"[TIMING] Total turn: {t_done - t0:.2f}s")

    async def _get_claude_response(self) -> str:
        import anthropic
        from backend.config import settings

        try:
            client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
            msg = await client.messages.create(
                model=settings.claude_voice_model,  # haiku — faster for voice
                max_tokens=120,  # short answers = fast TTS
                system=self.system_prompt,
                messages=self.conversation_history,
            )
            if not msg.content:
                logger.error(f"[Claude] empty content — stop_reason={msg.stop_reason}")
                return "מצטער, לא שמעתי. תוכל לחזור?"
            text = msg.content[0].text.strip()
            logger.info(f"[Claude] 🤖 {text[:120]}")
            return text
        except Exception as e:
            logger.error(f"[Claude] error: {e}", exc_info=True)
            return "מצטער, לא שמעתי. תוכל לחזור?"

    # ── Private: TTS ──────────────────────────────────────────

    async def _speak(self, text: str):
        """
        Generate speech with ElevenLabs (pcm_16000) and stream to Vonage.
        Uses convert_as_stream() — first audio chunk arrives while generation
        is still in progress, cutting latency vs buffered convert().
        Sends audio in fixed 640-byte chunks (20ms at 16kHz 16-bit mono).
        Blocks incoming audio while speaking.
        """
        from backend.config import settings

        if not settings.elevenlabs_api_key:
            logger.warning("ElevenLabs key missing — skipping TTS")
            return

        self._is_speaking = True
        t_start = asyncio.get_event_loop().time()
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

            buffer = bytearray()
            first_chunk = True
            for chunk in audio_stream:
                if chunk:
                    if first_chunk:
                        logger.info(f"[TIMING] TTS first chunk: {asyncio.get_event_loop().time() - t_start:.2f}s")
                        first_chunk = False
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
            logger.error(f"ElevenLabs TTS error: {e!r}", exc_info=True)
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
