# SADAN — מסמך ארכיטקטורה
**גרסה:** 1.0 | **תאריך:** אפריל 2026

---

## 1. תמונה כוללת

SADAN היא מערכת AI לתכנון ותיאום אימונים צבאיים. הדמו הנוכחי מציג זרימה מלאה מהנחיות מפקד ועד תיק תרגיל מאושר עם תיאום גורמים.

```
┌─────────────────────────────────────────────────────────┐
│                     USER (Browser)                      │
│              React SPA — localhost:5173                  │
└────────────────────────┬────────────────────────────────┘
                         │ HTTP / WebSocket
                         ▼
┌─────────────────────────────────────────────────────────┐
│               Backend — FastAPI                         │
│              Python 3.11 — localhost:8000               │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │  REST API    │  │  Voice API   │  │ Gemini Voice  │  │
│  │  /api/*      │  │ /api/voice/* │  │ /gemini-voice │  │
│  └──────────────┘  └──────────────┘  └───────────────┘  │
└────────────────────────┬────────────────────────────────┘
          │              │                    │
          ▼              ▼                    ▼
     SQLite DB      Vonage API         Vertex AI
     sadan.db    (phone calls)     Gemini Live 2.5
                      │
                      ▼
               Cloudflare Tunnel
           trycloudflare.com:443
                      │
                      ▼ (WebSocket)
               Backend /api/voice/ws
```

---

## 2. שירותים פעילים

| שירות | טכנולוגיה | פורט | תיאור |
|---|---|---|---|
| **Frontend** | React 19 + Vite | 5173 | SPA — ממשק המשתמש |
| **Backend** | FastAPI + Python 3.11 | 8000 | API + Voice + Gemini |
| **WhatsApp** | Node.js + whatsapp-web.js | 3001 | micro-service לווצאפ |
| **Cloudflare Tunnel** | cloudflared.exe | — | חושף 8000 לאינטרנט |

**הפעלה:** `start.ps1` מפעיל את כולם בסדר הנכון ומעדכן את `NGROK_HOST` ב-`.env`.

---

## 3. Frontend

### 3.1 מסכים (React Router)
| נתיב | קובץ | תיאור |
|---|---|---|
| `/` | `Login.jsx` | כניסה עם מספר אישי |
| `/field-selection` | `FieldSelection.jsx` | בחירת שטח אימון |
| `/area` | `Area.jsx` | מפה תלת-מימדית + שכבות |
| `/questionnaire` | `Questionnaire.jsx` | שאלון הגדרת תרגיל |
| `/plans` | `Plans.jsx` | 3 מתווי תרגיל לבחירה |
| `/exercise` | `Exercise.jsx` | תיק תרגיל — 7 חלקים |
| `/quiz` | `Quiz.jsx` | בוחן 8 שאלות |
| `/approvals` | `Approvals.jsx` | מסלול אישורים + שיחות |
| `/demo-check` | `DemoChecklist.jsx` | בדיקת מוכנות לדמו |

### 3.2 קומפוננטות משותפות
- **`SadanChat.jsx`** — צ'אט קולי/טקסטואלי צף. WebSocket ל-Gemini Live. נמצא ב-`App.jsx` (לא מרונדר ב-login, field-selection, quiz).
- **`Header.jsx`** — כותרת עליונה + progress bar
- **`MapView.jsx`** — מפת MapLibre GL JS תלת-מימדית
- **`RegionMapView.jsx`** — מיניאטורת מפה למסכי מתווים

### 3.3 נתונים
- **`mockData.js`** — כל נתוני הדמו (hardcoded): שטחים, מתווים, שאלות בוחן, גורמי תיאום
- **`approvalScripts.js`** — תסריטי שיחה לכל גורם תיאום
- **`localStorage`** — שמירת מצב בוחן (`sadan_quiz_state`)

---

## 4. Backend

### 4.1 FastAPI (`main.py`)
**Endpoints:**
```
GET  /health                              — בדיקת חיים
POST /api/chat                            — צ'אט טקסט (דרך Orchestrator)
GET  /api/sessions/{id}                   — פרטי session
PATCH /api/sessions/{id}/flow-step        — עדכון שלב
GET  /api/sessions/{id}/coordination      — בקשות תיאום
PATCH /api/coordination/{id}/status       — עדכון אישור
```

### 4.2 Voice Router (`routers/voice.py`)
**Endpoints:**
```
POST /api/voice/chat        — טקסט → תגובת סדן (hardcoded/Claude) + TTS
POST /api/voice/tts         — טקסט → MP3 (ElevenLabs)
POST /api/voice/stt         — אודיו → טקסט (Whisper)
POST /api/voice/call        — הפעלת שיחה טלפונית (Vonage)
POST /api/voice/voice-note  — שליחת voice note (ElevenLabs + WhatsApp)
GET  /api/voice/ncco/{id}   — NCCO webhook ל-Vonage (answer URL)
POST /api/voice/events      — Vonage events webhook (stub)
WS   /api/voice/ws/{id}     — WebSocket לשיחת Vonage (Gemini V2V)
GET  /api/voice/health      — בדיקת שירותי קול
```

### 4.3 Gemini Voice Router (`routers/gemini_voice.py`)
```
GET  /gemini-voice          — דף HTML לבדיקת שיחה קולית
WS   /gemini-voice/ws       — WebSocket לצ'אט קולי in-app (Gemini Live)
```

### 4.4 Agents (`agents/`)
ארבעה סוכני Claude (לשימוש עתידי — לא פעילים בדמו):
- `TrainingPlannerAgent` — מייצר תוכניות אימון
- `ExerciseFileAgent` — מייצר תיק תרגיל
- `CoordinationAgent` — מייצר בקשות תיאום
- `ApprovalTrackerAgent` — מעקב אישורים

הסוכנים רשומים ב-`Orchestrator` וניתנים לנתב דרך `/api/chat`.

### 4.5 Services (`services/`)
| קובץ | תפקיד |
|---|---|
| `gemini_live_pipeline.py` | `GeminiLivePipeline` (browser↔Gemini) + `GeminiVonagePipeline` (phone↔Gemini) |
| `tts_service.py` | ElevenLabs TTS (voice "Brian") |
| `stt_service.py` | Whisper STT (מקומי) |
| `voice_pipeline_v2.py` | pipeline ישן (Google STT + Claude + Google TTS) |
| `voice_conversation_legacy.py` | legacy — לא בשימוש |

### 4.6 Database
- **SQLite** (`sadan.db`) + SQLAlchemy
- טבלאות: `TrainingSession`, `Message`, `CoordinationRequest`
- בדמו: DB לא בשימוש אקטיבי — נתונים הם hardcoded ב-`mockData.js`

---

## 5. זרימת שיחה טלפונית (Voice Call Flow)

```
1. משתמש לוחץ "שיחה טלפונית" במסך אישורים
         │
         ▼
2. Frontend → POST /api/voice/call {to, script_id}
         │
         ▼
3. Backend: שומר call_id ב-_active_calls (in-memory)
   שולח CreateCallRequest ל-Vonage API
         │
         ▼
4. Vonage מתקשר לטלפון היעד (+972...)
         │
5. משתמש עונה
         │
         ▼
6. Vonage → GET https://{cloudflare}/api/voice/ncco/{call_id}
         │
         ▼
7. Backend מחזיר NCCO:
   { action: "connect", websocket: "wss://{cloudflare}/api/voice/ws/{call_id}" }
         │
         ▼
8. Vonage פותח WebSocket ל-/api/voice/ws/{call_id}
         │
         ▼
9. Backend: GeminiVonagePipeline.run()
   - מתחבר ל-Gemini Live 2.5 (Vertex AI)
   - שולח "התחל שיחה" → Gemini אומר ברכת פתיחה
   - שתי tasks במקביל:
     _send_audio: Vonage(24kHz) → resample(16kHz) → Gemini
     _receive_audio: Gemini(24kHz) → Vonage + כלי send_whatsapp
         │
10. שיחה חיה — Gemini מנהל dialog מלא בעברית
```

**⚠️ חשוב:** `_active_calls` הוא in-memory. backend חייב לרוץ **ללא** `--reload`.

---

## 6. זרימת צ'אט קולי in-app (SadanChat Voice)

```
1. משתמש לוחץ כפתור מיקרופון ב-SadanChat
         │
         ▼
2. Browser: AudioContext(16kHz) + ScriptProcessor(4096)
   WebSocket → ws://localhost:8000/gemini-voice/ws
         │
         ▼
3. Backend: GeminiLivePipeline.run()
   - מתחבר ל-Gemini Live 2.5 (Vertex AI)
   - שתי tasks במקביל:
     _send_audio: PCM(16kHz) → Gemini
     _receive_audio: Gemini(24kHz) → Browser + JSON events
         │
4. Browser מנגן PCM דרך AudioContext(24kHz)
   מקבל JSON events: transcript, tool_calls, map_commands
```

**כלים שGemini יכול להפעיל:**
- `send_whatsapp` — שולח הודעה לווצאפ
- `map_fly_to`, `map_zoom`, `map_rotate`, `map_show_layer` — שליטה במפה
- `map_show_element` — הצגת אלמנט ספציפי בשטח 309ה
- `app_navigate` — ניווט בין מסכים
- `toggle_3d` — מצב תלת-מימד

---

## 7. WhatsApp Server (`demo_assets/whatsapp_server/`)

Node.js + `whatsapp-web.js` (Puppeteer).

**Endpoints:**
```
GET  /status        — בדיקת חיים + סטטוס חיבור
GET  /qr            — QR code לסריקה (HTML)
POST /send          — שליחת הודעה טקסט
POST /send-voice    — שליחת voice note (base64 audio)
GET  /messages      — הודעות נכנסות אחרונות
```

**אימות:** QR code חד-פעמי. Session נשמר ב-`.wwebjs_auth/`.

---

## 8. Cloudflare Tunnel

- **כלי:** `C:\Program Files (x86)\cloudflared\cloudflared.exe`
- **פקודה:** `cloudflared tunnel --url http://localhost:8000 --protocol http2`
- **URL:** `trycloudflare.com` — **משתנה בכל הפעלה!**
- **`start.ps1`** מפעיל את הטונל, מחכה ל-URL, ומעדכן `backend/.env` אוטומטית

**⚠️ חשוב:** אחרי כל הפעלה מחדש של הטונל — הbackend חייב להתאתחל גם הוא (כדי לטעון את `NGROK_HOST` החדש).

---

## 9. תצורה (`backend/.env`)

```
ANTHROPIC_API_KEY     — Claude API (Sonnet 4.6)
ELEVENLABS_API_KEY    — TTS (voice: Brian)
DEEPGRAM_API_KEY      — STT (לא בשימוש פעיל)
VONAGE_API_KEY        — Vonage Voice
VONAGE_API_SECRET     — Vonage auth
VONAGE_APP_ID         — Vonage application
VONAGE_PRIVATE_KEY_PATH — vonage_private.key
VONAGE_FROM_NUMBER    — מספר מוצא (+1 201...)
NGROK_HOST            — Cloudflare tunnel URL (מעודכן ע"י start.ps1)
```

**Vertex AI auth:** Application Default Credentials (`gcloud auth application-default login`). Project: `sadan-494209`, Region: `us-central1`.

---

## 10. מודל ה-AI

| שימוש | מודל | ספק | אופן חיבור |
|---|---|---|---|
| שיחה קולית (app + phone) | `gemini-live-2.5-flash-native-audio` | Google Vertex AI | WebSocket streaming (V2V) |
| צ'אט טקסט (REST fallback) | `claude-sonnet-4-6` | Anthropic | REST API |
| סוכנים (עתידי) | `claude-sonnet-4-6` | Anthropic | REST API |
| TTS | ElevenLabs Brian | ElevenLabs | REST API |

**Voice pipeline:** אין STT/TTS נפרדים לשיחות — Gemini Live מטפל בהכל פנימית (Voice-to-Voice).

---

## 11. הפעלה מהירה

```powershell
# מהתיקייה C:\Users\moruziel\sadan
powershell -ExecutionPolicy Bypass -File start.ps1
```

מה שה-script עושה:
1. מפעיל WhatsApp server (port 3001) — אם לא רץ
2. מפעיל Cloudflare tunnel → ממתין ל-URL → מעדכן `.env`
3. **מריסטרט backend** (כדי לטעון NGROK_HOST חדש) — ללא `--reload`
4. מפעיל Frontend (port 5173) — אם לא רץ
5. פותח דפדפן על `localhost:5173`
6. בודק health של כל השירותים

---

## 12. Real vs Fake בדמו

| רכיב | סטטוס | הסבר |
|---|---|---|
| מפה תלת-מימדית | ✅ Real | MapLibre + OpenTopoMap |
| ווצאפ לרז | ✅ Real | whatsapp-web.js → טלפון אמיתי |
| שיחה טלפונית | ✅ Real | Vonage → Gemini Live → טלפון |
| צ'אט קולי (app) | ✅ Real | Gemini Live WebSocket |
| נתוני שטח 309ה | 🔶 Fake | hardcoded ב-mockData.js |
| 3 מתווי תרגיל | 🔶 Fake | hardcoded, מאומתים ע"י רז |
| תיק תרגיל | 🔶 Fake | hardcoded, 7 חלקים |
| בוחן 8 שאלות | 🔶 Fake | hardcoded ב-mockData.js |
| אישורים אוטומטיים | 🔶 Fake | setTimeout simulation |

---

## 13. נקודות תשומת לב

1. **backend ללא `--reload`** — `_active_calls` הוא in-memory. `--reload` מוחק אותו בין requests.
2. **Cloudflare URL משתנה** — תמיד להפעיל דרך `start.ps1` לעדכון אוטומטי.
3. **cloudflared instances** — לסיים תהליכים ישנים לפני הפעלה חדשה (`Get-Process cloudflared | Stop-Process -Force`).
4. **Vertex AI auth** — צריך gcloud credentials תקפים. פג תוקף → שיחות נכשלות ללא error ברור.
5. **WhatsApp session** — לסרוק QR ב-`localhost:3001/qr` אחרי הפעלה ראשונה או אחרי logout.
