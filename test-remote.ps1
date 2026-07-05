# ============================================================
#  SADAN - Remote System Test (go/no-go for the cloud demo)
#  Run: powershell -ExecutionPolicy Bypass -File C:\Users\moruziel\sadan\test-remote.ps1
#
#  בודק את השרת בענן (https://sadan-demo.duckdns.org) — לא localhost.
#  מבצע בדיקה אמיתית מקצה לקצה: הודעת וואטסאפ אמיתית ושיחת טלפון
#  אמיתית (ל-TEST_CALL_NUMBER ב-backend\.env), בדיוק כמו test-system.ps1
#  אבל מול הפריסה בענן. ר' docs/deploy.md.
# ============================================================

$ROOT    = "C:\Users\moruziel\sadan"
$ENVPATH = "$ROOT\backend\.env"
$DOMAIN  = "sadan-demo.duckdns.org"
$AUTH_USER = "mor"
$AUTH_PASS = "0528942575"

function Write-Step { param($msg) Write-Host "`n$msg" -ForegroundColor Cyan }
function Write-OK   { param($msg) Write-Host "  [OK] $msg" -ForegroundColor Green }
function Write-Warn { param($msg) Write-Host "  [!!] $msg" -ForegroundColor Yellow }
function Write-Err  { param($msg) Write-Host "  [XX] $msg" -ForegroundColor Red }

function Get-EnvValue {
    param([string]$Key)
    if (-not (Test-Path $ENVPATH)) { return $null }
    $line = Get-Content $ENVPATH | Where-Object { $_ -match "^$Key=" } | Select-Object -First 1
    if (-not $line) { return $null }
    return ($line -split '=', 2)[1].Trim()
}

$pair = [System.Convert]::ToBase64String([System.Text.Encoding]::ASCII.GetBytes("${AUTH_USER}:${AUTH_PASS}"))
$authHeaders = @{ Authorization = "Basic $pair" }

Clear-Host
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "  SADAN - בדיקת השרת בענן ($DOMAIN)" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan

$testCallNumber = Get-EnvValue "TEST_CALL_NUMBER"

# ── 1. בדיקות חיבוריות בסיסיות ───────────────────────────────
Write-Step "1. בדיקות חיבוריות"

$basicOk = $true

# Health (בלי סיסמה — פטור מכוונת בשביל UptimeRobot)
try {
    $r = Invoke-WebRequest -Uri "https://$DOMAIN/health" -UseBasicParsing -TimeoutSec 15
    Write-OK "Backend health: HTTP $($r.StatusCode)"
} catch {
    $basicOk = $false
    Write-Err "Backend health נכשל: $($_.Exception.Message)"
}

# Frontend בלי סיסמה — חייב 401
try {
    $r = Invoke-WebRequest -Uri "https://$DOMAIN/" -UseBasicParsing -TimeoutSec 15
    $basicOk = $false
    Write-Err "האתר נגיש בלי סיסמה (HTTP $($r.StatusCode)) — basic auth לא פעיל!"
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 401) {
        Write-OK "Basic auth פעיל (401 בלי סיסמה)"
    } else {
        $basicOk = $false
        Write-Err "האתר לא עונה: $($_.Exception.Message)"
    }
}

# Frontend עם סיסמה — חייב 200
try {
    $r = Invoke-WebRequest -Uri "https://$DOMAIN/" -Headers $authHeaders -UseBasicParsing -TimeoutSec 15
    Write-OK "Frontend נטען עם סיסמה: HTTP $($r.StatusCode)"
} catch {
    $basicOk = $false
    Write-Err "Frontend נכשל עם סיסמה: $($_.Exception.Message)"
}

# WhatsApp status
$waReady = $false
try {
    $r = Invoke-RestMethod -Uri "https://$DOMAIN/wa/status" -Headers $authHeaders -TimeoutSec 15
    if ($r.ready -eq $true) {
        $waReady = $true
        Write-OK "WhatsApp מחובר (ready: true)"
    } else {
        $basicOk = $false
        Write-Err "WhatsApp לא מחובר (ready: false) — סרוק QR: https://$DOMAIN/wa/qr"
    }
} catch {
    $basicOk = $false
    Write-Err "WhatsApp server לא עונה: $($_.Exception.Message)"
}

if (-not $basicOk) {
    Write-Host ""
    Write-Host "======================================================" -ForegroundColor Red
    Write-Host "  ❌ השרת לא מוכן — תקן את הפריטים למעלה" -ForegroundColor Red
    Write-Host "  טיפ: לוגים — ר' docs/deploy.md" -ForegroundColor Red
    Write-Host "======================================================" -ForegroundColor Red
    exit 1
}

if (-not $testCallNumber) {
    Write-Warn "TEST_CALL_NUMBER לא מוגדר ב-backend\.env — מדלג על בדיקת שיחה אמיתית"
}

# ── 2. שליחת הודעת וואטסאפ אמיתית ────────────────────────────
Write-Step "2. שליחת הודעת וואטסאפ אמיתית"

$waTestPhone = $testCallNumber
if (-not $waTestPhone) { $waTestPhone = "972528942575" }

$waOk = $false
try {
    $timestamp = Get-Date -Format "HH:mm:ss"
    $waBody = @{
        message = "Test SADAN cloud $timestamp"
        phone   = $waTestPhone
    } | ConvertTo-Json -Compress

    # כתיבה לקובץ זמני UTF-8 — מונע קריסת קידוד עברית
    $tmpFile = [System.IO.Path]::GetTempFileName()
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($tmpFile, $waBody, $utf8NoBom)

    $r = Invoke-RestMethod -Uri "https://$DOMAIN/wa/send" -Method Post -Headers $authHeaders -InFile $tmpFile -ContentType "application/json; charset=utf-8" -TimeoutSec 20
    Remove-Item $tmpFile -Force -ErrorAction SilentlyContinue

    if ($r.ok -eq $true) {
        Write-OK "וואטסאפ נשלח בהצלחה ל-$waTestPhone (יעד: $($r.to))"
        $waOk = $true
    } else {
        Write-Err "וואטסאפ נכשל: $($r | ConvertTo-Json -Compress)"
    }
} catch {
    Write-Err "וואטסאפ נכשל: $($_.Exception.Message)"
}

# ── 3. שיחת טלפון אמיתית ──────────────────────────────────────
$callOk = $false
if ($testCallNumber) {
    Write-Step "3. שיחת טלפון אמיתית ל-$testCallNumber"
    try {
        $callBody = @{ to = $testCallNumber; script_id = "rtg" } | ConvertTo-Json -Compress
        $tmpFile2 = [System.IO.Path]::GetTempFileName()
        $utf8NoBom = New-Object System.Text.UTF8Encoding $false
        [System.IO.File]::WriteAllText($tmpFile2, $callBody, $utf8NoBom)

        $r = Invoke-RestMethod -Uri "https://$DOMAIN/api/voice/call" -Method Post -InFile $tmpFile2 -ContentType "application/json; charset=utf-8" -TimeoutSec 25
        Remove-Item $tmpFile2 -Force -ErrorAction SilentlyContinue

        if ($r.status -eq "calling") {
            Write-OK "שיחה יצאה בהצלחה (call_id: $($r.call_id)) — הטלפון אמור לצלצל עכשיו"
            $callOk = $true
        } else {
            Write-Err "שיחה נכשלה: $($r.error)"
        }
    } catch {
        Write-Err "שיחה נכשלה: $($_.Exception.Message)"
    }
} else {
    Write-Step "3. שיחת טלפון אמיתית"
    Write-Warn "דולג — TEST_CALL_NUMBER לא מוגדר"
}

# ── סיכום ──────────────────────────────────────────────────
Write-Host ""
Write-Host "======================================================" -ForegroundColor Cyan
if ($waOk -and ($callOk -or -not $testCallNumber)) {
    Write-Host "  ✅ השרת בענן מוכן לדמו — https://$DOMAIN" -ForegroundColor Green
} else {
    Write-Host "  ❌ יש בעיה — בדוק את ההודעות למעלה לפני הדמו" -ForegroundColor Red
}
Write-Host "======================================================" -ForegroundColor Cyan
