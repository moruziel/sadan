# ============================================================
#  SADAN - Start All Services
#  Run: powershell -ExecutionPolicy Bypass -File C:\Users\moruziel\sadan\start.ps1
# ============================================================

$ROOT        = "C:\Users\moruziel\sadan"
$WADIR       = "$ROOT\demo_assets\whatsapp_server"
$CFOUT       = "$env:TEMP\sadan_cf_out.log"
$CFERR       = "$env:TEMP\sadan_cf_err.log"
$CLOUDFLARED = "C:\Program Files (x86)\cloudflared\cloudflared.exe"

function Write-Step { param($msg) Write-Host "`n$msg" -ForegroundColor Cyan }
function Write-OK   { param($msg) Write-Host "  [OK] $msg" -ForegroundColor Green }
function Write-Warn { param($msg) Write-Host "  [!!] $msg" -ForegroundColor Yellow }

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
if (Port-InUse 3001) {
    Write-OK "Already running - skipping"
} else {
    Start-Process powershell -ArgumentList @("-NoExit", "-Command", "cd '$WADIR'; node server.js") -WindowStyle Normal
    Write-OK "Started in new window"
}

# ── 2. Cloudflare tunnel ─────────────────────────────────────
Write-Step "2. Cloudflare tunnel"

if (Test-Path $CFOUT) { Remove-Item $CFOUT -Force -ErrorAction SilentlyContinue }
if (Test-Path $CFERR) { Remove-Item $CFERR -Force -ErrorAction SilentlyContinue }

Start-Process $CLOUDFLARED -ArgumentList @("tunnel", "--url", "http://localhost:8000", "--protocol", "http2") -RedirectStandardOutput $CFOUT -RedirectStandardError $CFERR -WindowStyle Hidden

$tunnelUrl = $null
Write-Host "  Waiting for URL" -NoNewline
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
    Write-OK "https://$tunnelUrl"
    $envPath = "$ROOT\backend\.env"
    $envContent = Get-Content $envPath -Raw
    $envContent = $envContent -replace 'NGROK_HOST=.*', "NGROK_HOST=$tunnelUrl"
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($envPath, $envContent, $utf8NoBom)
    Write-OK ".env updated"
} else {
    Write-Warn "Tunnel URL not found - keeping existing .env"
}

# ── 3. Backend ───────────────────────────────────────────────
Write-Step "3. Backend (port 8000)"
if (Port-InUse 8000) {
    Write-Warn "Port 8000 in use - restarting"
    $oldPid = (netstat -ano | Select-String ":8000 " | Select-String "LISTENING" | ForEach-Object { ($_ -split '\s+')[-1] } | Select-Object -First 1)
    if ($oldPid) { Stop-Process -Id ([int]$oldPid) -Force -ErrorAction SilentlyContinue }
    Start-Sleep 2
}
Start-Process powershell -ArgumentList @("-NoExit", "-Command", "cd '$ROOT'; python -m uvicorn backend.main:app --reload") -WindowStyle Normal
Write-OK "Started in new window"

# ── 4. Frontend ──────────────────────────────────────────────
Write-Step "4. Frontend (port 5173)"
if (Port-InUse 5173) {
    Write-OK "Already running - skipping"
} else {
    Start-Process powershell -ArgumentList @("-NoExit", "-Command", "cd '$ROOT\frontend'; npm run dev") -WindowStyle Normal
    Write-OK "Started in new window"
}

# ── 5. Open browser ──────────────────────────────────────────
Write-Step "5. Opening browser..."
Start-Sleep 3
Start-Process "http://localhost:5173"

# ── 6. Health checks ────────────────────────────────────────
Write-Step "6. Health checks (waiting for backend...)"
Start-Sleep 4

$backendOk = $false
for ($i = 0; $i -lt 5; $i++) {
    try {
        $r = Invoke-WebRequest "http://localhost:8000/docs" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
        Write-OK "Backend (200)"
        $backendOk = $true
        break
    } catch {
        Start-Sleep 3
    }
}
if (-not $backendOk) { Write-Warn "Backend did not respond - check the backend window" }

try {
    $r = Invoke-WebRequest "http://localhost:3001/status" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
    Write-OK "WhatsApp server (200)"
} catch {
    Write-Warn "WhatsApp server - no response"
}

try {
    $r = Invoke-WebRequest "http://localhost:5173" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
    Write-OK "Frontend (200)"
} catch {
    Write-Warn "Frontend - no response"
}

# ── Summary ──────────────────────────────────────────────────
Write-Host ""
Write-Host "======================================================" -ForegroundColor Cyan
if ($backendOk) {
    Write-Host "  All services ready!" -ForegroundColor Green
} else {
    Write-Host "  WARNING: Backend failed to start" -ForegroundColor Red
}
Write-Host "  Frontend  : http://localhost:5173"
Write-Host "  Backend   : http://localhost:8000/docs"
Write-Host "  WhatsApp  : http://localhost:3001/qr"
if ($tunnelUrl) {
    Write-Host "  Tunnel    : https://$tunnelUrl" -ForegroundColor Green
}
Write-Host "======================================================" -ForegroundColor Cyan
