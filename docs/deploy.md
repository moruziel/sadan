# SADAN — Runbook לפריסה ב-GCP

## פריסה רגילה (מהמחשב של מור)

```powershell
# ודא שהכל ב-commit, ואז:
.\deploy.ps1
```

הסקריפט יוצר tag `demo-vN`, מעלה לשרת, בונה, ומריץ בדיקות עשן.

## Rollback

```powershell
.\deploy.ps1 -Tag demo-v1
```

## צפייה בלוגים

```bash
# מהמחשב של מור:
gcloud compute ssh sadan-demo --zone=me-west1-a --command="cd /opt/sadan/app/deploy && sudo docker compose logs -f backend"

# רק שגיאות:
gcloud compute ssh sadan-demo --zone=me-west1-a --command="cd /opt/sadan/app/deploy && sudo docker compose logs -f backend 2>&1 | grep -i error"

# כל השירותים:
gcloud compute ssh sadan-demo --zone=me-west1-a --command="cd /opt/sadan/app/deploy && sudo docker compose logs -f"
```

## אתחול שירות בודד

```bash
gcloud compute ssh sadan-demo --zone=me-west1-a --command="cd /opt/sadan/app/deploy && sudo docker compose restart backend"
```

## סטטוס

```bash
gcloud compute ssh sadan-demo --zone=me-west1-a --command="cd /opt/sadan/app/deploy && sudo docker compose ps"
```

## שחזור VM מאפס

1. צור VM חדש (שלב B בתוכנית)
2. עדכן DNS ב-DuckDNS לIP החדש
3. התקן Docker:
   ```bash
   gcloud compute ssh sadan-demo --zone=me-west1-a --command="curl -fsSL https://get.docker.com | sh"
   ```
4. העלה סודות:
   ```powershell
   gcloud compute scp backend/.env sadan-demo:/opt/sadan/secrets/.env --zone=me-west1-a
   gcloud compute scp vonage_private.key sadan-demo:/opt/sadan/secrets/vonage_private.key --zone=me-west1-a
   gcloud compute scp sadan.db sadan-demo:/opt/sadan/secrets/sadan.db --zone=me-west1-a
   gcloud compute ssh sadan-demo --zone=me-west1-a --command="sudo chmod 600 /opt/sadan/secrets/*"
   ```
5. עדכן `NGROK_HOST=sadan-demo.duckdns.org` ב-`.env` בשרת
6. פרוס: `.\deploy.ps1`
7. סרוק QR לווצאפ: `https://sadan-demo.duckdns.org/wa/qr`

## סריקת QR לווצאפ (אחרי deploy ראשון או אחרי שה-session פג)

פתח בדפדפן: `https://sadan-demo.duckdns.org/wa/qr` (דורש סיסמה)
סרוק מהטלפון של מור → מכשירים מקושרים.

## מבנה השרת

```
/opt/sadan/
├── app/          ← קוד (מתעדכן בכל deploy)
│   ├── deploy/   ← docker-compose.yml, Dockerfiles
│   ├── backend/
│   ├── frontend/
│   └── demo_assets/
└── secrets/      ← לא ב-git!
    ├── .env
    ├── vonage_private.key
    └── sadan.db
```
