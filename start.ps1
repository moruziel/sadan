# ============================================================
#  SADAN - Start All Services
#  Run: powershell -ExecutionPolicy Bypass -File C:\Users\moruziel\sadan\start.ps1
#
#  מעלה את כל השירותים ממצב לא-ידוע, מאמת בפועל (לא רק "פורט פתוח") שכל
#  שירות מוכן, ומתקן אוטומטית תקלות ידועות (session וואטסאפ נעול/פגום).
#  אם משהו דורש פעולה ידנית (כמו סריקת QR) — הסקריפט מסביר בדיוק מה לעשות.
#
#  לפני דמו, הרץ גם: powershell -ExecutionPolicy Bypass -File test-system.ps1
#  (בודק שיחה אמיתית + הודעת וואטסאפ אמיתית יוצאות בהצלחה — ר' CLAUDE.md סעיף 19)
# ============================================================

$ROOT        = "C:\Users\moruziel\sadan"
$WADIR       = "$ROOT\demo_assets\whatsapp_server"
$WAAUTH      = "$WADIR\.wwebjs_auth"
$CFOUT       = "$env:TEMP\sadan_cf_out.log"
$CFERR       = "$env:TEMP\sadan_cf_err.log"
$CLOUDFLARED = "C:\Program Files (x86)\cloudflared\cloudflared.exe"
$ENVPATH     = "$ROOT\backend\.env"

. "$ROOT\scripts\sadan-checks.ps1"

function Write-Step { param($msg) Write-Host "`n$msg" -ForegroundColor Cyan }
function Write-OK   { param($msg) Write-Host "  [OK] $msg" -ForegroundColor Green }
function Write-Warn { param($msg) Write-Host "  [!!] $msg" -ForegroundColor Yellow }
function Write-Err  { param($msg) Write-Host "  [XX] $msg" -ForegroundColor Red }

function Port-InUse {
    param($port)
    $result = netstat -ano | Select-String ":$port " | Select-String "LISTENING"
    return ($null -ne $result)
}

Clear-Host
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "  SADAN - Startup" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan

# ── 1. WhatsApp server ───────────────────────────────────────
Write-Step "1. WhatsApp server (port 3001)"
if (-not (Port-InUse 3001)) {
    Start-Process powershell -ArgumentList @("-NoExit", "-Command", "cd '$WADIR'; node server.js") -WindowStyle Normal
    Write-OK "הופעל בחלון חדש"
    Start-Sleep 6
}

$waCheck = Test-WhatsAppReady
if (-not $waCheck.ok -and $waCheck.detail -like "*לא מגיב*") {
    # נכשל לעלות בכלל — לרוב session נעול/פגום (EBUSY ב-Windows). ננקה ונסה שוב פעם אחת.
    Write-Warn "WhatsApp server לא עלה — בודק session ישן..."
    if (Test-Path $WAAUTH) {
        Write-Warn "מוחק session ישן ($WAAUTH) ומנסה שוב..."
        Remove-Item $WAAUTH -Recurse -Force -ErrorAction SilentlyContinue
        Start-Process powershell -ArgumentList @("-NoExit", "-Command", "cd '$WADIR'; node server.js") -WindowStyle Normal
        Start-Sleep 8
        $waCheck = Test-WhatsAppReady
    }
}

# ── 2. Cloudflare tunnel — Backend (Vonage PSTN bridge only) ──
Write-Step "2. Cloudflare tunnel — Backend (לשיחות טלפון)"

if (Test-Path $CFOUT) { Remove-Item $CFOUT -Force -ErrorAction SilentlyContinue }
if (Test-Path $CFERR) { Remove-Item $CFERR -Force -ErrorAction SilentlyContinue }

Start-Process $CLOUDFLARED -ArgumentList @("tunnel", "--url", "http://localhost:8000", "--protocol", "http2") -RedirectStandardOutput $CFOUT -RedirectStandardError $CFERR -WindowStyle Hidden

$tunnelUrl = $null
Write-Host "  ממתין לכתובת" -NoNewline
for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep 1
    Write-Host "." -NoNewline
    $txt = ""
    if (Test-Path $CFOUT) { $txt += (Get-Content $CFOUT -Raw -ErrorAction SilentlyContinue) }
    if (Test-Path $CFERR) { $txt += (Get-Content $CFERR -Raw -ErrorAction SilentlyContinue) }
    if ($txt -match 'https://([a-z0-9\-]+\.trycloudflare\.com)') {
        $tunnelUrl = $matches[1]
        break
    }
}
Write-Host ""

if ($tunnelUrl) {
    # -Encoding UTF8 קריטי: בלי זה PowerShell 5.1 קורא קבצים בלי BOM לפי codepage
    # מקומי וגורם לקריסת קידוד (mojibake) לכל תו עברי בקובץ ב-round-trip הזה.
    $envContent = Get-Content $ENVPATH -Raw -Encoding UTF8
    $envContent = $envContent -replace 'NGROK_HOST=.*', "NGROK_HOST=$tunnelUrl"
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($ENVPATH, $envContent, $utf8NoBom)
    Write-OK ".env עודכן: $tunnelUrl"
} else {
    Write-Warn "לא התקבלה כתובת tunnel - נשארת הכתובת הקיימת ב-.env (כנראה לא תעבוד)"
}

# ── 3. Backend ───────────────────────────────────────────────
Write-Step "3. Backend (port 8000)"
if (Port-InUse 8000) {
    Write-Warn "פורט 8000 תפוס - מפעיל מחדש"
    $oldPid = (netstat -ano | Select-String ":8000 " | Select-String "LISTENING" | ForEach-Object { ($_ -split '\s+')[-1] } | Select-Object -First 1)
    if ($oldPid) { Stop-Process -Id ([int]$oldPid) -Force -ErrorAction SilentlyContinue }
    Start-Sleep 2
}
Start-Process powershell -ArgumentList @("-NoExit", "-Command", "cd '$ROOT'; python -m uvicorn backend.main:app --reload") -WindowStyle Normal
Write-OK "הופעל בחלון חדש"

# ── 4. Frontend ──────────────────────────────────────────────
Write-Step "4. Frontend (port 5173)"
if (-not (Port-InUse 5173)) {
    Start-Process powershell -ArgumentList @("-NoExit", "-Command", "cd '$ROOT\frontend'; npm run dev") -WindowStyle Normal
    Write-OK "הופעל בחלון חדש"
}

# ── 5. Cloudflare tunnel — Frontend (לטלפון נייד) ─────────────
# tunnel נפרד מזה של ה-backend — הטלפון מדבר רק עם ה-frontend,
# שמעביר פנימה (proxy ב-vite.config.js) ל-backend ולשרת הוואטסאפ.
Write-Step "5. Cloudflare tunnel — Frontend (לטלפון נייד)"

$CFOUT2 = "$env:TEMP\sadan_cf_frontend_out.log"
$CFERR2 = "$env:TEMP\sadan_cf_frontend_err.log"
if (Test-Path $CFOUT2) { Remove-Item $CFOUT2 -Force -ErrorAction SilentlyContinue }
if (Test-Path $CFERR2) { Remove-Item $CFERR2 -Force -ErrorAction SilentlyContinue }

Start-Process $CLOUDFLARED -ArgumentList @("tunnel", "--url", "http://localhost:5173", "--protocol", "http2") -RedirectStandardOutput $CFOUT2 -RedirectStandardError $CFERR2 -WindowStyle Hidden

$frontendTunnelUrl = $null
Write-Host "  ממתין לכתובת" -NoNewline
for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep 1
    Write-Host "." -NoNewline
    $txt = ""
    if (Test-Path $CFOUT2) { $txt += (Get-Content $CFOUT2 -Raw -ErrorAction SilentlyContinue) }
    if (Test-Path $CFERR2) { $txt += (Get-Content $CFERR2 -Raw -ErrorAction SilentlyContinue) }
    if ($txt -match 'https://([a-z0-9\-]+\.trycloudflare\.com)') {
        $frontendTunnelUrl = $matches[1]
        break
    }
}
Write-Host ""
if ($frontendTunnelUrl) {
    Write-OK "https://$frontendTunnelUrl"
} else {
    Write-Warn "לא התקבלה כתובת tunnel לפרונטאנד - דמו בטלפון לא יהיה זמין"
}

# ── 6. Open browser ──────────────────────────────────────────
Write-Step "6. פותח דפדפן..."
Start-Sleep 4
Start-Process "http://localhost:5173"

# ── 7. Real health checks (with retry, not just "port open") ─
Write-Step "7. בדיקות בריאות (ממתין לשירותים...)"

function Wait-Check {
    param($Name, $CheckBlock, $MaxTries = 8, $DelaySec = 3)
    for ($i = 0; $i -lt $MaxTries; $i++) {
        $result = & $CheckBlock
        if ($result.ok) { return $result }
        Start-Sleep $DelaySec
    }
    return $result
}

$backendResult  = Wait-Check -Name "Backend"  -CheckBlock { Test-Backend }
$frontendResult = Wait-Check -Name "Frontend" -CheckBlock { Test-Frontend }
$tunnelResult   = Wait-Check -Name "Tunnel"   -CheckBlock { Test-Tunnel -NgrokHost $tunnelUrl } -MaxTries 5
$mobileTunnelResult = Wait-Check -Name "MobileTunnel" -CheckBlock { Test-Tunnel -NgrokHost $frontendTunnelUrl } -MaxTries 5
$waResult       = Wait-Check -Name "WhatsApp" -CheckBlock { Test-WhatsAppReady } -MaxTries 10 -DelaySec 5
$vonageResult   = Test-VonageConfig -EnvPath $ENVPATH

# ── סיכום ──────────────────────────────────────────────────
Write-Host ""
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "  סיכום מצב המערכת" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan

$checks = @(
    @{ name = "Backend";       result = $backendResult }
    @{ name = "Frontend";      result = $frontendResult }
    @{ name = "Tunnel (שיחות)"; result = $tunnelResult }
    @{ name = "Tunnel (נייד)";  result = $mobileTunnelResult }
    @{ name = "WhatsApp";      result = $waResult }
    @{ name = "Vonage";        result = $vonageResult }
)

$allOk = $true
foreach ($c in $checks) {
    if ($c.result.ok) {
        Write-OK "$($c.name): $($c.result.detail)"
    } else {
        $allOk = $false
        Write-Warn "$($c.name): $($c.result.detail)"
        if ($c.result.fixHint) {
            Write-Host "        → $($c.result.fixHint)" -ForegroundColor DarkYellow
        }
    }
}

Write-Host ""
if ($allOk) {
    Write-Host "  הכל מוכן! מומלץ להריץ test-system.ps1 לבדיקה אמיתית לפני דמו." -ForegroundColor Green
} else {
    Write-Host "  יש פריטים שדורשים פעולה (ר' למעלה) לפני שהמערכת מוכנה לדמו." -ForegroundColor Yellow
}
Write-Host ""
Write-Host "  Frontend : http://localhost:5173"
Write-Host "  Backend  : http://localhost:8000/docs"
Write-Host "  WhatsApp : http://localhost:3001/qr"
if ($tunnelUrl)         { Write-Host "  Tunnel (שיחות) : https://$tunnelUrl" }
if ($frontendTunnelUrl) { Write-Host "  📱 קישור לטלפון : https://$frontendTunnelUrl" -ForegroundColor Green }
Write-Host "======================================================" -ForegroundColor Cyan
