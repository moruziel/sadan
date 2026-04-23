"""
VoicePipelineV2
---------------
AI voice pipeline for SADAN phone calls.

  Vonage WebSocket (audio/l16;rate=24000)
      → Google STT V2 chirp_2 he-IL (streaming)
      → Claude streaming (sentence by sentence)
      → Google TTS he-IL-Chirp3-HD-Charon (per sentence)
      → Vonage WebSocket (audio out)

Latency target: < 1.5s from end of user speech to first audio out.
"""

import asyncio
import logging
import os
from typing import Optional

logger = logging.getLogger(__name__)

PROJECT_ID = "sadan-494209"
LOCATION = "us-central1"  # chirp_2 is not available in "global"
SAMPLE_RATE = 24000
CHUNK_SIZE = SAMPLE_RATE * 2 * 20 // 1000  # 20ms chunks = 960 bytes

DEFAULT_SYSTEM_PROMPT = (
    "אתה סדן, סוכן AI מטעם מערך האימונים של צה\"ל. "
    "ענה בעברית בלבד. מקסימום 15 מילים בכל תשובה. שאלה אחת בכל תור."
)

SENTENCE_ENDERS = {'.', '?', '!', ':', '\n'}

TTS_CACHE_DIR = os.path.join(os.path.dirname(__file__), "tts_cache")


class VoicePipelineV2:
    """One active AI phone call — Google STT + Claude streaming + Google TTS."""

    # ── Class-level singletons (shared across all calls) ──────
    _tts_client = None
    _anthropic_client = None

    @classmethod
    def _get_tts_client(cls):
        if cls._tts_client is None:
            from google.cloud import texttospeech
            cls._tts_client = texttospeech.TextToSpeechClient()
            logger.info("[Init] Google TTS client created")
        return cls._tts_client

    @classmethod
    def _get_anthropic_client(cls):
        if cls._anthropic_client is None:
            import anthropic
            from backend.config import settings
            cls._anthropic_client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
            logger.info("[Init] Anthropic client created")
        return cls._anthropic_client

    def __init__(self, websocket, script_id: str, opening_message: str, system_prompt: str = ""):
        self.websocket = websocket
        self.script_id = script_id
        self.opening_message = opening_message
        self.system_prompt = system_prompt or DEFAULT_SYSTEM_PROMPT
        self.conversation_history: list[dict] = []
        self._is_speaking = False
        self._audio_queue: asyncio.Queue = asyncio.Queue(maxsize=200)
        self._stt_task: Optional[asyncio.Task] = None
        self._turn_start: Optional[float] = None   # set in _handle_turn, read in _speak
        self._stt_end: Optional[float] = None       # set when STT final arrives

    # ── Public ────────────────────────────────────────────────

    async def run(self):
        try:
            # NOTE: intentionally NOT setting _is_speaking=True here.
            # STT starts AFTER the opening, so any audio during the greeting
            # queues up and flows to STT immediately — prevents the cold-start
            # 499 that happens when STT begins with an empty queue.
            await self._play_opening()
            self._stt_task = asyncio.create_task(self._stt_loop())
            await self._forward_audio_loop()
        except Exception as e:
            logger.error(f"[Pipeline] error: {e}", exc_info=True)
        finally:
            await self._cleanup()

    # ── Audio forwarding ──────────────────────────────────────

    async def _forward_audio_loop(self):
        from fastapi import WebSocketDisconnect
        try:
            while True:
                msg = await self.websocket.receive()
                if "bytes" in msg:
                    if not self._is_speaking:
                        try:
                            self._audio_queue.put_nowait(msg["bytes"])
                        except asyncio.QueueFull:
                            pass  # drop if queue full (AI speaking)
                elif "text" in msg:
                    logger.debug(f"Vonage control: {msg['text'][:80]}")
        except WebSocketDisconnect:
            logger.info("[Pipeline] Call disconnected")
        except Exception as e:
            logger.warning(f"[Pipeline] Audio loop ended: {e}")
        finally:
            try:
                self._audio_queue.put_nowait(None)  # signal STT to stop (non-blocking, no await)
            except Exception:
                pass  # queue full or closed — ignore

    # ── Google STT V2 streaming ───────────────────────────────

    async def _stt_loop(self):
        """Stream audio to Google STT V2 with auto-restart on transient errors."""
        while True:
            try:
                await self._stt_once()
                break  # clean exit (None sentinel received) — call ended
            except asyncio.CancelledError:
                raise  # propagate — intentional shutdown
            except Exception as e:
                logger.warning(f"[STT] Error ({type(e).__name__}): {e} — restarting in 1s")
                await asyncio.sleep(1.0)
                # Check if call is still active before restarting
                if self._audio_queue.empty():
                    logger.info("[STT] Queue empty after error — not restarting")
                    break

    async def _stt_once(self):
        """Single STT streaming session — runs until None sentinel or error."""
        try:
            from google.cloud.speech_v2 import SpeechAsyncClient
            from google.cloud.speech_v2.types import cloud_speech
            from google.api_core.client_options import ClientOptions
        except ImportError:
            logger.error("[STT] google-cloud-speech not installed. Run: pip install google-cloud-speech")
            return

        # chirp_2 requires the regional endpoint — NOT the global one
        client = SpeechAsyncClient(
            client_options=ClientOptions(api_endpoint="us-central1-speech.googleapis.com")
        )

        recognition_config = cloud_speech.RecognitionConfig(
            explicit_decoding_config=cloud_speech.ExplicitDecodingConfig(
                encoding=cloud_speech.ExplicitDecodingConfig.AudioEncoding.LINEAR16,
                sample_rate_hertz=SAMPLE_RATE,
                audio_channel_count=1,
            ),
            language_codes=["he-IL"],
            model="chirp_2",
            features=cloud_speech.RecognitionFeatures(
                enable_automatic_punctuation=True,
            ),
        )

        # NOTE: do NOT set voice_activity_timeout at all.
        # Setting speech_end_timeout alone triggers Google's default speech_start_timeout (~2s),
        # which cancels the stream if the user doesn't speak immediately.
        # Without any timeout config, STT runs indefinitely — confirmed working in earlier sessions.
        streaming_config = cloud_speech.StreamingRecognitionConfig(
            config=recognition_config,
            streaming_features=cloud_speech.StreamingRecognitionFeatures(
                enable_voice_activity_events=True,
                interim_results=False,
            ),
        )

        recognizer = f"projects/{PROJECT_ID}/locations/{LOCATION}/recognizers/_"

        async def request_generator():
            yield cloud_speech.StreamingRecognizeRequest(
                recognizer=recognizer,
                streaming_config=streaming_config,
            )
            while True:
                chunk = await self._audio_queue.get()
                if chunk is None:
                    return
                yield cloud_speech.StreamingRecognizeRequest(audio=chunk)

        t_speech_start: Optional[float] = None

        # Store generator so we can close it on failure — prevents dangling
        # coroutine that blocks on audio_queue.get() and starves retries.
        gen = request_generator()
        try:
            logger.info("✅ Google STT V2 started (he-IL / chirp_2 / 24kHz)")
            async for response in await client.streaming_recognize(gen):
                evt = response.speech_event_type
                SpeechEvent = cloud_speech.StreamingRecognizeResponse.SpeechEventType

                if evt == SpeechEvent.SPEECH_ACTIVITY_BEGIN:
                    t_speech_start = asyncio.get_event_loop().time()
                    logger.info("[STT] Speech detected")

                for result in response.results:
                    if result.is_final and result.alternatives:
                        transcript = result.alternatives[0].transcript.strip()
                        confidence = result.alternatives[0].confidence
                        latency = (asyncio.get_event_loop().time() - t_speech_start) if t_speech_start else 0
                        logger.info(f"[STT] FINAL: '{transcript}' (conf={confidence:.2f}, stt_latency={latency:.2f}s)")
                        self._stt_end = asyncio.get_event_loop().time()
                        t_speech_start = None
                        if transcript and not self._is_speaking:
                            asyncio.create_task(self._handle_turn(transcript))
        except Exception as e:
            logger.error(f"[STT] Stream error: {e}", exc_info=False)
            raise  # propagate to _stt_loop for retry
        finally:
            # CRITICAL: close the generator so its pending audio_queue.get()
            # is released. Without this, old generators pile up across retries
            # and consume every audio chunk — new sessions hear nothing → 499.
            await gen.aclose()

    # ── Turn handling ─────────────────────────────────────────

    async def _handle_turn(self, transcript: str):
        if self._is_speaking:
            logger.info(f"[Turn] Skipped (speaking): '{transcript}'")
            return

        self._is_speaking = True
        t0 = asyncio.get_event_loop().time()
        self._turn_start = t0
        logger.info(f"[Turn] User: '{transcript}'")
        self.conversation_history.append({"role": "user", "content": transcript})

        try:
            await self._respond_streaming()
        except Exception as e:
            logger.error(f"[Turn] Error: {e}", exc_info=True)
        finally:
            self._is_speaking = False
            logger.info(f"[TIMING] Turn complete (incl. playback): {asyncio.get_event_loop().time() - t0:.2f}s")

    # ── Claude streaming → sentence → TTS ────────────────────

    async def _respond_streaming(self):
        """Stream Claude response. Send each sentence to TTS as it arrives."""
        from backend.config import settings

        client = self._get_anthropic_client()

        buffer = ""
        full_response = ""
        t_start = asyncio.get_event_loop().time()
        first_sentence_sent = False
        sentence_num = 0

        # Keep only last 4 messages — prevents history from growing and slowing Claude TTFT
        recent = self.conversation_history[-4:] if len(self.conversation_history) > 4 else self.conversation_history

        try:
            async with client.messages.stream(
                model=settings.claude_voice_model,
                max_tokens=60,  # short voice responses only
                system=self.system_prompt,
                messages=recent,
            ) as stream:
                async for token in stream.text_stream:
                    buffer += token
                    full_response += token

                    # Sentence enders may appear INSIDE a token (e.g. "במאי. שלחתי"),
                    # so scan the buffer from the left, not just buffer[-1].
                    while True:
                        # Find the earliest sentence ender in the buffer
                        cut = len(buffer)
                        for ender in SENTENCE_ENDERS:
                            idx = buffer.find(ender)
                            if idx != -1 and idx < cut:
                                cut = idx

                        if cut == len(buffer):
                            break  # no sentence ender found yet

                        sentence = buffer[:cut + 1].strip()
                        buffer = buffer[cut + 1:].lstrip()

                        if sentence:
                            sentence_num += 1
                            if not first_sentence_sent:
                                logger.info(
                                    f"[TIMING] Claude TTFT: "
                                    f"{asyncio.get_event_loop().time() - t_start:.2f}s"
                                )
                                first_sentence_sent = True
                            logger.info(f"[Turn] Sentence #{sentence_num}: '{sentence[:60]}'")
                            await self._speak(sentence)

            # Flush any remaining text
            if buffer.strip():
                await self._speak(buffer.strip())

            logger.info(f"[Claude] Full: '{full_response[:100]}'")
            if full_response.strip():
                self.conversation_history.append({"role": "assistant", "content": full_response.strip()})

        except Exception as e:
            logger.error(f"[Claude] Error: {e}", exc_info=True)
            await self._speak("מצטער, לא הצלחתי לעבד. תוכל לחזור?")

    # ── Google TTS ────────────────────────────────────────────

    async def _speak(self, text: str):
        """Synthesize text with Google TTS streaming_synthesize and send to Vonage in real-time.

        streaming_synthesize (Chirp3-HD) sends audio chunks as they are generated —
        first chunk arrives in ~300ms instead of waiting for the full synthesis.
        """
        t_start = asyncio.get_event_loop().time()

        try:
            from google.cloud import texttospeech

            # One-time log confirming streaming mode
            has_streaming = hasattr(texttospeech, 'StreamingSynthesizeConfig')
            tts_mode = "streaming_synthesize" if has_streaming else "synthesize_speech (batch fallback)"
            logger.info(f"[TTS] mode={tts_mode} | text='{text[:60]}'")

            tts_client = self._get_tts_client()
            loop = asyncio.get_event_loop()
            audio_queue: asyncio.Queue = asyncio.Queue()

            def _stream_tts():
                """Run streaming_synthesize in a thread; push chunks to asyncio queue."""
                try:
                    config_req = texttospeech.StreamingSynthesizeRequest(
                        streaming_config=texttospeech.StreamingSynthesizeConfig(
                            voice=texttospeech.VoiceSelectionParams(
                                language_code="he-IL",
                                name="he-IL-Chirp3-HD-Charon",
                            ),
                            streaming_audio_config=texttospeech.StreamingAudioConfig(
                                audio_encoding=texttospeech.AudioEncoding.LINEAR16,
                                sample_rate_hertz=SAMPLE_RATE,
                                speaking_rate=0.95,
                            ),
                        )
                    )
                    input_req = texttospeech.StreamingSynthesizeRequest(
                        input=texttospeech.StreamingSynthesisInput(text=text)
                    )
                    for response in tts_client.streaming_synthesize(iter([config_req, input_req])):
                        if response.audio_content:
                            loop.call_soon_threadsafe(audio_queue.put_nowait, response.audio_content)
                except Exception as exc:
                    loop.call_soon_threadsafe(audio_queue.put_nowait, exc)
                finally:
                    loop.call_soon_threadsafe(audio_queue.put_nowait, None)  # sentinel

            executor_future = loop.run_in_executor(None, _stream_tts)

            t_first = None
            total_bytes = 0
            while True:
                item = await audio_queue.get()
                if item is None:
                    break
                if isinstance(item, Exception):
                    raise item
                if t_first is None:
                    t_first = asyncio.get_event_loop().time()
                    e2e_turn     = f"{t_first - self._turn_start:.2f}s" if self._turn_start else "?"
                    e2e_stt      = f"{t_first - self._stt_end:.2f}s"    if self._stt_end    else "?"
                    logger.info(
                        f"[TIMING] TTS first chunk: {t_first - t_start:.2f}s"
                        f" | ★ E2E turn→audio: {e2e_turn}"
                        f" | ★ E2E transcript→audio: {e2e_stt}"
                    )
                total_bytes += len(item)
                await self.websocket.send_bytes(bytes(item))

            await executor_future
            logger.info(f"[TIMING] TTS done: {asyncio.get_event_loop().time() - t_start:.2f}s | {total_bytes} bytes")
            await asyncio.sleep(0.15)

        except Exception as e:
            if "websocket" in str(e).lower() or "disconnect" in str(e).lower() or "close" in str(e).lower():
                logger.debug("[TTS] WebSocket closed mid-stream (call ended)")
            else:
                logger.error(f"[TTS] Error: {e!r}", exc_info=True)

    # ── Opening message ───────────────────────────────────────

    async def _play_opening(self):
        """Play cached greeting or generate if not cached."""
        # Short pause so the callee has a moment after picking up
        await asyncio.sleep(0.5)

        os.makedirs(TTS_CACHE_DIR, exist_ok=True)
        cache_file = os.path.join(TTS_CACHE_DIR, f"{self.script_id}_greeting.raw")

        if os.path.exists(cache_file):
            t_start = asyncio.get_event_loop().time()
            logger.info(f"[Cache] Playing cached greeting: {self.script_id}")
            with open(cache_file, "rb") as f:
                audio = f.read()
            logger.info(f"[TIMING] Cache load: {asyncio.get_event_loop().time() - t_start:.4f}s")
            buffer = bytearray(audio)
            while len(buffer) >= CHUNK_SIZE:
                await self.websocket.send_bytes(bytes(buffer[:CHUNK_SIZE]))
                buffer = buffer[CHUNK_SIZE:]
                await asyncio.sleep(0.001)
            if buffer:
                await self.websocket.send_bytes(bytes(buffer))
            await asyncio.sleep(0.3)
        else:
            logger.info(f"[Cache] No cache for {self.script_id} — generating live")
            await self._speak(self.opening_message)  # _is_speaking managed by run()

    # ── Cleanup ───────────────────────────────────────────────

    async def _cleanup(self):
        if self._stt_task and not self._stt_task.done():
            self._stt_task.cancel()
        logger.info(f"[Session] Call ended. Turns: {len(self.conversation_history)}")
