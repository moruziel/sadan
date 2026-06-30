# ============================================================
#  SADAN - System Test (go/no-go before a demo)
#  Run: powershell -ExecutionPolicy Bypass -File C:\Users\moruziel\sadan\test-system.ps1
#
#  מניח שהמערכת כבר רצה — אם לא, הרץ קודם start.ps1.
#  מבצע בדיקה אמיתית מקצה לקצה: שולח הודעת וואטסאפ אמיתית ומבצע שיחת
#  טלפון אמיתית (ל-TEST_CALL_NUMBER ב-backend\.env), לא רק בודק שהשרתים עונים.
#  ר' CLAUDE.md סעיף 19.
# ============================================================

$ROOT    = "C:\Users\moruziel\sadan"
$ENVPATH = "$ROOT\backend\.env"

. "$ROOT\scripts\sadan-checks.ps1"

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

Clear-Host
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "  SADAN - בדיקת מערכת לפני דמו" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan

# ── 1. בדיקות חיבוריות בסיסיות ───────────────────────────────
Write-Step "1. בדיקות חיבוריות"

$ngrokHost = Get-EnvValue "NGROK_HOST"
$testCallNumber = Get-EnvValue "TEST_CALL_NUMBER"

$backendResult  = Test-Backend
$frontendResult = Test-Frontend
$waResult       = Test-WhatsAppReady
$tunnelResult   = Test-Tunnel -NgrokHost $ngrokHost
$vonageResult   = Test-VonageConfig -EnvPath $ENVPATH

$basicChecks = @(
    @{ name = "Backend";  result = $backendResult }
    @{ name = "Frontend"; result = $frontendResult }
    @{ name = "WhatsApp"; result = $waResult }
    @{ name = "Tunnel";   result = $tunnelResult }
    @{ name = "Vonage";   result = $vonageResult }
)

$basicOk = $true
foreach ($c in $basicChecks) {
    if ($c.result.ok) {
        Write-OK "$($c.name): $($c.result.detail)"
    } else {
        $basicOk = $false
        Write-Err "$($c.name): $($c.result.detail)"
        if ($c.result.fixHint) { Write-Host "        → $($c.result.fixHint)" -ForegroundColor DarkYellow }
    }
}

if (-not $basicOk) {
    Write-Host ""
    Write-Host "======================================================" -ForegroundColor Red
    Write-Host "  ❌ המערכת לא מוכנה — תקן את הפריטים למעלה" -ForegroundColor Red
    Write-Host "  טיפ: הרץ קודם powershell -ExecutionPolicy Bypass -File start.ps1" -ForegroundColor Red
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
        message = "Test SADAN $timestamp"
        phone   = $waTestPhone
    } | ConvertTo-Json -Compress

    # כתיבה לקובץ זמני UTF-8 (לא bsystem command line ישיר) — מונע קריסת קידוד עברית
    $tmpFile = [System.IO.Path]::GetTempFileName()
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($tmpFile, $waBody, $utf8NoBom)

    $r = Invoke-RestMethod -Uri "http://localhost:3001/send" -Method Post -InFile $tmpFile -ContentType "application/json; charset=utf-8" -TimeoutSec 20
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

        $r = Invoke-RestMethod -Uri "http://localhost:8000/api/voice/call" -Method Post -InFile $tmpFile2 -ContentType "application/json; charset=utf-8" -TimeoutSec 25
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
    Write-Host "  ✅ המערכת מוכנה לדמו" -ForegroundColor Green
} else {
    Write-Host "  ❌ יש בעיה — בדוק את ההודעות למעלה לפני הדמו" -ForegroundColor Red
}
Write-Host "======================================================" -ForegroundColor Cyan
