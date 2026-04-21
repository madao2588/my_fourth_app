param(
  [string]$Port = "8011"
)

$ErrorActionPreference = "Stop"

$backendRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..\..\backend")
$pythonPath = Join-Path $backendRoot ".venv\Scripts\python.exe"
$requirementsPath = Join-Path $backendRoot "requirements.txt"

if (!(Test-Path $pythonPath)) {
  throw "Backend virtualenv was not found at $pythonPath"
}

$tempBase = if ($env:TEMP) { $env:TEMP } else { [System.IO.Path]::GetTempPath() }
$tmpRoot = Join-Path $tempBase "visitor-web-smoke"
if (!(Test-Path $tmpRoot)) {
  New-Item -ItemType Directory -Path $tmpRoot | Out-Null
}

$dbPath = Join-Path $tmpRoot "playwright-smoke.db"
if (Test-Path $dbPath) {
  Remove-Item $dbPath -Force
}
$normalizedDbPath = $dbPath -replace "\\", "/"
$env:DATABASE_URL = "sqlite:///$normalizedDbPath"
$env:AUTO_EXPIRE_ENABLED = "false"
$env:PIP_DISABLE_PIP_VERSION_CHECK = "1"

function Test-BackendRequirementsSatisfied {
  $script = @'
import importlib.util

required_modules = ["fastapi", "uvicorn", "sqlalchemy", "alembic", "jwt", "qrcode"]
missing = [name for name in required_modules if importlib.util.find_spec(name) is None]
raise SystemExit(1 if missing else 0)
'@

  $script | & $pythonPath -
  return $LASTEXITCODE -eq 0
}

function Sync-BackendRequirements {
  $requirementsHash = (Get-FileHash $requirementsPath -Algorithm SHA256).Hash
  $requirementsStamp = Join-Path $tmpRoot "backend-requirements.sha256"
  $lastRequirementsHash = if (Test-Path $requirementsStamp) {
    (Get-Content $requirementsStamp -Raw).Trim()
  }
  else {
    ""
  }

  if (($lastRequirementsHash -eq $requirementsHash) -and (Test-BackendRequirementsSatisfied)) {
    return
  }

  Write-Host "Synchronizing backend dependencies for smoke tests..."
  & $pythonPath -m pip install -r $requirementsPath
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to install backend requirements for smoke tests."
  }

  Set-Content -Path $requirementsStamp -Value $requirementsHash -NoNewline
}

Push-Location $backendRoot
try {
  Sync-BackendRequirements
  & $pythonPath -m alembic upgrade head
  & $pythonPath -m uvicorn app.main:app --host 127.0.0.1 --port $Port
}
finally {
  Pop-Location
}
