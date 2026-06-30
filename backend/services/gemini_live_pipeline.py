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
import json
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
אתה מסייע לתכנון ובחינת שטחי אימון, ויכול לשלוט במפה ובאפליקציה.

כללים כלליים:
- דבר עברית בלבד.
- תשובות קצרות וממוקדות — מקסימום 20 מילים.
- שאלה אחת בכל פעם.
- כשמציג אלמנט על המפה — השתמש ב-map_show_element.

כלל קריטי — הודעות מערכת פנימיות:
כאשר מגיעה הודעה בפורמט [מידע מערכת: ...] — זו הודעת רקע פנימית.
אסור לקרוא אותה בקול. אסור להגיב עליה. פשוט עדכן את ההקשר שלך בשקט ואל תאמר כלום.

═══ שלב הזדהות — כללים מחייבים ═══

אתה נמצא כרגע במסך הזדהות. מצב זה פעיל עד שהמשתמש יספק קוד תקין.

מה מותר בשלב זה:
- fill_field(field_id="login_id", value=<קוד>) — זה הכלי היחיד שבשימוש.
- לשאול את המשתמש על מספרו האישי.

מה אסור בשלב זה (בכל מקרה, ללא יוצא מן הכלל):
- app_navigate — חסום לחלוטין. לא תנסה לנווט לשום מסך.
- לכל בקשת ניווט ענה: "ניווט יתאפשר לאחר הזדהות. אנא הזן מספר אישי."

פרוטוקול הזדהות:
1. כשמקבל "פתח שיחה" → אמור בדיוק: "שלום, אני סדן — מערכת תכנון ותיאום אימונים. אנא הזן את המספר האישי שלך."
2. כשהמשתמש אומר מספר בן 7 ספרות → קרא fill_field(field_id="login_id", value=<המספר>).
3. תגובת הכלי "authenticated" → אמור: "צהריים טובים, רס״ן כהן. מתחבר למערכת."
4. תגובת הכלי "wrong_code" → אמור: "קוד שגוי. [X ניסיונות נותרו]".
5. תגובת הכלי "locked" → אמור: "שלושה ניסיונות נכשלו. פנה למנהל המערכת." — הפסק לקבל קודים.
6. תגובת הכלי "blocked" (על app_navigate) → אמור: "ניווט מחייב הזדהות תחילה."
\
"""

# ── Field element lookup table ─────────────────────────────────────────────────
# All coordinates and metadata for 309h training area elements.
# map_show_element tool uses this dict to fly the map and expose layer info.
_FIELD_ELEMENTS: dict = {
    "center": {
        "lng": 35.245, "lat": 31.820, "zoom": 12,
        "name": "מרכז שטח 309ה",
        "layer": None,
        "info": "מרכז שטח האש 309ה",
        "constraints": None,
    },
    "helipad": {
        "lng": 35.218, "lat": 31.838, "zoom": 15,
        "name": "נחיתת מסוקים",
        "layer": "infrastructure",
        "info": "נחיתת מסוקים — מיקום דרום-מערב בלבד",
        "constraints": "מזרחית אסור — קו מתח 161KV חוצה את האזור",
    },
    "powerline": {
        "lng": 35.245, "lat": 31.844, "zoom": 13,
        "name": "קו חשמל 161KV",
        "layer": "hazards",
        "info": "קו חשמל 161KV — מפגע קריטי",
        "constraints": "100מ' מינימום מהקו, ירי אסור ברדיוס 50מ'",
    },
    "nature_reserve": {
        "lng": 35.271, "lat": 31.821, "zoom": 14,
        "name": "שמורת נחל קדרון",
        "layer": "hazards",
        "info": "שמורת נחל קדרון — שמורת טבע מוגנת",
        "constraints": "אין כניסה ל-200מ' מגדר הצפון-מזרחי",
    },
    "antiquities": {
        "lng": 35.223, "lat": 31.810, "zoom": 15,
        "name": "תל עתיקות",
        "layer": "hazards",
        "info": "תל עתיקות — אתר ארכיאולוגי מוגן",
        "constraints": "אין כלי רכב כבדים, אין ירי ממוקד לאזור",
    },
    "assembly_area": {
        "lng": 35.233, "lat": 31.832, "zoom": 15,
        "name": "אזור כינוס",
        "layer": "infrastructure",
        "info": "אזור כינוס — נקודת התארגנות ראשית",
        "constraints": None,
    },
    "admin_building": {
        "lng": 35.240, "lat": 31.826, "zoom": 15,
        "name": "מבנה מנהלה",
        "layer": "infrastructure",
        "info": "מבנה מנהלה — ניהול ותיאום שטח",
        "constraints": None,
    },
    "water_point": {
        "lng": 35.257, "lat": 31.814, "zoom": 15,
        "name": "נקודת מים",
        "layer": "infrastructure",
        "info": "נקודת מים — אספקת מים לכוחות",
        "constraints": None,
    },
    "target_a": {
        "lng": 35.228, "lat": 31.837, "zoom": 14,
        "name": "יעד א' — בטונדה מערבית",
        "layer": None,
        "info": "יעד א' — בטונדה מערבית",
        "constraints": None,
    },
    "target_b": {
        "lng": 35.240, "lat": 31.842, "zoom": 14,
        "name": "יעד ב' — בטונדה מרכזית",
        "layer": None,
        "info": "יעד ב' — בטונדה מרכזית, יעד עיקרי",
        "constraints": None,
    },
    "target_c": {
        "lng": 35.252, "lat": 31.836, "zoom": 14,
        "name": "יעד ג' — עמדה מזרחית",
        "layer": None,
        "info": "יעד ג' — עמדה מזרחית",
        "constraints": None,
    },
    "battalion_hq": {
        "lng": 35.237, "lat": 31.797, "zoom": 15,
        "name": "חפ\"ק גדוד 51",
        "layer": "forces",
        "info": "חפ\"ק גדוד 51 — מטה הגדוד",
        "constraints": None,
    },
    "medical_post": {
        "lng": 35.232, "lat": 31.795, "zoom": 15,
        "name": "תחנה רפואית",
        "layer": "forces",
        "info": "תחנה רפואית — עזרה ראשונה לכוחות",
        "constraints": None,
    },
    "enemy_center": {
        "lng": 35.236, "lat": 31.831, "zoom": 14,
        "name": "אויב מרכז (בימוי)",
        "layer": "forces",
        "info": "אויב מרכז — כוח בימוי מרכזי",
        "constraints": None,
    },
    "enemy_east": {
        "lng": 35.250, "lat": 31.828, "zoom": 14,
        "name": "אויב מזרח (בימוי)",
        "layer": "forces",
        "info": "אויב מזרח — כוח בימוי מזרחי",
        "constraints": None,
    },
    "battalion_202": {
        "lng": 35.235, "lat": 31.866, "zoom": 13,
        "name": "גדוד 202 (שכן)",
        "layer": "neighbors",
        "info": "גדוד 202 — כוח שכן בצפון",
        "constraints": None,
    },
    "artillery_411": {
        "lng": 35.301, "lat": 31.806, "zoom": 13,
        "name": "תותחנים 411 (שכן)",
        "layer": "neighbors",
        "info": "גדוד תותחנים 411 — כוח שכן במזרח",
        "constraints": None,
    },
}


class GeminiLivePipeline:
    """Bridges browser WebSocket ↔ Gemini Live API (Vertex AI)."""

    # Valid login code for the demo (matches Login.jsx VALID_CODE)
    _VALID_LOGIN_CODE = "5236521"
    _MAX_LOGIN_ATTEMPTS = 3

    def __init__(self, websocket, system_prompt: str = SADAN_SYSTEM_PROMPT):
        self.websocket = websocket
        self.system_prompt = system_prompt
        self._authenticated = False      # True after correct login code
        self._login_attempts = 0         # counts failed attempts
        self._peeked_msg = None          # first browser msg consumed during pre-connect peek
        self._skip_greeting = False      # True when login screen already greeted the user

    async def run(self):
        try:
            from google import genai
            from google.genai import types
        except ImportError:
            logger.error("[Gemini Live] google-genai not installed. Run: pip install google-genai")
            return

        client = genai.Client(vertexai=True, project=PROJECT_ID, location=LOCATION)

        # send_whatsapp tool
        send_wa_tool = types.Tool(
            function_declarations=[
                types.FunctionDeclaration(
                    name="send_whatsapp",
                    description=(
                        "שלח הודעת וואטסאפ למשתמש. "
                        "הפעל כשהמשתמש מבקש לשלוח מידע, קואורדינטות, קישור או סיכום בוואטסאפ."
                    ),
                    parameters=types.Schema(
                        type=types.Type.OBJECT,
                        properties={
                            "message": types.Schema(
                                type=types.Type.STRING,
                                description="תוכן ההודעה לשליחה בוואטסאפ",
                            ),
                        },
                        required=["message"],
                    ),
                )
            ]
        )

        # toggle_3d tool
        toggle_3d_tool = types.Tool(
            function_declarations=[
                types.FunctionDeclaration(
                    name="toggle_3d",
                    description="הצג/הסתר תצוגת תלת מימד עם הגבהת שטח. הפעל כשמבקשים תלת מימד.",
                    parameters=types.Schema(type=types.Type.OBJECT, properties={}),
                )
            ]
        )

        # map_fly_to — fly to coordinates
        map_fly_to_tool = types.Tool(
            function_declarations=[
                types.FunctionDeclaration(
                    name="map_fly_to",
                    description=(
                        "הטס את המפה למיקום ספציפי. "
                        "השתמש להצגת אלמנטים: מנחת מסוקים, מפגעים, יעדים, תשתיות וכו'. "
                        "הפעל לפני הסבר על אלמנט."
                    ),
                    parameters=types.Schema(
                        type=types.Type.OBJECT,
                        properties={
                            "lng":         types.Schema(type=types.Type.NUMBER,  description="קו אורך"),
                            "lat":         types.Schema(type=types.Type.NUMBER,  description="קו רוחב"),
                            "zoom":        types.Schema(type=types.Type.NUMBER,  description="זום 8–18, ברירת מחדל 14"),
                            "bearing":     types.Schema(type=types.Type.NUMBER,  description="כיוון המפה: 0=צפון, 90=מזרח"),
                            "pitch":       types.Schema(type=types.Type.NUMBER,  description="הטיית המפה 0–60"),
                            "duration_ms": types.Schema(type=types.Type.INTEGER, description="משך אנימציה במילישניות, ברירת מחדל 1500"),
                        },
                        required=["lng", "lat"],
                    ),
                )
            ]
        )

        # map_zoom — zoom in/out
        map_zoom_tool = types.Tool(
            function_declarations=[
                types.FunctionDeclaration(
                    name="map_zoom",
                    description="התקרב/התרחק במפה. delta חיובי=התקרב, שלילי=התרחק.",
                    parameters=types.Schema(
                        type=types.Type.OBJECT,
                        properties={
                            "delta": types.Schema(type=types.Type.NUMBER, description="שינוי זום, לדוגמה 2=התקרב 2 שלבים"),
                        },
                        required=["delta"],
                    ),
                )
            ]
        )

        # map_rotate — rotate/tilt
        map_rotate_tool = types.Tool(
            function_declarations=[
                types.FunctionDeclaration(
                    name="map_rotate",
                    description="סובב את המפה לזווית מסוימת, או שנה הטיה.",
                    parameters=types.Schema(
                        type=types.Type.OBJECT,
                        properties={
                            "bearing": types.Schema(type=types.Type.NUMBER, description="כיוון 0–360: 0=צפון, 90=מזרח, 180=דרום, 270=מערב"),
                            "pitch":   types.Schema(type=types.Type.NUMBER, description="הטיה 0–60 מעלות (אופציונלי)"),
                        },
                        required=["bearing"],
                    ),
                )
            ]
        )

        # map_show_layer — toggle information layer
        map_show_layer_tool = types.Tool(
            function_declarations=[
                types.FunctionDeclaration(
                    name="map_show_layer",
                    description=(
                        "הצג או הסתר שכבת מידע במפה. "
                        "שכבות: forces=כוחות, hazards=מפגעים, infrastructure=תשתיות, neighbors=שכנים, history=היסטוריה."
                    ),
                    parameters=types.Schema(
                        type=types.Type.OBJECT,
                        properties={
                            "layer":   types.Schema(type=types.Type.STRING,  description="שם השכבה: forces/hazards/infrastructure/neighbors/history"),
                            "visible": types.Schema(type=types.Type.BOOLEAN, description="true=הצג, false=הסתר"),
                        },
                        required=["layer", "visible"],
                    ),
                )
            ]
        )

        # app_navigate — navigate between app pages
        app_navigate_tool = types.Tool(
            function_declarations=[
                types.FunctionDeclaration(
                    name="app_navigate",
                    description=(
                        "נווט לדף אחר באפליקציה. הפעל כשהמשתמש מבקש לעבור לשלב אחר. "
                        "דפים: area=מפה, questionnaire=שאלון, plans=מתווים, "
                        "exercise=תיק-תרגיל, quiz=בוחן, approvals=אישורים, field-selection=בחירת-שטח."
                    ),
                    parameters=types.Schema(
                        type=types.Type.OBJECT,
                        properties={
                            "page": types.Schema(
                                type=types.Type.STRING,
                                description="שם הדף: area/questionnaire/plans/exercise/quiz/approvals/field-selection",
                            ),
                        },
                        required=["page"],
                    ),
                )
            ]
        )

        # map_show_element — fly to a named field element and reveal its layer
        map_show_element_tool = types.Tool(
            function_declarations=[
                types.FunctionDeclaration(
                    name="map_show_element",
                    description=(
                        "הצג אלמנט ספציפי על מפת שטח 309ה — המפה תטוס אליו ותציג את שכבת המידע. "
                        "השתמש בכלי זה כשמשתמש שואל 'איפה...' או 'תראה לי...' לגבי אלמנט בשטח. "
                        "ערכי element אפשריים: "
                        "center, helipad, powerline, nature_reserve, antiquities, "
                        "assembly_area, admin_building, water_point, "
                        "target_a, target_b, target_c, "
                        "battalion_hq, medical_post, enemy_center, enemy_east, "
                        "battalion_202, artillery_411."
                    ),
                    parameters=types.Schema(
                        type=types.Type.OBJECT,
                        properties={
                            "element": types.Schema(
                                type=types.Type.STRING,
                                description=(
                                    "מפתח האלמנט. אחד מ: "
                                    "center / helipad / powerline / nature_reserve / antiquities / "
                                    "assembly_area / admin_building / water_point / "
                                    "target_a / target_b / target_c / "
                                    "battalion_hq / medical_post / enemy_center / enemy_east / "
                                    "battalion_202 / artillery_411"
                                ),
                            ),
                        },
                        required=["element"],
                    ),
                )
            ]
        )

        # sim_pause — pause the simulation
        sim_pause_tool = types.Tool(
            function_declarations=[
                types.FunctionDeclaration(
                    name="sim_pause",
                    description="עצור את הסימולציה הטקטית. הפעל כשהמשתמש אומר 'עצור', 'רגע', 'הקפא'.",
                    parameters=types.Schema(type=types.Type.OBJECT, properties={}),
                )
            ]
        )

        # sim_resume — resume the simulation
        sim_resume_tool = types.Tool(
            function_declarations=[
                types.FunctionDeclaration(
                    name="sim_resume",
                    description="המשך את הסימולציה הטקטית. הפעל כשהמשתמש אומר 'המשך', 'תמשיך', 'הפעל'.",
                    parameters=types.Schema(type=types.Type.OBJECT, properties={}),
                )
            ]
        )

        # sim_goto_phase — jump to a specific simulation phase
        sim_goto_phase_tool = types.Tool(
            function_declarations=[
                types.FunctionDeclaration(
                    name="sim_goto_phase",
                    description=(
                        "קפוץ לשלב מסוים בסימולציה. "
                        "שלבים: 0=כינוס, 1=תנועה, 2=ביסוס, 3=כיסוי, "
                        "4=הסתערות יעד א׳, 5=מעבר, 6=כיבוש יעד ב׳, 7=נסיגה."
                    ),
                    parameters=types.Schema(
                        type=types.Type.OBJECT,
                        properties={
                            "phase": types.Schema(
                                type=types.Type.INTEGER,
                                description="מספר השלב 0–7",
                            ),
                        },
                        required=["phase"],
                    ),
                )
            ]
        )

        # sim_show_unit — fly map to a specific unit's current position
        sim_show_unit_tool = types.Tool(
            function_declarations=[
                types.FunctionDeclaration(
                    name="sim_show_unit",
                    description=(
                        "הצג יחידה ספציפית על המפה — המפה תטוס אליה. "
                        "הפעל כשמבקשים 'תראה לי כיתה ב׳', 'איפה המ״מ', וכו׳."
                    ),
                    parameters=types.Schema(
                        type=types.Type.OBJECT,
                        properties={
                            "unit_id": types.Schema(
                                type=types.Type.STRING,
                                description="מזהה היחידה: kitaA / kitaB / kitaG / mm",
                            ),
                        },
                        required=["unit_id"],
                    ),
                )
            ]
        )

        # fill_field — fill any app field (login, questionnaire, combat procedure)
        fill_field_tool = types.Tool(
            function_declarations=[
                types.FunctionDeclaration(
                    name="fill_field",
                    description=(
                        "מלא שדה באפליקציה. "
                        "1) כניסה למערכת: כשהמשתמש אומר קוד בן 7 ספרות — fill_field(field_id='login_id', value=<הקוד>, section=''). "
                        "2) שאלון תרגיל (section=''): "
                        "  readiness = רמת כשירות (aleph/bet/gimel/dalet). "
                        "  objective = מטרת האימון (טקסט חופשי). "
                        "  topic = נושא ספציפי (טקסט חופשי). "
                        "  ammo = סוג תחמושת ('5.56 בלבד'/'5.56 + חבלה'/'ירי כבד'/'חי\"ר + שריון'/'ללא חי'). "
                        "  date = תאריך (dd/mm/yyyy). "
                        "  forceSize = גודל כוח (מספר). "
                        "  composition = הרכב ('חי\"ר'/'שריון'/'מהנדסים' וכו׳). "
                        "3) נוהל קרב: section = missionReceived/situationAssessment/plan/order/preparations. "
                        "  field_id: mission_source/enemy/plan_concept/phase1/prep_h24 וכו׳."
                    ),
                    parameters=types.Schema(
                        type=types.Type.OBJECT,
                        properties={
                            "field_id": types.Schema(
                                type=types.Type.STRING,
                                description=(
                                    "שאלון: readiness/objective/topic/ammo/date/forceSize/composition. "
                                    "נוהל קרב — missionReceived: mission_source/mission_time/mission_location/mission_essence. "
                                    "situationAssessment: enemy/terrain/ownForces/time/conclusion. "
                                    "plan: plan_concept/plan_main/plan_reserve/plan_alt. "
                                    "order: enemy_detail/friendly/mission_full/phase1/phase2/phase3/phase4/phase5/phase6/ammo_log/medical_l/water_l/cmd_loc/callsign/freq. "
                                    "preparations: prep_h72/prep_h48/prep_h24/prep_h4/prep_h1."
                                ),
                            ),
                            "value": types.Schema(
                                type=types.Type.STRING,
                                description="הערך החדש למילוי בשדה",
                            ),
                            "section": types.Schema(
                                type=types.Type.STRING,
                                description="שאלון: '' (ריק). נוהל קרב: missionReceived/situationAssessment/plan/order/preparations.",
                            ),
                        },
                        required=["field_id", "value", "section"],
                    ),
                )
            ]
        )

        # NOTE: active_prompt is set below (after pre-connect peek).
        # We build config right before connecting so it uses the correct prompt.
        # Placeholder — will be replaced.
        _active_prompt_placeholder = self.system_prompt

        config = types.LiveConnectConfig(
            response_modalities=[types.Modality.AUDIO],
            system_instruction=types.Content(
                parts=[types.Part(text=_active_prompt_placeholder)]
            ),
            speech_config=types.SpeechConfig(
                language_code="he",   # ISO 639-1 — force Hebrew speech synthesis
                voice_config=types.VoiceConfig(
                    prebuilt_voice_config=types.PrebuiltVoiceConfig(
                        voice_name="Charon"
                    )
                )
            ),
            output_audio_transcription=types.AudioTranscriptionConfig(
                language_codes=["he-IL"],  # BCP-47 — force Hebrew transcription
            ),
            input_audio_transcription=types.AudioTranscriptionConfig(
                language_codes=["he-IL"],  # BCP-47 — force Hebrew input recognition
            ),
            tools=[
                send_wa_tool, toggle_3d_tool,
                map_fly_to_tool, map_zoom_tool, map_rotate_tool, map_show_layer_tool,
                app_navigate_tool, map_show_element_tool, fill_field_tool,
                sim_pause_tool, sim_resume_tool, sim_goto_phase_tool, sim_show_unit_tool,
            ],
        )

        # ── Pre-connect: peek for auth_context before starting Gemini session ──
        # Frontend sends auth_context immediately on ws.onopen when user is already
        # authenticated in this browser session. We wait up to 400 ms to receive it
        # so we can skip the "please enter your ID" greeting.
        try:
            first_msg = await asyncio.wait_for(self.websocket.receive(), timeout=0.4)
            if first_msg and "text" in first_msg and first_msg["text"]:
                try:
                    ctrl = json.loads(first_msg["text"])
                    if ctrl.get("type") == "auth_context" and ctrl.get("authenticated"):
                        self._authenticated = True
                        self._skip_greeting = bool(ctrl.get("skip_greeting", False))
                        logger.info(f"[Gemini Live] Pre-connect auth_context → authenticated=True skip_greeting={self._skip_greeting}")
                    else:
                        # Not auth_context — save it so _send_audio can process it
                        self._peeked_msg = first_msg
                except Exception:
                    self._peeked_msg = first_msg
            elif first_msg:
                self._peeked_msg = first_msg
        except asyncio.TimeoutError:
            logger.info("[Gemini Live] Pre-connect: no auth_context in 400ms — new session")
        except Exception as pe:
            logger.debug(f"[Gemini Live] Pre-connect peek error (ignored): {pe}")

        # ── Build system prompt based on auth state ───────────────────────────
        # This must happen AFTER the pre-connect peek so _authenticated is final.
        _LOGIN_OPENING = (
            'שלום, אני סדן — מערכת תכנון ותיאום אימונים. אנא הזן את המספר האישי שלך.'
        )
        if self._authenticated:
            active_prompt = (
                "== עקיפת הזדהות ==\n"
                "המשתמש כבר עבר הזדהות מוצלחת בסשן זה. "
                "אל תבקש מספר אישי ואל תפעיל פרוטוקול הזדהות.\n\n"
                + self.system_prompt
            )
            if self._skip_greeting:
                # Login screen already greeted — just be ready, don't greet again
                greeting_text = "המשתמש נכנס למערכת. המתן לפנייה שלו בשקט."
            else:
                greeting_text = "ברך את רס״ן כהן ושאל במה תוכל לעזור"
        else:
            # Normal: prepend opening instruction so Gemini says the exact greeting
            active_prompt = (
                f'כשהשיחה מתחילה, אמור מיד את המשפט הבא בדיוק: "{_LOGIN_OPENING}"\n\n'
                + self.system_prompt
            )
            greeting_text = "פתח שיחה"

        # Rebuild config with the correct (auth-aware) prompt
        config = types.LiveConnectConfig(
            response_modalities=[types.Modality.AUDIO],
            system_instruction=types.Content(
                parts=[types.Part(text=active_prompt)]
            ),
            speech_config=types.SpeechConfig(
                language_code="he",
                voice_config=types.VoiceConfig(
                    prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name="Charon")
                )
            ),
            output_audio_transcription=types.AudioTranscriptionConfig(language_codes=["he-IL"]),
            input_audio_transcription=types.AudioTranscriptionConfig(language_codes=["he-IL"]),
            tools=[
                send_wa_tool, toggle_3d_tool,
                map_fly_to_tool, map_zoom_tool, map_rotate_tool, map_show_layer_tool,
                app_navigate_tool, map_show_element_tool, fill_field_tool,
                sim_pause_tool, sim_resume_tool, sim_goto_phase_tool, sim_show_unit_tool,
            ],
        )

        logger.info(f"[Gemini Live] Connecting — model={MODEL} | authenticated={self._authenticated}")
        try:
            async with client.aio.live.connect(model=MODEL, config=config) as session:
                logger.info("[Gemini Live] ✅ Session open")

                from google.genai import types as _gtypes

                # Start recv_task FIRST — must be listening before we send the trigger,
                # otherwise Gemini's greeting response may arrive before the generator is ready.
                recv_task = asyncio.create_task(self._receive_audio(session))
                await asyncio.sleep(0.05)   # let recv_task reach session.receive()

                if self._skip_greeting:
                    # Login screen already greeted — send nothing, wait for user to speak
                    logger.info("[Gemini Live] skip_greeting=True — no trigger sent, waiting for user")
                else:
                    await session.send_client_content(
                        turns=_gtypes.Content(
                            role="user",
                            parts=[_gtypes.Part(text=greeting_text)],
                        ),
                        turn_complete=True,
                    )
                    logger.info(f"[Gemini Live] ✅ greeting trigger sent (auth={self._authenticated})")

                send_task = asyncio.create_task(self._send_audio(session))

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
        """
        Browser → FastAPI → Gemini: forward raw 16 kHz PCM chunks.

        Speaker verification (SpeechBrain):
        - Accumulates ~1 second of audio (32 KB) then verifies
        - If no enrolled speakers or verification disabled → pass all audio
        - If unknown speaker detected → drop chunk + log
        """
        from fastapi import WebSocketDisconnect
        from google.genai import types

        # Lazy-import so the pipeline still works if speechbrain isn't installed
        try:
            from backend.services.speaker_verify import get_verifier
            verifier = get_verifier()
        except Exception:
            verifier = None

        # buffer for speaker verification — 1 second at 16 kHz 16-bit = 32 000 bytes
        _VERIFY_BUF_SIZE = INPUT_SAMPLE_RATE * 2   # 32 000 bytes
        _buf = bytearray()
        _known_speaker: bool = True   # optimistic: pass audio until first verify
        chunks_sent = 0

        # If pre-connect peek captured a non-auth message, process it first
        _pending_msg = self._peeked_msg
        self._peeked_msg = None

        try:
            while True:
                msg = _pending_msg if _pending_msg is not None else await self.websocket.receive()
                _pending_msg = None  # only use once

                # ── Text control messages from frontend ───────────────────────
                if "text" in msg and msg["text"]:
                    try:
                        ctrl = json.loads(msg["text"])
                        msg_type = ctrl.get("type", "")

                        if msg_type == "auth_context" and ctrl.get("authenticated"):
                            # User already authenticated in this browser session — skip re-auth
                            self._authenticated = True
                            logger.info("[Gemini Live] auth_context received — authenticated=True (skip re-auth)")

                        elif msg_type == "screen_change":
                            screen = ctrl.get("screen", "")
                            _SCREEN_NAMES = {
                                "/area":            "area",
                                "/field-selection": "field-selection",
                                "/questionnaire":   "questionnaire",
                                "/plans":           "plans",
                                "/exercise":        "exercise",
                                "/quiz":            "quiz",
                                "/approvals":       "approvals",
                                "/simulation":      "simulation",
                            }
                            screen_key = _SCREEN_NAMES.get(screen, screen.lstrip("/"))
                            await session.send_realtime_input(
                                text=f"[מידע מערכת: screen={screen_key}]"
                            )
                            logger.info(f"[Gemini Live] screen_change → {screen}")

                    except Exception:
                        pass
                    continue

                if not ("bytes" in msg and msg["bytes"]):
                    continue

                chunk = msg["bytes"]

                # ── Speaker verification ─────────────────────────────────────
                if verifier and verifier.enabled and verifier.has_speakers():
                    _buf.extend(chunk)
                    if len(_buf) >= _VERIFY_BUF_SIZE:
                        # Run blocking torch inference in executor (non-blocking)
                        loop = asyncio.get_event_loop()
                        try:
                            is_known, name, score = await loop.run_in_executor(
                                None, verifier.verify, bytes(_buf)
                            )
                        except Exception as ve:
                            logger.warning(f"[SpeakerVerify] verify error: {ve}")
                            is_known = True   # fail open

                        _known_speaker = is_known
                        if is_known:
                            logger.debug(f"[SpeakerVerify] ✅ {name} ({score:.3f})")
                        else:
                            logger.info(f"[SpeakerVerify] 🚫 unknown speaker ({score:.3f}) — dropping")
                        _buf.clear()

                    if not _known_speaker:
                        continue  # drop chunk — unknown speaker

                await session.send_realtime_input(
                    audio=types.Blob(
                        data=chunk,
                        mime_type=f"audio/pcm;rate={INPUT_SAMPLE_RATE}",
                    )
                )
                chunks_sent += 1
        except WebSocketDisconnect:
            logger.info("[Gemini Live] Browser disconnected")
        except Exception as e:
            logger.warning(f"[Gemini Live] Send error: {e}")

    async def _receive_audio(self, session):
        """Gemini → FastAPI → Browser: forward 24 kHz PCM + transcripts as JSON."""
        from google.genai import types
        try:
            while True:
                async for response in session.receive():

                    # ── Tool call: send_whatsapp ───────────────
                    if response.tool_call:
                        for fc in response.tool_call.function_calls:
                            if fc.name == "send_whatsapp":
                                message = (fc.args or {}).get("message", "")
                                await self._do_send_whatsapp(message)
                                await session.send_tool_response(
                                    function_responses=[
                                        types.FunctionResponse(
                                            name="send_whatsapp",
                                            id=fc.id,
                                            response={"result": "sent"},
                                        )
                                    ]
                                )
                            elif fc.name == "toggle_3d":
                                await self.websocket.send_text(
                                    json.dumps({"type": "toggle_3d"}, ensure_ascii=False)
                                )
                                await session.send_tool_response(function_responses=[
                                    types.FunctionResponse(name="toggle_3d", id=fc.id, response={"result": "ok"})
                                ])

                            elif fc.name == "map_fly_to":
                                args = fc.args or {}
                                await self.websocket.send_text(json.dumps({
                                    "type": "map_fly_to",
                                    "lng":         float(args.get("lng", 35.245)),
                                    "lat":         float(args.get("lat", 31.820)),
                                    "zoom":        float(args.get("zoom", 14)),
                                    "bearing":     float(args.get("bearing", 0)),
                                    "pitch":       float(args.get("pitch", 0)),
                                    "duration_ms": int(args.get("duration_ms", 1500)),
                                }, ensure_ascii=False))
                                await session.send_tool_response(function_responses=[
                                    types.FunctionResponse(name="map_fly_to", id=fc.id, response={"result": "ok"})
                                ])

                            elif fc.name == "map_zoom":
                                args = fc.args or {}
                                await self.websocket.send_text(json.dumps({
                                    "type": "map_zoom",
                                    "delta": float(args.get("delta", 1)),
                                }, ensure_ascii=False))
                                await session.send_tool_response(function_responses=[
                                    types.FunctionResponse(name="map_zoom", id=fc.id, response={"result": "ok"})
                                ])

                            elif fc.name == "map_rotate":
                                args = fc.args or {}
                                await self.websocket.send_text(json.dumps({
                                    "type": "map_rotate",
                                    "bearing": float(args.get("bearing", 0)),
                                    "pitch":   float(args.get("pitch", -1)),  # -1 = keep current
                                }, ensure_ascii=False))
                                await session.send_tool_response(function_responses=[
                                    types.FunctionResponse(name="map_rotate", id=fc.id, response={"result": "ok"})
                                ])

                            elif fc.name == "map_show_layer":
                                args = fc.args or {}
                                await self.websocket.send_text(json.dumps({
                                    "type":    "map_show_layer",
                                    "layer":   str(args.get("layer", "")),
                                    "visible": bool(args.get("visible", True)),
                                }, ensure_ascii=False))
                                await session.send_tool_response(function_responses=[
                                    types.FunctionResponse(name="map_show_layer", id=fc.id, response={"result": "ok"})
                                ])

                            elif fc.name == "app_navigate":
                                _PAGE_MAP = {
                                    "area":            "/area",
                                    "field-selection": "/field-selection",
                                    "questionnaire":   "/questionnaire",
                                    "plans":           "/plans",
                                    "exercise":        "/exercise",
                                    "quiz":            "/quiz",
                                    "approvals":       "/approvals",
                                }
                                page = str((fc.args or {}).get("page", ""))
                                path = _PAGE_MAP.get(page, f"/{page}")
                                if not self._authenticated:
                                    # Block navigation until user logs in
                                    logger.warning(f"[Gemini Live] app_navigate BLOCKED (not authenticated): {path}")
                                    await session.send_tool_response(function_responses=[
                                        types.FunctionResponse(
                                            name="app_navigate", id=fc.id,
                                            response={
                                                "result": "blocked",
                                                "message": "ניווט חסום. המשתמש טרם הזדהה. בקש מספר אישי תחילה.",
                                            }
                                        )
                                    ])
                                else:
                                    await self.websocket.send_text(json.dumps({
                                        "type": "app_navigate",
                                        "path": path,
                                    }, ensure_ascii=False))
                                    await session.send_tool_response(function_responses=[
                                        types.FunctionResponse(name="app_navigate", id=fc.id, response={"result": "ok"})
                                    ])

                            elif fc.name == "map_show_element":
                                element_key = str((fc.args or {}).get("element", ""))
                                el = _FIELD_ELEMENTS.get(element_key)
                                if el:
                                    # Fly map to element
                                    await self.websocket.send_text(json.dumps({
                                        "type":        "map_fly_to",
                                        "lng":         el["lng"],
                                        "lat":         el["lat"],
                                        "zoom":        el.get("zoom", 14),
                                        "bearing":     0,
                                        "pitch":       0,
                                        "duration_ms": 1500,
                                    }, ensure_ascii=False))
                                    # Show relevant layer if defined
                                    if el.get("layer"):
                                        await self.websocket.send_text(json.dumps({
                                            "type":    "map_show_layer",
                                            "layer":   el["layer"],
                                            "visible": True,
                                        }, ensure_ascii=False))
                                    # Build info string for Gemini to speak
                                    info_text = el["info"]
                                    if el.get("constraints"):
                                        info_text += f". {el['constraints']}"
                                    await session.send_tool_response(function_responses=[
                                        types.FunctionResponse(
                                            name="map_show_element",
                                            id=fc.id,
                                            response={"name": el["name"], "info": info_text},
                                        )
                                    ])
                                    logger.info(f"[Gemini Live] map_show_element: {element_key} → {el['name']}")
                                else:
                                    logger.warning(f"[Gemini Live] map_show_element: unknown key '{element_key}'")
                                    await session.send_tool_response(function_responses=[
                                        types.FunctionResponse(
                                            name="map_show_element",
                                            id=fc.id,
                                            response={"error": f"element '{element_key}' not found"},
                                        )
                                    ])

                            elif fc.name == "fill_field":
                                args = fc.args or {}
                                field_id = str(args.get("field_id", ""))
                                value    = str(args.get("value", ""))

                                # ── Login authentication ──────────────────────
                                if field_id == "login_id":
                                    if self._authenticated:
                                        # Already logged in — ignore duplicate
                                        tool_resp = {"result": "already_authenticated"}
                                    elif value == self._VALID_LOGIN_CODE:
                                        self._authenticated = True
                                        self._login_attempts = 0
                                        # Tell frontend to trigger success screen
                                        await self.websocket.send_text(json.dumps({
                                            "type": "fill_field", "field_id": "login_id",
                                            "value": value, "section": "",
                                        }, ensure_ascii=False))
                                        tool_resp = {
                                            "result": "authenticated",
                                            "user": "רס\"ן כהן",
                                            "message": "הזדהות הצליחה. המערכת מתחברת.",
                                        }
                                        logger.info("[Gemini Live] login: AUTHENTICATED")
                                    else:
                                        self._login_attempts += 1
                                        remaining = self._MAX_LOGIN_ATTEMPTS - self._login_attempts
                                        if remaining > 0:
                                            tool_resp = {
                                                "result": "wrong_code",
                                                "attempts_remaining": remaining,
                                                "message": f"קוד שגוי. נותרו {remaining} ניסיונות.",
                                            }
                                        else:
                                            tool_resp = {
                                                "result": "locked",
                                                "message": "3 ניסיונות נכשלו. פנה למנהל המערכת.",
                                            }
                                        logger.warning(f"[Gemini Live] login: wrong code, attempt {self._login_attempts}")
                                    await session.send_tool_response(function_responses=[
                                        types.FunctionResponse(name="fill_field", id=fc.id, response=tool_resp)
                                    ])

                                    # Auth just completed THIS turn (live, mid-session) — the static
                                    # system_instruction still says "you're on the login screen, navigation
                                    # forbidden" for the rest of the session (system_instruction can't be
                                    # updated after connect). Send an explicit silent override so Gemini
                                    # stops re-asking for the ID / blocking navigation on later screens.
                                    if tool_resp.get("result") == "authenticated":
                                        await session.send_realtime_input(
                                            text="[מידע מערכת: הזדהות הושלמה בהצלחה. שלב ההזדהות הסתיים — "
                                                 "אל תבקש מספר אישי שוב ואל תחסום ניווט במהלך הסשן הזה.]"
                                        )

                                # ── Regular field fill (other screens) ───────
                                else:
                                    await self.websocket.send_text(json.dumps({
                                        "type":     "fill_field",
                                        "field_id": field_id,
                                        "value":    value,
                                        "section":  str(args.get("section", "")),
                                    }, ensure_ascii=False))
                                    logger.info(f"[Gemini Live] fill_field: section={args.get('section')} field={field_id}")
                                    await session.send_tool_response(function_responses=[
                                        types.FunctionResponse(name="fill_field", id=fc.id, response={"result": "filled"})
                                    ])

                            elif fc.name == "sim_pause":
                                await self.websocket.send_text(json.dumps({"type": "sim_pause"}, ensure_ascii=False))
                                logger.info("[Gemini Live] sim_pause")
                                await session.send_tool_response(function_responses=[
                                    types.FunctionResponse(name="sim_pause", id=fc.id, response={"result": "paused"})
                                ])

                            elif fc.name == "sim_resume":
                                await self.websocket.send_text(json.dumps({"type": "sim_resume"}, ensure_ascii=False))
                                logger.info("[Gemini Live] sim_resume")
                                await session.send_tool_response(function_responses=[
                                    types.FunctionResponse(name="sim_resume", id=fc.id, response={"result": "resumed"})
                                ])

                            elif fc.name == "sim_goto_phase":
                                phase_n = int((fc.args or {}).get("phase", 0))
                                await self.websocket.send_text(json.dumps({
                                    "type": "sim_goto_phase", "phase": phase_n,
                                }, ensure_ascii=False))
                                logger.info(f"[Gemini Live] sim_goto_phase: phase={phase_n}")
                                await session.send_tool_response(function_responses=[
                                    types.FunctionResponse(name="sim_goto_phase", id=fc.id, response={"result": "ok", "phase": phase_n})
                                ])

                            elif fc.name == "sim_show_unit":
                                unit_id = str((fc.args or {}).get("unit_id", ""))
                                await self.websocket.send_text(json.dumps({
                                    "type": "sim_show_unit", "unit_id": unit_id,
                                }, ensure_ascii=False))
                                logger.info(f"[Gemini Live] sim_show_unit: unit={unit_id}")
                                await session.send_tool_response(function_responses=[
                                    types.FunctionResponse(name="sim_show_unit", id=fc.id, response={"result": "ok", "unit": unit_id})
                                ])

                    if not response.server_content:
                        continue
                    sc = response.server_content

                    # ── DEBUG: log every non-empty server_content event ──────
                    _dbg_parts = []
                    if sc.model_turn:       _dbg_parts.append(f"audio_parts={len(sc.model_turn.parts)}")
                    if sc.output_transcription and sc.output_transcription.text:
                        _dbg_parts.append(f"out_transcript={repr(sc.output_transcription.text[:60])}")
                    if sc.input_transcription and sc.input_transcription.text:
                        _dbg_parts.append(f"in_transcript={repr(sc.input_transcription.text[:60])}")
                    if sc.turn_complete:    _dbg_parts.append("turn_complete=True")
                    if sc.interrupted:      _dbg_parts.append("interrupted=True")
                    if _dbg_parts:
                        logger.info(f"[Gemini SC] {' | '.join(_dbg_parts)}")
                    # ────────────────────────────────────────────────────────

                    # Audio chunks
                    if sc.model_turn:
                        for part in sc.model_turn.parts:
                            if part.inline_data and part.inline_data.data:
                                await self.websocket.send_bytes(
                                    bytes(part.inline_data.data)
                                )

                    # SADAN transcript (model output)
                    if sc.output_transcription and sc.output_transcription.text:
                        payload = {
                            "type": "transcript",
                            "role": "assistant",
                            "text": sc.output_transcription.text,
                            "final": bool(sc.turn_complete),
                        }
                        logger.info(f"[Gemini TX→browser] assistant transcript final={payload['final']} text={repr(payload['text'][:60])}")
                        await self.websocket.send_text(json.dumps(payload, ensure_ascii=False))

                    # User transcript (input)
                    if sc.input_transcription and sc.input_transcription.text:
                        payload = {
                            "type": "transcript",
                            "role": "user",
                            "text": sc.input_transcription.text,
                            "final": True,
                        }
                        logger.info(f"[Gemini TX→browser] user transcript text={repr(payload['text'][:60])}")
                        await self.websocket.send_text(json.dumps(payload, ensure_ascii=False))

                    if sc.interrupted:
                        logger.info("[Gemini Live] ↩ User interrupted — barge-in")
                        await self.websocket.send_text('{"type":"interrupted"}')

                    if sc.turn_complete:
                        logger.info("[Gemini Live] ✓ Turn complete")
                        # Signal frontend to close any open live-transcript bubbles
                        await self.websocket.send_text('{"type":"turn_complete"}')

        except Exception as e:
            logger.warning(f"[Gemini Live] Receive error: {e}")

    async def _do_send_whatsapp(self, message: str):
        """Send a WhatsApp message via the local WhatsApp server (localhost:3001/send)."""
        if not message:
            logger.warning("[Gemini Live] send_whatsapp called with empty message")
            return
        try:
            import httpx
            async with httpx.AsyncClient(timeout=8) as client:
                resp = await client.post(
                    "http://localhost:3001/send",
                    json={"message": message},
                )
                data = resp.json()
                logger.info(f"[Gemini Live] WhatsApp sent → {data}")
                # Notify the browser so it can show a confirmation bubble
                await self.websocket.send_text(json.dumps({
                    "type": "whatsapp_sent",
                    "message": message,
                }, ensure_ascii=False))
        except Exception as e:
            logger.warning(f"[Gemini Live] WhatsApp send failed (non-fatal): {e}")


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

    def __init__(
        self,
        websocket,
        script_id: str,
        opening: str,
        system_prompt: str,
        whatsapp_message: str = "",
        whatsapp_to: str = "",
    ):
        self.websocket = websocket
        self.script_id = script_id
        self.opening = opening
        self.system_prompt = system_prompt
        self.whatsapp_message = whatsapp_message
        self.whatsapp_to = whatsapp_to

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

        # send_whatsapp tool — Gemini calls this when it decides to resend exercise details
        tools = []
        if self.whatsapp_message:
            tools = [types.Tool(
                function_declarations=[
                    types.FunctionDeclaration(
                        name="send_whatsapp",
                        description=(
                            "שלח הודעת וואטסאפ עם פרטי התרגיל לאיש הקשר. "
                            "הפעל כלי זה כשהמשתמש אומר שלא קיבל את ההודעה."
                        ),
                        parameters=types.Schema(
                            type=types.Type.OBJECT,
                            properties={},
                        ),
                    )
                ]
            )]

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
            tools=tools if tools else None,
        )

        logger.info(f"[Gemini Vonage] Connecting — script={self.script_id}")
        print(f"[DIAG] GeminiVonagePipeline.run() start — script={self.script_id}", flush=True)
        try:
            async with client.aio.live.connect(model=MODEL, config=config) as session:
                logger.info("[Gemini Vonage] ✅ Session open")
                print("[DIAG] Gemini session opened", flush=True)

                # Trigger Gemini to speak the opening greeting immediately
                await session.send_client_content(
                    turns=types.Content(
                        role="user",
                        parts=[types.Part(text="התחל שיחה")],
                    ),
                    turn_complete=True,
                )
                print("[DIAG] send_client_content sent", flush=True)

                send_task = asyncio.create_task(self._send_audio(session))
                recv_task = asyncio.create_task(self._receive_audio(session))
                print("[DIAG] audio tasks started", flush=True)

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
            print(f"[DIAG] Session ERROR: {type(e).__name__}: {e}", flush=True)
        finally:
            logger.info(f"[Gemini Vonage] Session closed — script={self.script_id}")
            print(f"[DIAG] Session closed — script={self.script_id}", flush=True)

    async def _send_audio(self, session):
        """Vonage → resample 24 kHz→16 kHz → Gemini."""
        from fastapi import WebSocketDisconnect
        from google.genai import types

        print("[DIAG] _send_audio started", flush=True)
        chunks_sent = 0
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
                    chunks_sent += 1
                    if chunks_sent <= 3 or chunks_sent % 50 == 0:
                        print(f"[DIAG] sent chunk #{chunks_sent} ({len(msg['bytes'])}b)", flush=True)
                elif "text" in msg:
                    logger.debug(f"[Gemini Vonage] Vonage control: {msg['text'][:60]}")
        except WebSocketDisconnect:
            logger.info("[Gemini Vonage] Call disconnected (Vonage)")
            print(f"[DIAG] _send_audio: Vonage disconnected after {chunks_sent} chunks", flush=True)
        except Exception as e:
            logger.warning(f"[Gemini Vonage] Send error: {e}")
            print(f"[DIAG] _send_audio ERROR after {chunks_sent} chunks: {type(e).__name__}: {e}", flush=True)

    async def _receive_audio(self, session):
        """Gemini (24 kHz) → Vonage in 20 ms chunks.
        Also handles the send_whatsapp tool call."""
        from google.genai import types
        print("[DIAG] _receive_audio started", flush=True)
        responses_received = 0
        try:
            while True:
                async for response in session.receive():
                    responses_received += 1
                    if responses_received <= 5:
                        print(f"[DIAG] recv response #{responses_received}: tool_call={bool(response.tool_call)} server_content={bool(response.server_content)}", flush=True)

                    # ── Tool call: send_whatsapp ───────────────
                    if response.tool_call:
                        for fc in response.tool_call.function_calls:
                            if fc.name == "send_whatsapp":
                                await self._do_send_whatsapp()
                                await session.send_tool_response(
                                    function_responses=[
                                        types.FunctionResponse(
                                            name="send_whatsapp",
                                            id=fc.id,
                                            response={"result": "sent"},
                                        )
                                    ]
                                )

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
            print(f"[DIAG] _receive_audio ERROR after {responses_received} responses: {type(e).__name__}: {e}", flush=True)

    async def _do_send_whatsapp(self):
        """Send exercise details via WhatsApp server (localhost:3001/send)."""
        if not self.whatsapp_message or not self.whatsapp_to:
            logger.warning("[Gemini Vonage] send_whatsapp called but no message/phone configured")
            return
        try:
            import httpx
            async with httpx.AsyncClient(timeout=8) as client:
                resp = await client.post(
                    "http://localhost:3001/send",
                    json={"phone": self.whatsapp_to, "message": self.whatsapp_message},
                )
                data = resp.json()
                logger.info(f"[Gemini Vonage] WhatsApp sent → {data}")
        except Exception as e:
            logger.warning(f"[Gemini Vonage] WhatsApp send failed (non-fatal): {e}")
