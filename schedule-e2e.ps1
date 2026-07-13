# ============================================================
#  SADAN - register nightly E2E run (Windows Task Scheduler)
#  Run once: powershell -ExecutionPolicy Bypass -File schedule-e2e.ps1
#  Removes:  powershell -ExecutionPolicy Bypass -File schedule-e2e.ps1 -Remove
#
#  יוצר משימה יומית ב-06:00 שמריצה את סט הבדיקות מול הענן (headless).
#  התוצאה נשמרת ב-tests\e2e\reports (דוח HTML + לוג ריצה).
# ============================================================
param([switch]$Remove)

$TASK = "SADAN-E2E-Nightly"
$ROOT = $PSScriptRoot

if ($Remove) {
    schtasks /Delete /TN $TASK /F
    exit
}

$cmd = "powershell -ExecutionPolicy Bypass -File `"$ROOT\run-e2e.ps1`" > `"$ROOT\tests\e2e\reports\nightly.log`" 2>&1"
schtasks /Create /F /TN $TASK /SC DAILY /ST 06:00 /TR $cmd
Write-Host ""
Write-Host "  משימה לילית נרשמה: $TASK (06:00 יומי, מול הענן)" -ForegroundColor Green
Write-Host "  דוח: tests\e2e\reports\html\index.html | לוג: tests\e2e\reports\nightly.log"
