param(
    [string]$Tag = ""
)

$ErrorActionPreference = "Stop"
$ROOT = "C:\Users\moruziel\sadan"
$VM   = "sadan-demo"
$ZONE = "me-west1-a"
$DOMAIN = "sadan-demo.duckdns.org"

function Write-Step { param($msg) Write-Host "`n$msg" -ForegroundColor Cyan }
function Write-OK   { param($msg) Write-Host "  [OK] $msg" -ForegroundColor Green }
function Write-Err  { param($msg) Write-Host "  [XX] $msg" -ForegroundColor Red }

# ── 1. Working tree check ───────────────────────────────────
Write-Step "1. בדיקת working tree"

$status = git status --porcelain
if ($status) {
    Write-Err "Working tree לא נקי. עשה commit או stash לפני deploy."
    git status --short
    exit 1
}
Write-OK "נקי"

# ── 2. Version tag ──────────────────────────────────────────
Write-Step "2. קביעת גרסה"

if ($Tag) {
    $tagExists = git tag -l $Tag
    if (-not $tagExists) {
        Write-Err "Tag '$Tag' לא קיים. אי אפשר לעשות rollback."
        exit 1
    }
    $version = $Tag
    Write-OK "Rollback ל-$version"
} else {
    $existing = git tag -l "demo-v*" | Sort-Object { [int]($_ -replace 'demo-v','') }
    if ($existing) {
        $last = ($existing | Select-Object -Last 1) -replace 'demo-v',''
        $next = [int]$last + 1
    } else {
        $next = 1
    }
    $version = "demo-v$next"
    git tag $version
    git -c http.proxy="" push origin $version
    Write-OK "$version (tag נוצר ונדחף)"
}

# ── 3. Archive + upload ────────────────────────────────────
Write-Step "3. ארכיון והעלאה לשרת"

$archivePath = "$env:TEMP\sadan-$version.tar.gz"
git archive --format=tar.gz $version -o $archivePath
Write-OK "ארכיון: $archivePath"

gcloud compute scp $archivePath "${VM}:/tmp/sadan-deploy.tar.gz" --zone=$ZONE --quiet
Write-OK "הועלה לשרת"

# ── 4. Deploy on VM ─────────────────────────────────────────
Write-Step "4. פריסה בשרת"

$deployScript = @'
set -e
APP_DIR=/opt/sadan/app

# Extract
sudo mkdir -p $APP_DIR
sudo tar xzf /tmp/sadan-deploy.tar.gz -C $APP_DIR
rm /tmp/sadan-deploy.tar.gz

# Build and start
cd $APP_DIR/deploy
sudo docker compose up -d --build --remove-orphans 2>&1

echo "=== deploy done ==="
'@

gcloud compute ssh $VM --zone=$ZONE --command=$deployScript --quiet
Write-OK "פריסה הושלמה"

# ── 5. Smoke tests ──────────────────────────────────────────
Write-Step "5. בדיקות עשן"

Start-Sleep 10

$checks = @()

# Health endpoint — no auth
try {
    $healthResp = Invoke-WebRequest -Uri "https://$DOMAIN/health" -UseBasicParsing -TimeoutSec 15
    $healthOk = $healthResp.StatusCode -eq 200
    $checks += @{ name = "Health"; ok = $healthOk; detail = "HTTP $($healthResp.StatusCode)" }
} catch {
    $checks += @{ name = "Health"; ok = $false; detail = $_.Exception.Message }
}

# Main page without auth — should get 401
try {
    $noAuthResp = Invoke-WebRequest -Uri "https://$DOMAIN/" -UseBasicParsing -TimeoutSec 15
    $checks += @{ name = "Auth (בלי סיסמה)"; ok = $false; detail = "HTTP $($noAuthResp.StatusCode) — צפוי 401" }
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 401) {
        $checks += @{ name = "Auth (בלי סיסמה)"; ok = $true; detail = "401 כצפוי" }
    } else {
        $checks += @{ name = "Auth (בלי סיסמה)"; ok = $false; detail = $_.Exception.Message }
    }
}

# Main page with auth — should get 200
try {
    $pair = [System.Convert]::ToBase64String([System.Text.Encoding]::ASCII.GetBytes("mor:0528942575"))
    $headers = @{ Authorization = "Basic $pair" }
    $authResp = Invoke-WebRequest -Uri "https://$DOMAIN/" -Headers $headers -UseBasicParsing -TimeoutSec 15
    $authOk = $authResp.StatusCode -eq 200
    $checks += @{ name = "Auth (עם סיסמה)"; ok = $authOk; detail = "HTTP $($authResp.StatusCode)" }
} catch {
    $checks += @{ name = "Auth (עם סיסמה)"; ok = $false; detail = $_.Exception.Message }
}

# WhatsApp status with auth
try {
    $waResp = Invoke-WebRequest -Uri "https://$DOMAIN/wa/status" -Headers $headers -UseBasicParsing -TimeoutSec 15
    $waOk = $waResp.StatusCode -eq 200
    $checks += @{ name = "WhatsApp"; ok = $waOk; detail = "HTTP $($waResp.StatusCode)" }
} catch {
    $checks += @{ name = "WhatsApp"; ok = $false; detail = $_.Exception.Message }
}

# ── 6. Summary ──────────────────────────────────────────────
Write-Host ""
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "  סיכום פריסה — $version" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan

$allOk = $true
foreach ($c in $checks) {
    if ($c.ok) {
        Write-OK "$($c.name): $($c.detail)"
    } else {
        $allOk = $false
        Write-Err "$($c.name): $($c.detail)"
    }
}

Write-Host ""
if ($allOk) {
    Write-Host "  הפריסה הצליחה! https://$DOMAIN" -ForegroundColor Green
} else {
    Write-Host "  יש בעיות — בדוק לוגים: gcloud compute ssh $VM --zone=$ZONE --command='cd /opt/sadan/app/deploy && sudo docker compose logs --tail=50'" -ForegroundColor Yellow
}
Write-Host "======================================================" -ForegroundColor Cyan
