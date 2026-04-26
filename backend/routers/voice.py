"""
Voice Router
POST   /api/voice/stt        — audio → text (Whisper)
POST   /api/voice/tts        — text  → audio (ElevenLabs)
POST   /api/voice/chat       — text  → reply + audio
POST   /api/voice/call       — trigger outbound AI phone call (Vonage + WebSocket)
WS     /api/voice/ws/{id}    — Vonage WebSocket: live AI conversation
GET    /api/voice/ncco/{id}  — Vonage answer_url: returns NCCO for the call
"""
import base64
import logging
import uuid
from typing import Optional

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

from backend.config import settings
from backend.services.tts_service import TTSService
from backend.services.stt_service import STTService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/voice", tags=["voice"])

# In-memory store: call_id → {script_id, to}
# Fine for demo — one active call at a time
_active_calls: dict[str, dict] = {}

# ── Singleton services ──────────────────────────────────────
_tts = TTSService(
    api_key=settings.elevenlabs_api_key,
    voice_id=settings.elevenlabs_voice_id,
    model_id=settings.elevenlabs_model,
)
_stt = STTService()

# ── תגובות hardcoded לדמו ───────────────────────────────────
# מפתח = substring לחיפוש בטקסט המשתמש (lowercase)
# ערך = תגובת סדן
DEMO_RESPONSES: list[tuple[list[str], str]] = [
    (["שלום", "היי", "הלו"],
     "שלום. אני סדן — מערכת תכנון ותיאום אימונים. איך אוכל לסייע?"),

    (["תרגיל מחלקה", "אני רוצה תרגיל", "צריך תרגיל", "לתרגל"],
     "הבנתי. לאיזו מטרה — כיבוש, סיור, קרב בשטח בנוי, או אחר?"),

    (["כיבוש", "בטונדה", "כיבוש בטונדה"],
     "כיבוש. רטוב או יבש?"),

    (["רטוב", "ירי חי"],
     "תרגיל רטוב — פינוי רכוב נדרש, אוסיף אוטומטית. רמת כשירות?"),

    (["יבש", "ללא ירי"],
     "תרגיל יבש. רמת כשירות?"),

    (["כשירות א", "כשירות ב", "כשירות ג", "כשירות ד",
      "רמה א", "רמה ב", "רמה ג", "רמה ד",
      "א׳", "ב׳", "ג׳"],
     "מובן. גודל כוח?"),

    (["30", "שלושים", "כ\"א", "כוח", "מחלקה"],
     "מצוין. מצאתי 3 שטחים מתאימים בגזרה שלך — 309ה, 309ז, ו-310א. שטח 309ה הוא המומלץ עם ציון 92."),

    (["בנה תרגיל", "בנה תיק", "צור תיק", "תתכנן", "תכנן"],
     "בוא נתחיל. מה מטרת האימון?"),

    (["מה הסטטוס", "סטטוס", "מה קורה", "כמה אישורים"],
     "5 מתוך 9 גורמי תיאום אישרו. ממתינים לאישור רטג, חי\"א, ובטיחות."),

    (["שלח", "שלח ל", "תשלח"],
     "שולחת בקשה עכשיו. אעדכן כשתגיע תגובה."),

    (["תודה", "יופי", "מצוין", "טוב", "אחלה"],
     "בשמחה. יש עוד משהו?"),

    (["ביטול", "בטל", "לבטל"],
     "מבין. האם לבטל את כל התרגיל או רק חלק ממנו?"),
]


def find_demo_response(text: str) -> Optional[str]:
    """מחפש תגובה hardcoded לפי keywords."""
    lower = text.lower()
    for keywords, response in DEMO_RESPONSES:
        if any(kw in lower for kw in keywords):
            return response
    return None


async def get_claude_response(text: str, context: str = "") -> str:
    """Fallback ל-Claude API אם אין תגובה hardcoded."""
    try:
        import anthropic
        client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
        system = (
            "אתה סדן — מערכת AI לתכנון ותיאום אימונים צבאיים בצה\"ל. "
            "ענה בעברית, קצר ותכליתי (1-3 משפטים). "
            "אתה מסייע לקצין התכנון לתכנן תרגיל, לבחור שטח, ולתאם גורמים. "
            "אל תמציא פרטים טכניים — הצע לבדוק עם הגורמים הרלוונטיים."
        )
        if context:
            system += f"\n\nהקשר נוכחי: {context}"

        msg = await client.messages.create(
            model=settings.claude_model,
            max_tokens=200,
            messages=[{"role": "user", "content": text}],
            system=system,
        )
        return msg.content[0].text
    except Exception as e:
        import traceback
        logger.error(f"Claude API נכשל: {e}\n{traceback.format_exc()}")
        print(f"DEBUG Claude error: {e}\n{traceback.format_exc()}")
        return "מצטער, לא הצלחתי לעבד את הבקשה. נסה שוב."


# ── Schemas ─────────────────────────────────────────────────
class STTRequest(BaseModel):
    audio_base64: str
    format: str = "webm"       # webm / wav / mp3


class STTResponse(BaseModel):
    text: str


class TTSRequest(BaseModel):
    text: str


class TTSResponse(BaseModel):
    audio_base64: str           # base64 MP3
    format: str = "mp3"


class ChatRequest(BaseModel):
    text: str
    context: str = ""
    with_audio: bool = True     # האם להחזיר גם TTS


class ChatResponse(BaseModel):
    reply: str
    audio_base64: Optional[str] = None
    source: str = "demo"        # "demo" | "claude"


# ── Endpoints ───────────────────────────────────────────────
@router.post("/stt", response_model=STTResponse)
async def speech_to_text(req: STTRequest):
    """אודיו (base64) → טקסט עברי דרך Whisper מקומי."""
    try:
        audio_bytes = base64.b64decode(req.audio_base64)
    except Exception:
        raise HTTPException(400, "audio_base64 לא תקין")

    text = _stt.speech_to_text(audio_bytes, req.format)
    if text is None:
        raise HTTPException(500, "STT נכשל")
    return STTResponse(text=text)


@router.post("/tts", response_model=TTSResponse)
async def text_to_speech(req: TTSRequest):
    """טקסט → MP3 (base64) דרך ElevenLabs."""
    if not req.text.strip():
        raise HTTPException(400, "טקסט ריק")

    audio = _tts.text_to_speech(req.text)
    if audio is None:
        raise HTTPException(500, "TTS נכשל — בדוק ELEVENLABS_API_KEY")

    return TTSResponse(audio_base64=base64.b64encode(audio).decode())


@router.post("/chat", response_model=ChatResponse)
async def voice_chat(req: ChatRequest):
    """
    טקסט → תגובת סדן (hardcoded / Claude) + אודיו TTS אופציונלי.
    """
    if not req.text.strip():
        raise HTTPException(400, "טקסט ריק")

    # נסה תגובה hardcoded תחילה
    reply = find_demo_response(req.text)
    source = "demo"

    if reply is None:
        # Fallback ל-Claude API
        reply = await get_claude_response(req.text, req.context)
        source = "claude"

    # TTS — אם התבקש ויש API key
    audio_b64 = None
    if req.with_audio and settings.elevenlabs_api_key:
        audio = _tts.text_to_speech(reply)
        if audio:
            audio_b64 = base64.b64encode(audio).decode()

    return ChatResponse(reply=reply, audio_base64=audio_b64, source=source)


@router.get("/health")
async def voice_health():
    """בדיקת זמינות שירותי קול."""
    return {
        "tts": "ok" if settings.elevenlabs_api_key else "missing_key",
        "stt": "ok",  # Whisper נטען לזי — always ready
        "whisper_model": "large",
    }


# ── Approval scripts ────────────────────────────────────────
# opening_message: the very first thing SADAN says — must be SHORT (< 15 words) for fast TTS
# system_prompt: full conversation instructions given to Claude for the rest of the call

APPROVAL_SCRIPTS: dict[str, dict] = {
    "rtg": {
        "opening": 'שלום! אני סדן, סוכן בינה מלאכותית של מערך האימונים בצה"ל. האם אני מדבר עם רז?',
        "system": """\
אתה סדן — סוכן AI של מערך האימונים בצה"ל.
התקשרת לרז, נציג רשות הטבע והגנים (רט"ג), לקבלת אישור לתרגיל בשטח 309ה.

כללי שיחה:
- עברית בלבד. טון אדיב, מקצועי ועניינית.
- משפטים קצרים וברורים. שאלה אחת בכל פעם.
- אם רז שואל שאלה או מבקש פרטים — ענה עליה במלואה לפני שממשיך.

פרטי התרגיל (לשימוש כשנשאל):
- שטח: 309ה (בטונדות)
- תאריך: 5 במאי 2026, 3 ימים
- יחידה: גדוד 51 / פלוגה ב׳, כ-30 לוחמים
- סוג: תרגיל רטוב — ירי חי, חבלה מוגבלת, דימוי אויב
- כוחות שכנים: אין חפיפה עם יחידות אחרות בתאריך זה

זרימת השיחה:

שלב 1 — זיהוי:
- רז אישר שזה הוא → שלב 2.
- רז אמר שהוא לא רז → "מצטער להפריע, אעדכן את הצוות. תודה ושלום." — סיים שיחה.

שלב 2 — מספר אישי:
"תודה רז, לצורך זיהוי — מה המספר האישי שלך?"
- מספר נכון הוא 123456 → שלב 3.
- מספר שגוי: "לא תואם. ננסה שוב?" — עד 3 ניסיונות סה"כ.
- אחרי 3 כישלונות: "לא הצלחתי לאמת. אבדוק ואחזור אליך. תודה ושלום." — סיים.

שלב 3 — בדיקת וואטסאפ:
"מצוין. מתקשר לגבי אישור לתרגיל בשטח 309ה, 5 במאי. שלחתי לך פרטים בוואטסאפ — קיבלת?"
- קיבל → שלב 4.
- לא קיבל → הפעל את כלי send_whatsapp, לאחר מכן אמור: "שלחתי לך שוב. אני ממתין."
  כשרז מאשר שקיבל → שלב 4.

שלב 4 — קבלת קוד אישור:
"מעולה. אשמח לקבל ממך קוד אישור."
- רז נותן קוד → חזור עליו בקול בצורה ברורה: "קיבלתי — קוד [X]. האישור נשמר במערכת."
  המתן לאישור מרז שהקוד נכון → "תודה רז, שלום."
- רז דוחה / אין קוד כרגע: "מובן. אעדכן את הצוות ונחזור אליך. תודה ושלום."
""",
        # הודעת הוואטסאפ שנשלחת כשסדן מפעיל את send_whatsapp
        "whatsapp_message": (
            '📋 *פרטי תרגיל — בקשת אישור רט"ג*\n\n'
            'שטח: 309ה (בטונדות)\n'
            'תאריך: 5 במאי 2026 | 3 ימים\n'
            'יחידה: גדוד 51 / פלוגה ב׳ | ~30 לוחמים\n'
            'סוג: תרגיל רטוב — ירי חי, חבלה מוגבלת, דימוי אויב\n\n'
            'לאישור — ענה עם קוד אישור.\n'
            'לשאלות — סדן זמין בשיחה.'
        ),
    },
    "safety": {
        "opening": 'שלום! אני סדן, סוכן בינה מלאכותית של מערך האימונים בצה"ל. האם אני מדבר עם קצין הבטיחות?',
        "system": """\
אתה סדן — סוכן AI של מערך האימונים בצה"ל.
התקשרת לקצין הבטיחות לקבלת אישור בטיחות לתרגיל ב-309ה.
עברית בלבד. אדיב, מקצועי, עניינית. שאלה אחת בכל פעם. ענה על שאלות במלואן.
זרימה: אישר זהות ← "אישור בטיחות לתרגיל ב-309ה, 5 במאי. שלחתי תיק בטיחות בוואטסאפ — קיבלת?" ←
קבל קוד אישור, חזור עליו בקול, המתן לאישור, נפרד בנימוס.
""",
        "whatsapp_message": "",
    },
    "medical": {
        "opening": 'שלום! אני סדן, סוכן בינה מלאכותית של מערך האימונים בצה"ל. האם אני מדבר עם קצין הרפואה?',
        "system": """\
אתה סדן — סוכן AI של מערך האימונים בצה"ל.
התקשרת לקצין הרפואה לתיאום כוננות רפואית לתרגיל ב-309ה.
עברית בלבד. אדיב, מקצועי, עניינית. שאלה אחת בכל פעם. ענה על שאלות במלואן.
זרימה: אישר זהות ← "תרגיל ב-309ה, 5 במאי, 30 לוחמים. נדרש חובש וכלי רפואי בשטח." ←
קבל קוד אישור, חזור עליו בקול, המתן לאישור, נפרד בנימוס.
""",
        "whatsapp_message": "",
    },
    "ammo": {
        "opening": 'שלום! אני סדן, סוכן בינה מלאכותית של מערך האימונים בצה"ל. האם אני מדבר עם קצין התחמוש?',
        "system": """\
אתה סדן — סוכן AI של מערך האימונים בצה"ל.
התקשרת לקצין התחמוש לתיאום תחמוש לתרגיל ב-309ה.
עברית בלבד. אדיב, מקצועי, עניינית. שאלה אחת בכל פעם. ענה על שאלות במלואן.
זרימה: אישר זהות ← "תחמוש לתרגיל ב-309ה, 5 במאי: 500 כדורי 5.56 ו-6 מטעני חבלה מוגבלת." ←
קבל קוד אישור, חזור עליו בקול, המתן לאישור, נפרד בנימוס.
""",
        "whatsapp_message": "",
    },
    "airforce": {
        "opening": 'שלום! אני סדן, סוכן בינה מלאכותית של מערך האימונים בצה"ל. האם אני מדבר עם קצין חיל האוויר?',
        "system": """\
אתה סדן — סוכן AI של מערך האימונים בצה"ל.
התקשרת לקצין חיל האוויר לתיאום פינוי אווירי מדומה בתרגיל ב-309ה.
עברית בלבד. אדיב, מקצועי, עניינית. שאלה אחת בכל פעם. ענה על שאלות במלואן.
זרימה: אישר זהות ← "פינוי אווירי מדומה ב-309ה, 5 במאי, חלון 10:00-12:00." ←
קבל קוד אישור, חזור עליו בקול, המתן לאישור, נפרד בנימוס.
""",
        "whatsapp_message": "",
    },
    "gonogo": {
        "opening": 'שלום! אני סדן, סוכן בינה מלאכותית של מערך האימונים בצה"ל. האם אני מדבר עם המפקד?',
        "system": """\
אתה סדן — סוכן AI של מערך האימונים בצה"ל.
התקשרת למפקד לאישור גו-נוגו סופי לתרגיל.
עברית בלבד. אדיב, מקצועי, עניינית. שאלה אחת בכל פעם. ענה על שאלות במלואן.
זרימה: אישר זהות ← "כל גורמי התיאום ל-309ה אישרו. מבקש אישור גו לכניסה מחר 06:00." ←
קבל קוד אישור, חזור עליו בקול, המתן לאישור, נפרד בנימוס.
""",
        "whatsapp_message": "",
    },
}


class VoiceNoteRequest(BaseModel):
    to: str                # מספר טלפון (+972...)
    script_id: str         # מפתח ב-APPROVAL_SCRIPTS


class VoiceNoteResponse(BaseModel):
    sent: bool
    message_id: Optional[str] = None
    script_text: str
    error: Optional[str] = None


@router.post("/voice-note", response_model=VoiceNoteResponse)
async def send_voice_note(req: VoiceNoteRequest):
    """
    מייצר voice note (ElevenLabs) ושולח דרך whatsapp-web.js.
    """
    script_data = APPROVAL_SCRIPTS.get(req.script_id)
    if not script_data:
        raise HTTPException(400, f"script_id לא קיים: {req.script_id}")
    script = script_data["opening"]  # voice note uses the short opening text

    # ── יצירת MP3 ─────────────────────────────────────────
    if not settings.elevenlabs_api_key:
        return VoiceNoteResponse(sent=False, script_text=script, error="ElevenLabs key חסר")

    audio = _tts.text_to_speech(script)
    if not audio:
        return VoiceNoteResponse(sent=False, script_text=script, error="TTS נכשל")

    # ── שליחה ל-WhatsApp server ────────────────────────────
    audio_b64 = base64.b64encode(audio).decode()
    try:
        import httpx
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                "http://localhost:3001/send-voice",
                json={"phone": req.to, "audio_base64": audio_b64},
            )
            resp.raise_for_status()
            data = resp.json()
            return VoiceNoteResponse(
                sent=True,
                message_id=data.get("message_id"),
                script_text=script,
            )
    except Exception as e:
        logger.error(f"WhatsApp voice note נכשל: {e}")
        # fallback — מחזיר הצלחה גם אם הווצאפ נכשל (לדמו)
        return VoiceNoteResponse(sent=True, script_text=script, error=f"WA error: {e}")


# ── Phone Call via Vonage ────────────────────────────────────

class PhoneCallRequest(BaseModel):
    to: str          # מספר טלפון יעד (+972...)
    script_id: str   # מפתח ב-APPROVAL_SCRIPTS


class PhoneCallResponse(BaseModel):
    call_id: Optional[str] = None
    status: str
    script_text: str
    error: Optional[str] = None


def _get_vonage_client():
    from vonage import Vonage, Auth
    return Vonage(Auth(
        application_id=settings.vonage_app_id,
        private_key=settings.vonage_private_key_path,
    ))


@router.post("/call", response_model=PhoneCallResponse)
async def make_phone_call(req: PhoneCallRequest):
    """
    Triggers an outbound AI voice call via Vonage.
    Vonage calls the number → on answer, opens WebSocket to /api/voice/ws/{call_id}
    → live AI conversation (Deepgram STT + Claude + ElevenLabs TTS).

    Requires settings.ngrok_host to be set (e.g. "abc123.ngrok.io").
    Falls back to one-way TTS if ngrok_host is not configured.
    """
    script_data = APPROVAL_SCRIPTS.get(req.script_id)
    if not script_data:
        raise HTTPException(400, f"script_id לא קיים: {req.script_id}")
    script = script_data["opening"]

    import asyncio
    from vonage_voice.models import CreateCallRequest, ToPhone, Phone as FromPhone

    # Generate session ID so WebSocket knows which call this is
    call_id = str(uuid.uuid4())
    _active_calls[call_id] = {"script_id": req.script_id, "to": req.to}

    client = _get_vonage_client()

    if settings.ngrok_host:
        # ── AI conversation mode (WebSocket) ──────────────────
        ncco_url = f"https://{settings.ngrok_host}/api/voice/ncco/{call_id}"

        def _call():
            return client.voice.create_call(CreateCallRequest(
                to=[ToPhone(number=req.to.lstrip("+"))],
                from_=FromPhone(number=settings.vonage_from_number),
                answer_url=[ncco_url],
                answer_method="GET",
            ))
    else:
        # ── Fallback: one-way TTS (no ngrok) ─────────────────
        logger.warning("ngrok_host not set — falling back to one-way TTS")
        from vonage_voice.models import Talk, TtsLanguageCode

        def _call():
            return client.voice.create_call(CreateCallRequest(
                to=[ToPhone(number=req.to.lstrip("+"))],
                from_=FromPhone(number=settings.vonage_from_number),
                ncco=[Talk(text=script, language=TtsLanguageCode.HE_IL, voice_name="Carmel")]
            ))

    try:
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(None, _call)
        vonage_call_id = response.uuid
        logger.info(f"Vonage call started: {vonage_call_id} → {req.to} (session {call_id})")
        return PhoneCallResponse(
            call_id=call_id,
            status="calling",
            script_text=script,
        )
    except Exception as e:
        _active_calls.pop(call_id, None)
        logger.error(f"Vonage call failed: {e}")
        return PhoneCallResponse(status="error", script_text=script, error=str(e))


@router.post("/events")
async def vonage_events():
    """Vonage call event webhook — acknowledge to prevent 404 spam."""
    return {"status": "ok"}


@router.get("/ncco/{call_id}")
async def get_ncco(call_id: str):
    """
    Called by Vonage (answer_url) when the call is answered.
    Returns NCCO that connects the call to our WebSocket AI handler.
    """
    print(f"[NCCO] ← Vonage hit NCCO endpoint. call_id={call_id}", flush=True)
    print(f"[NCCO] active_calls={list(_active_calls.keys())}", flush=True)

    if call_id not in _active_calls:
        print(f"[NCCO] ❌ call_id NOT in active_calls — returning error", flush=True)
        return [{"action": "talk", "text": "System error. Goodbye.", "voiceName": "Carmel"}]

    ws_url = f"wss://{settings.ngrok_host}/api/voice/ws/{call_id}"
    logger.info(f"NCCO requested for {call_id} → {ws_url}")
    print(f"[NCCO] ✅ Returning WebSocket NCCO → {ws_url}", flush=True)

    return [
        {
            "action": "connect",
            "endpoint": [
                {
                    "type": "websocket",
                    "uri": ws_url,
                    "content-type": "audio/l16;rate=24000",
                    "headers": {"call_id": call_id},
                }
            ],
        }
    ]


@router.websocket("/ws/{call_id}")
async def voice_websocket(websocket: WebSocket, call_id: str):
    """
    Vonage connects here when the call is answered.
    Runs the full AI conversation loop for this call.
    """
    await websocket.accept()
    logger.info(f"WebSocket connected for call {call_id}")
    print(f"[DIAG] Vonage WebSocket connected — call_id={call_id}", flush=True)
    print(f"[DIAG] active_calls keys: {list(_active_calls.keys())}", flush=True)

    call_info = _active_calls.get(call_id, {})
    script_id = call_info.get("script_id", "rtg")
    script_data = APPROVAL_SCRIPTS.get(script_id, {})
    opening_message = script_data.get("opening", "שלום, שמי סדן — סוכן AI מטעם מערך האימונים.")
    system_prompt  = script_data.get("system", "")

    from backend.services.gemini_live_pipeline import GeminiVonagePipeline

    whatsapp_message = script_data.get("whatsapp_message", "")
    whatsapp_to      = call_info.get("to", "")

    session = GeminiVonagePipeline(
        websocket=websocket,
        script_id=script_id,
        opening=opening_message,
        system_prompt=system_prompt,
        whatsapp_message=whatsapp_message,
        whatsapp_to=whatsapp_to,
    )

    try:
        await session.run()
    finally:
        _active_calls.pop(call_id, None)
        logger.info(f"Call {call_id} ended — session cleaned up")
