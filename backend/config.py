from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

_ENV_FILE = Path(__file__).parent / ".env"


class Settings(BaseSettings):
    # AI
    anthropic_api_key: str
    claude_model: str = "claude-sonnet-4-6"

    # ElevenLabs TTS
    elevenlabs_api_key: str = ""
    elevenlabs_voice_id: str = "nPczCjzI2devNBz1zQrb"  # Brian
    elevenlabs_model: str = "eleven_v3"  # turbo/flash break pcm_16000 output — v3 is stable

    # Claude model for voice calls — use same as main model (haiku 404'd on this key)
    claude_voice_model: str = "claude-sonnet-4-6"

    # Deepgram STT
    deepgram_api_key: str = ""

    # Vonage (phone calls)
    vonage_api_key: str = ""
    vonage_api_secret: str = ""
    vonage_app_id: str = ""
    vonage_private_key_path: str = "vonage_private.key"
    vonage_from_number: str = ""

    # Infrastructure
    database_url: str = "sqlite:///./sadan.db"
    ngrok_host: str = ""  # set before demo, e.g. "abc123.ngrok-free.app"
    test_call_number: str = ""  # מספר קבוע לבדיקות שיחה אוטומטיות (test-system.ps1)
    whatsapp_url: str = "http://localhost:3001"  # in Docker: http://whatsapp:3001

    model_config = SettingsConfigDict(
        env_file=str(_ENV_FILE),
        env_file_encoding="utf-8",
        env_ignore_empty=True,
    )


settings = Settings()
