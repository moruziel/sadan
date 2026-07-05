# SADAN — תוכנית פריסה ל-GCP (דמו סלולרי יציב)

> **מסמך הנחיה ל-Claude Code.** קרא את כולו לפני שאתה מתחיל.
> המטרה: רז וברומר מתנסים בדמו הסלולרי מהטלפון שלהם, בזמנם, בלי תלות במחשב של מור.
> מור מעדכן גרסאות בפקודה אחת. צפי: 3–4 מחזורי פידבק עד הדמו.

---

## 0. עובדות מאומתות (נבדקו 2026-07-05 — אל תבדוק שוב, אל תניח אחרת)

| עובדה | ערך |
|---|---|
| חשבון gcloud מחובר במחשב של מור | `moris.uziel@gmail.com` |
| פרויקט GCP פעיל | `sadan-494209` (ACTIVE, billing **מופעל**) |
| APIs מופעלים בפרויקט | `aiplatform`, `speech`, `texttospeech`. ‏`compute` — **לא** מופעל עדיין (שלב B0) |
| Gemini Live בקוד | `backend/services/gemini_live_pipeline.py` — ‏Vertex AI עם `PROJECT_ID="sadan-494209"`, ‏`LOCATION="us-central1"`, אימות דרך ADC. **אין צורך במפתח API** — בשרת GCP ה-service account מספק אימות |
| Docker במחשב של מור | **לא מותקן** — לכן בנייה ובדיקות קונטיינרים נעשות **על ה-VM בלבד**, לא מקומית |
| gcloud CLI מקומי | מותקן (SDK 565), מחובר, פרויקט ברירת מחדל `sadan-494209` |
| Node מקומי | v24, npm 11 |
| Frontend | כל קריאות ה-API ב-URLs יחסיים (`/api`, `/wa`, `/gemini-voice`) — proxy בשרת יעבוד בלי שינויי קוד |
| חוקי proxy קיימים | `frontend/vite.config.js` — ‏`/api` ו-`/health` → ‏backend:8000, ‏`/gemini-voice` → ws ל-backend:8000, ‏`/wa` → whatsapp:3001 **עם הסרת הקידומת** `/wa` |
| Backend | FastAPI על 8000, ‏DB: ‏`sqlite:///./sadan.db` (נתיב יחסי ל-cwd — בדוק ב-`start.ps1` מאיזו תיקייה הוא מריץ uvicorn ושכפל בדיוק) |
| WhatsApp server | `demo_assets/whatsapp_server/server.js`, פורט 3001, ‏session ב-`./.wwebjs_auth` (LocalAuth), ‏puppeteer כבר עם `--no-sandbox` |
| Vonage | `answer_url` נבנה **פר-שיחה** בקוד מ-`NGROK_HOST` שב-`backend/.env` (‏`voice.py:430`). כלומר: עדכון `NGROK_HOST` לדומיין הקבוע מספיק כמעט לגמרי; רק לוודא שאין event_url ישן בדשבורד |
| מפתחות ב-`backend/.env` | ANTHROPIC, ELEVENLABS, DEEPGRAM, VONAGE_* , NGROK_HOST, TEST_CALL_NUMBER — כולם קיימים, מועברים לשרת ידנית (לא דרך git!) |

## 0.1 החלטות שמור כבר אישר (אל תשאל שוב)

- **פלטפורמה:** GCP VM בפרויקט `sadan-494209`, ‏e2-medium (‏4GB), ‏Ubuntu 24.04, ‏me-west1 (ת"א), IP סטטי.
- **דומיין:** `sadan-demo.duckdns.org` (חינם) + HTTPS של Let's Encrypt דרך Caddy.
- **Deploy מ-`main`** — אין branch נפרד (מור מפתח לבד).
- **שכבת הגנה:** basic auth ברמת Caddy. משתמשים: `mor` (סיסמה `0528942575`), `brumer` (סיסמה `0528341863`), ‏`raz` (סיסמה `0505063003`).
- **עלות אושרה:** ‏billing plan נוכחי בפרויקט `sadan-494209` (~30$/חודש). אין צורך לעצור לאישור עלות לפני שלב B.
- **וואטסאפ:** אותו session/מספר פרטי של מור — סריקת QR פעם אחת בשרת.
- **קבצים חדשים מאושרים:** `deploy/` (Dockerfiles, Caddyfile, docker-compose.yml), ‏`deploy.ps1`, ‏`docs/deploy.md`, שינוי מזערי אחד ב-`server.js` (ראה A3). **שום שינוי אחר בקוד האפליקציה בלי אישור מור.**

## 0.2 כללי עבודה מחייבים

1. **שמירת גרסאות תוך כדי:** ‏commit אחרי כל משימה (conventional commits), ‏tag בסוף כל שלב (`cloud-phase-a`, `cloud-phase-b`...), ו-tag לכל גרסה שנפרסת (`demo-v1`, `demo-v2`...). ‏push ל-origin אחרי כל tag.
2. **כל בדיקה שנכשלת — עצור, אבחן, תקן, בדוק שוב.** אל תמשיך לשלב הבא עם בדיקה אדומה.
3. **עצור ושאל את מור:** לפני כל שינוי בקוד האפליקציה שלא מפורט כאן; לפני שלב B (אישור עלות ~30$/חודש); לפני שליחת כל דבר לרז/ברומר.
4. `start.ps1` וזרימת הפיתוח המקומית — **לא נוגעים.** הכל תוספתי.
5. פקודות על ה-VM מריצים דרך `gcloud compute ssh sadan-demo --zone=<zone> --command="..."` מהמחשב של מור.

---

## 1. ארכיטקטורת יעד

```
רז/ברומר (טלפון) ──https://sadan-demo.duckdns.org──▶ GCP VM (me-west1)
                                                      │
    Caddy (:80/:443, קונטיינר "web")                  │
      ├─ basic auth (mor/raz/brumer) — למעט /api/voice/* ו-/health
      ├─ /              → קבצי frontend בנויים (dist)
      ├─ /api, /health  → backend:8000
      ├─ /gemini-voice  → backend:8000 (WebSocket)
      └─ /wa/*          → whatsapp:3001 (מסיר קידומת /wa)
    Backend (FastAPI + SpeechBrain + Vertex/Gemini Live + Vonage)
    WhatsApp (whatsapp-web.js + Chromium, session על volume)
```

Vonage מתקשר ישירות ל-`https://sadan-demo.duckdns.org/api/voice/...` (לכן הנתיב הזה פטור מ-basic auth).

---

## שלב A — הכנת הריפו (מקומי, בלי Docker)

### A0 — נקודת בסיס
```
git tag pre-cloud-baseline && git push origin pre-cloud-baseline
```

### A1 — אימות production build של ה-frontend
עד היום רץ רק dev server. הרץ:
```
cd frontend && npm run build
```
**בדיקה:** ה-build עובר בלי שגיאות; נוצר `frontend/dist/index.html`. הרץ `npx vite preview` ופתח בדפדפן — מסך הכניסה נטען, אין שגיאות אדומות ב-console (חוץ מכשלי proxy — צפוי, אין backend מאחורי preview).
אם ה-build נכשל על קוד קיים — עצור ושאל את מור לפני תיקון.
**Commit:** `chore: verify frontend production build`.

### A2 — `deploy/backend.Dockerfile`
- בסיס `python:3.11-slim`.
- ‏apt: ‏`ffmpeg libsndfile1` (ל-torchaudio/עיבוד אודיו) + ‏`curl` (ל-healthcheck).
- **torch ל-CPU לפני requirements** (חוסך ~4GB): `pip install torch --index-url https://download.pytorch.org/whl/cpu` ואז `pip install -r requirements.txt`.
- `ENV HF_HOME=/data/hf_cache` — המודל של SpeechBrain (‏`speechbrain/spkrec-ecapa-voxceleb`, יורד מ-HuggingFace בריצה ראשונה) יישמר על volume וישרוד עדכונים.
- ‏WORKDIR ופקודת ההרצה: **שכפל בדיוק את האופן שבו `start.ps1` מריץ את ה-backend** (אותו cwd — קריטי בגלל `sqlite:///./sadan.db` ובגלל `vonage_private.key` שנטען מנתיב יחסי). בדוק לפני שאתה כותב.
- חשוף פורט 8000.

### A3 — `deploy/whatsapp.Dockerfile`
- בסיס `node:20-slim` + ‏apt ‏`chromium` וכל ספריות התלות שלו + `curl`.
- `npm ci` עם `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true`.
- **שינוי הקוד היחיד המאושר:** ב-`demo_assets/whatsapp_server/server.js`, בהגדרת ה-client, הוסף:
  `executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined` — כך בשרת ישתמש ב-Chromium של המערכת, ומקומית שום דבר לא משתנה.
- Volume ל-`.wwebjs_auth` (ה-session שורד rebuild/restart).

### A4 — `deploy/Caddyfile`
```
sadan-demo.duckdns.org {
    # פטורים מ-basic auth: webhooks של Vonage + בדיקת חיים לניטור
    @public path /api/voice/* /health
    handle @public { ... proxy ל-backend:8000 ... }

    basic_auth {
        mor    <bcrypt>   # סיסמה: 0528942575
        brumer <bcrypt>   # סיסמה: 0528341863
        raz    <bcrypt>   # סיסמה: 0505063003
    }
    handle_path /wa/* { reverse_proxy whatsapp:3001 }
    handle /api/*          { reverse_proxy backend:8000 }
    handle /gemini-voice*  { reverse_proxy backend:8000 }   # Caddy מטפל ב-WS אוטומטית
    handle { root * /srv/dist ; try_files {path} /index.html ; file_server }
}
```
(סכמה — כתוב Caddyfile תקני מלא. hashes מייצרים עם `docker run --rm caddy caddy hash-password`.)
**שים לב:** ההתאמה חייבת לשכפל 1:1 את חוקי ה-proxy מ-`vite.config.js`, כולל הסרת `/wa` וכולל SPA fallback ל-`index.html`.

### A5 — `deploy/web.Dockerfile` + `deploy/docker-compose.yml`
- `web.Dockerfile`: ‏multi-stage — שלב 1 ‏`node:20` שבונה את ה-frontend (‏`npm ci && npm run build`), שלב 2 ‏`caddy:2` עם ה-dist וה-Caddyfile. כך אין צורך ב-Node מותקן על ה-VM.
- `docker-compose.yml` — שלושה services: ‏`web` (פורטים 80/443), ‏`backend`, ‏`whatsapp`. לכולם `restart: unless-stopped` ו-healthcheck (‏backend: ‏`/health`; ‏whatsapp: ‏`/status`; ‏web: תגובת HTTP).
- Volumes: ‏`caddy_data` (תעודות TLS), ‏`hf_cache`, ‏`wa_auth`, ותיקיית `secrets/` בשרת שממופה ל-`.env` + ‏`vonage_private.key` + ‏`sadan.db`.
- **בדיקה מקומית אפשרית בלי Docker:** רק תחביר — ‏review ידני. הבדיקה האמיתית בשלב C.
**Commit + tag:** `feat: docker deployment stack for GCP demo hosting` ← ‏`cloud-phase-a`.

### A6 — `deploy.ps1` (בשורש, ליד `start.ps1`)
זרימה: ‏(1) ודא working tree נקי — אחרת עצור עם הודעה; ‏(2) קבע גרסה — `demo-vN` הבא (או `-Tag` שהועבר כפרמטר → ‏rollback לגרסה ישנה); ‏(3) ‏`git tag` + ‏push; ‏(4) ‏`git archive --format=tar.gz <tag>` → העלאה ל-VM עם `gcloud compute scp`; ‏(5) ‏ssh: פריסה ל-`/opt/sadan/app`, ‏`docker compose up -d --build`; ‏(6) בדיקת עשן: ‏`https://sadan-demo.duckdns.org/health` מחזיר 200, הדף הראשי מחזיר 401 בלי סיסמה ו-200 איתה, ‏`/wa/status` (עם סיסמה) עונה; ‏(7) טבלת סיכום בעברית בסגנון `start.ps1`.
**בדיקה:** הרצה כפולה ברצף לא שוברת כלום; ‏`deploy.ps1 -Tag demo-v1` מחזיר גרסה קודמת.

### A7 — `docs/deploy.md`
‏runbook קצר: איך פורסים, איך רואים לוגים (`docker compose logs -f backend`), איך מאתחלים שירות, איך משחזרים VM מאפס, איך עושים rollback. **Commit.**

---

## שלב B — תשתית GCP (העלות אושרה ע"י מור — אין צורך לעצור)

| # | פעולה | פקודה (מהמחשב של מור) | בדיקה |
|---|---|---|---|
| B0 | הפעלת Compute API | `gcloud services enable compute.googleapis.com` | הפקודה מסתיימת בהצלחה |
| B1 | IP סטטי | `gcloud compute addresses create sadan-demo-ip --region=me-west1` | `gcloud compute addresses describe` מחזיר IP |
| B2 | יצירת VM | `gcloud compute instances create sadan-demo --zone=me-west1-a --machine-type=e2-medium --image-family=ubuntu-2404-lts-amd64 --image-project=ubuntu-os-cloud --boot-disk-size=30GB --address=<IP> --tags=sadan-web --scopes=cloud-platform` | `gcloud compute ssh sadan-demo --zone=me-west1-a --command="echo ok"` |
| B3 | Firewall | `gcloud compute firewall-rules create sadan-allow-web --allow=tcp:80,tcp:443 --target-tags=sadan-web` | מבחוץ: 80/443 פתוחים בלבד (בנוסף ל-SSH של GCP) |
| B4 | הרשאת Vertex ל-VM | הענק ל-service account של ה-VM את `roles/aiplatform.user` בפרויקט | קריאת בדיקה קטנה ל-Vertex מה-VM מצליחה (סקריפט python קצר עם ADC) |
| B5 | Docker בשרת | ‏ssh: ‏`curl -fsSL https://get.docker.com \| sh` | `docker run hello-world` |
| B6 | DuckDNS | **פעולה של מור (2 דק'):** להיכנס ל-duckdns.org עם חשבון Google, לרשום subdomain ‏`sadan-demo`, ולהזין את ה-IP הסטטי | `nslookup sadan-demo.duckdns.org` מחזיר את ה-IP |

אם `sadan-demo` תפוס ב-DuckDNS — מור בוחר שם חלופי; עדכן את ה-Caddyfile בהתאם.
אם e2-medium לא זמין ב-me-west1-a — נסה me-west1-b/c, ואז europe-west1.
**Tag:** `cloud-phase-b`.

## שלב C — Deploy ראשון

| # | פעולה | בדיקה |
|---|---|---|
| C1 | העברת סודות **ידנית** (לא דרך git): צור עותק של `backend/.env` עם `NGROK_HOST=sadan-demo.duckdns.org`, והעלה עם `gcloud compute scp` יחד עם `vonage_private.key` ו-`sadan.db` ל-`/opt/sadan/secrets/`. ‏`chmod 600` | הקבצים בשרת; ה-`.env` המקומי של מור לא השתנה |
| C2 | ‏deploy ראשון: `.\deploy.ps1` ← ‏`demo-v1` | `https://sadan-demo.duckdns.org` נפתח עם תעודה תקינה; דורש סיסמה; אחרי סיסמה — מסך כניסה של SADAN |
| C3 | וואטסאפ: מור פותח `https://sadan-demo.duckdns.org/wa/qr` וסורק מהטלפון (פעם אחת) | `/wa/status` ‏connected; ‏`docker compose restart whatsapp` → עדיין connected בלי סריקה חוזרת |
| C4 | ‏Vonage: ‏`answer_url` נשלח פר-שיחה מהקוד — אין מה לשנות בדשבורד, רק ודא שאין event_url ישן שמפריע | שיחת בדיקה ל-`TEST_CALL_NUMBER` (מוגדר ב-.env) עוברת ודו-כיוונית |

זכור: בריצה הראשונה ה-backend מוריד את מודל SpeechBrain (~100MB) — ההפעלה הראשונה איטית; ודא שה-healthcheck סובלני מספיק.
**Tag:** `cloud-phase-c`.

## שלב D — בדיקות קבלה (מהטלפון של מור, לא מהמחשב)

| # | בדיקה | קריטריון עובר |
|---|---|---|
| D1 | פתיחת הקישור בטלפון — ‏WiFi **וגם** רשת סלולרית; הזנת סיסמה פעם אחת | מסך כניסה < 3 שניות; בפתיחה חוזרת לא נדרשת סיסמה שוב |
| D2 | כניסה קולית (מיקרופון + זיהוי דובר SpeechBrain) | עוברת |
| D3 | זרימת דמו מלאה: מפה תלת-ממדית → שאלון → 3 מתווים → תיק תרגיל → בוחן | כל מסך תקין |
| D4 | ניווט קולי (Gemini Live דרך `/gemini-voice`) | פקודות קול עובדות, ‏latency סביר. **סיכון ידוע:** WebSocket + basic auth ב-iOS Safari — אם נכשל, עצור והתייעץ עם מור (חלופה: פטור ל-ws או טוקן) |
| D5 | וואטסאפ אמיתי + שיחת טלפון אמיתית מתוך הזרימה | ההודעה מגיעה, השיחה נענית |
| D6 | **יציבות:** ‏`gcloud compute instances reset sadan-demo` (אתחול VM מלא) | תוך ~3 דק' הכל חוזר לבד: אתר, backend, וואטסאפ מחובר — אפס מגע יד |
| D7 | שני משתמשים במקביל (מור בטלפון + דפדפן במחשב) | אין קריסה, אין ערבוב sessions |
| D8 | סקריפט `test-remote.ps1` (או פרמטר `-Remote` ל-`test-system.ps1`): אותן בדיקות אמת — כולל הודעת וואטסאפ ושיחה אמיתית — מול הדומיין במקום localhost. השתמש ב-`scripts/sadan-checks.ps1` הקיים | ✅ "מוכן לדמו" מול השרת |
| D9 | זיכרון: ‏`free -m` אחרי כל הבדיקות | יש מרווח; אם צפוף — הוסף 2GB swap ותעד ב-`docs/deploy.md` |

**Tag:** `cloud-phase-d`.

## שלב E — מסירה ותפעול

| # | פעולה |
|---|---|
| E1 | ניטור: מוניטור HTTPS חינמי (UptimeRobot) על `/health` (פטור מסיסמה בכוונה) → מייל למור בנפילה. **מור צריך להירשם** — הכן לו הוראות של 3 שורות |
| E2 | נסח הודעת "איך משתמשים" קצרה לרז וברומר (קישור, שם משתמש, "הסיסמה — מספר הנייד שלך") — **הצג למור לאישור, אל תשלח בעצמך** |
| E3 | מחזור פידבק שוטף: פידבק → תיקון → ‏commit → ‏`.\deploy.ps1` → ‏`demo-v(N+1)` באוויר תוך דקות. ‏rollback: ‏`.\deploy.ps1 -Tag demo-vN` |

---

## פרטים פתוחים (להשלים מול מור תוך כדי)

1. **DuckDNS** — פעולת רישום של מור בשלב B6.
2. **UptimeRobot** — רישום של מור בשלב E1.

## הערות סטטוס (עדכון 5.7.2026)

- ‏git remote כבר אובטח: הטוקן של GitHub הוסר מכתובת ה-remote ומ-`~/.gitconfig` (חוק insteadOf) ומאוחסן ב-Windows Credential Manager. ‏push/fetch עובדים רגיל. אם GitHub ידרוש אימות מחדש מתישהו — מור ייצור טוקן חדש (עדיף fine-grained).
