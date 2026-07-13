# ============================================================
#  SADAN - E2E test suite (Playwright)
#  Run: powershell -ExecutionPolicy Bypass -File run-e2e.ps1 [-Headed] [-Local] [-Grep <pattern>]
#
#  ברירת מחדל: סביבה מקומית — Playwright מרים את השרתים לבד (או משתמש ברצים).
#  עמיד לרשת הארגונית. -Remote מריץ מול הענן (מרשת פתוחה בלבד).
#  -Headed : מציג את שני החלונות (טלפון + קיר) חי על המסך
#  דוח: tests\e2e\reports\html\index.html
# ============================================================
param(
    [switch]$Headed,
    [switch]$Remote,
    [string]$Grep = ""
)

$ErrorActionPreference = "Continue"
Set-Location "$PSScriptRoot\tests\e2e"

if ($Remote) { $env:BASE_URL = "https://sadan-demo.duckdns.org" } else { Remove-Item Env:BASE_URL -ErrorAction SilentlyContinue }

$args = @("playwright", "test")
if ($Headed) { $args += "--headed" }
if ($Grep)   { $args += @("--grep", $Grep) }

npx @args
$code = $LASTEXITCODE

Write-Host ""
if ($code -eq 0) {
    Write-Host "  ✅ כל הבדיקות עברו" -ForegroundColor Green
} else {
    Write-Host "  ❌ יש כשלים — פתח את הדוח: tests\e2e\reports\html\index.html" -ForegroundColor Red
}
exit $code
