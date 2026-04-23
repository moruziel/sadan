"""
Build TTS cache for SADAN voice pipeline.
Run: python -m backend.services.build_tts_cache

Generates raw LINEAR16 PCM files (24kHz) for all greeting messages.
Saves to backend/services/tts_cache/
"""

import os
import sys

# Add project root to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

CACHE_DIR = os.path.join(os.path.dirname(__file__), "tts_cache")
SAMPLE_RATE = 24000

# Using SSML for explicit pause between "שלום!" and "אני סדן"
# <break time="350ms"/> gives a natural half-beat pause
def _ssml(name_phrase: str) -> str:
    return (
        f'<speak>שלום! <break time="400ms"/>'
        f'אני <break time="150ms"/>סדן. '
        f'סוכן בינה מלאכותית של מערך האימונים בצה"ל. '
        f'{name_phrase}</speak>'
    )


GREETINGS = {
    "rtg":      _ssml("האם אני מדבר עם רז?"),
    "safety":   _ssml("האם אני מדבר עם קצין הבטיחות?"),
    "medical":  _ssml("האם אני מדבר עם קצין הרפואה?"),
    "ammo":     _ssml("האם אני מדבר עם קצין התחמוש?"),
    "airforce": _ssml("האם אני מדבר עם קצין החיל האוויר?"),
    "gonogo":   _ssml("האם אני מדבר עם המפקד?"),
}


def build_cache():
    from google.cloud import texttospeech

    os.makedirs(CACHE_DIR, exist_ok=True)
    client = texttospeech.TextToSpeechClient()

    for script_id, ssml_text in GREETINGS.items():
        out_file = os.path.join(CACHE_DIR, f"{script_id}_greeting.raw")
        print(f"Generating: {script_id} -> {out_file}")

        response = client.synthesize_speech(
            input=texttospeech.SynthesisInput(ssml=ssml_text),
            voice=texttospeech.VoiceSelectionParams(
                language_code="he-IL",
                name="he-IL-Chirp3-HD-Charon",
            ),
            audio_config=texttospeech.AudioConfig(
                audio_encoding=texttospeech.AudioEncoding.LINEAR16,
                sample_rate_hertz=SAMPLE_RATE,
                speaking_rate=0.95,  # match live TTS rate
            ),
        )

        with open(out_file, "wb") as f:
            f.write(response.audio_content)

        duration_s = len(response.audio_content) / (SAMPLE_RATE * 2)
        print(f"  OK {len(response.audio_content)} bytes ({duration_s:.1f}s)")

    print(f"\nCache built: {len(GREETINGS)} files in {CACHE_DIR}")


if __name__ == "__main__":
    build_cache()
