"""
STT Service — Whisper local speech-to-text
מקבל אודיו bytes, מחזיר טקסט עברי
"""
import os
import logging
import tempfile
from typing import Optional

logger = logging.getLogger(__name__)

# מודל Whisper — נטען פעם אחת (lazy) ונשמר בזיכרון
_whisper_model = None


def _get_model():
    global _whisper_model
    if _whisper_model is None:
        import whisper, os
        # בדוק אם המודל כבר קיים — אל תוריד אוטומטית
        cache_dir = os.path.join(os.path.expanduser("~"), ".cache", "whisper")
        model_file = os.path.join(cache_dir, "medium.pt")
        if not os.path.exists(model_file):
            logger.warning("Whisper medium לא נמצא — STT לא זמין.")
            return None
        logger.info("טוען Whisper medium...")
        # טעינה ישירה מהנתיב — עוקף checksum ומונע הורדה
        _whisper_model = whisper.load_model(model_file)
        logger.info("Whisper medium טעון ומוכן")
    return _whisper_model


class STTService:
    def speech_to_text(self, audio_bytes: bytes, audio_format: str = "webm") -> Optional[str]:
        """
        מקבל אודיו bytes (webm/wav/mp3), מחזיר טקסט עברי.
        """
        suffix = f".{audio_format}"
        tmp_path = None
        try:
            # שמור ל-temp file
            with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
                tmp.write(audio_bytes)
                tmp_path = tmp.name

            model = _get_model()
            if model is None:
                return None
            result = model.transcribe(
                tmp_path,
                language="he",
                task="transcribe",
                fp16=False,   # תאימות עם CPU
            )
            text = result["text"].strip()
            logger.info(f"STT הצליח: '{text}'")
            return text

        except Exception as e:
            logger.error(f"STT נכשל: {e}")
            return None

        finally:
            if tmp_path and os.path.exists(tmp_path):
                try:
                    os.unlink(tmp_path)
                except Exception:
                    pass
