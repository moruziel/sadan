# ============================================================
#  sadan-checks.ps1 — Shared health-check functions
#  Dot-sourced by start.ps1 and test-system.ps1. Do not run directly.
#  Each Test-* function returns: @{ ok = bool; detail = string; fixHint = string }
# ============================================================

function Test-Backend {
    try {
        $r = Invoke-WebRequest "http://localhost:8000/health" -UseBasicParsing -TimeoutSec 4 -ErrorAction Stop
        return @{ ok = $true; detail = "Backend (200)"; fixHint = "" }
    } catch {
        return @{ ok = $false; detail = "Backend not responding"; fixHint = "הרץ: python -m uvicorn backend.main:app --reload (מהשורש של הפרויקט)" }
    }
}

function Test-Frontend {
    try {
        $r = Invoke-WebRequest "http://localhost:5173" -UseBasicParsing -TimeoutSec 4 -ErrorAction Stop
        return @{ ok = $true; detail = "Frontend (200)"; fixHint = "" }
    } catch {
        return @{ ok = $false; detail = "Frontend not responding"; fixHint = "הרץ: npm run dev (מתוך תיקיית frontend)" }
    }
}

function Test-WhatsAppReady {
    try {
        $r = Invoke-WebRequest "http://localhost:3001/status" -UseBasicParsing -TimeoutSec 4 -ErrorAction Stop
        $data = $r.Content | ConvertFrom-Json
        if ($data.ready -eq $true) {
            return @{ ok = $true; detail = "WhatsApp מחובר (טלפון: $($data.phone))"; fixHint = "" }
        } else {
            return @{ ok = $false; detail = "WhatsApp רץ אך לא מחובר (ממתין ל-QR)"; fixHint = "פתח http://localhost:3001/qr וסרוק עם הטלפון" }
        }
    } catch {
        return @{ ok = $false; detail = "WhatsApp server לא מגיב"; fixHint = "הרץ: node server.js (מתוך demo_assets/whatsapp_server)" }
    }
}

function Test-Tunnel {
    param([string]$NgrokHost)
    if ([string]::IsNullOrWhiteSpace($NgrokHost)) {
        return @{ ok = $false; detail = "NGROK_HOST לא מוגדר ב-.env"; fixHint = "הרץ cloudflared tunnel --url http://localhost:8000 ועדכן NGROK_HOST" }
    }
    try {
        $r = Invoke-WebRequest "https://$NgrokHost/health" -UseBasicParsing -TimeoutSec 8 -ErrorAction Stop
        return @{ ok = $true; detail = "Tunnel חי: https://$NgrokHost"; fixHint = "" }
    } catch {
        return @{ ok = $false; detail = "Tunnel לא מגיב: https://$NgrokHost"; fixHint = "ה-tunnel כנראה מת (quick tunnels זמניים) — הרץ מחדש את start.ps1 כדי לקבל כתובת חדשה" }
    }
}

function Test-VonageConfig {
    param([string]$EnvPath)
    if (-not (Test-Path $EnvPath)) {
        return @{ ok = $false; detail = "backend\.env לא נמצא"; fixHint = "ודא שקובץ backend/.env קיים" }
    }
    $envContent = Get-Content $EnvPath -Raw
    $required = @("VONAGE_API_KEY", "VONAGE_API_SECRET", "VONAGE_APP_ID", "VONAGE_FROM_NUMBER")
    $missing = @()
    foreach ($key in $required) {
        if ($envContent -notmatch "(?m)^$key=.+") { $missing += $key }
    }
    # vonage_private_key_path ב-config.py הוא יחסי לשורש הפרויקט (שם רץ uvicorn), לא ל-backend/
    $projectRoot = Split-Path (Split-Path $EnvPath -Parent) -Parent
    $keyPath = Join-Path $projectRoot "vonage_private.key"
    if (-not (Test-Path $keyPath)) { $missing += "vonage_private.key (קובץ חסר ב-$keyPath)" }

    if ($missing.Count -eq 0) {
        return @{ ok = $true; detail = "Vonage מוגדר תקין"; fixHint = "" }
    } else {
        return @{ ok = $false; detail = "Vonage חסר: $($missing -join ', ')"; fixHint = "השלם את הערכים החסרים ב-backend/.env" }
    }
}
