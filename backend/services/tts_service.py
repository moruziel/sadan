"""
TTS Service — ElevenLabs text-to-speech
מקבל טקסט עברי, מחזיר MP3 bytes
"""
import logging
from typing import Optional

logger = logging.getLogger(__name__)


class TTSService:
    def __init__(self, api_key: str, voice_id: str, model_id: str):
        self.api_key  = api_key
        self.voice_id = voice_id
        self.model_id = model_id
        self._client  = None

    def _get_client(self):
        if self._client is None:
            from elevenlabs.client import ElevenLabs
            self._client = ElevenLabs(api_key=self.api_key)
        return self._client

    def text_to_speech(self, text: str) -> Optional[bytes]:
        """
        מקבל טקסט בעברית, מחזיר MP3 bytes.
        מחזיר None אם אין API key או אם נכשל.
        """
        if not self.api_key:
            logger.warning("ElevenLabs API key חסר — TTS מושבת")
            return None

        try:
            client = self._get_client()
            audio_stream = client.text_to_speech.convert(
                voice_id=self.voice_id,
                text=text,
                model_id=self.model_id,
                output_format="mp3_44100_128",
            )
            audio_bytes = b"".join(audio_stream)
            logger.info(f"TTS הצליח: {len(audio_bytes)} bytes עבור '{text[:40]}...'")
            return audio_bytes

        except Exception as e:
            logger.error(f"TTS נכשל: {e}")
            return None
