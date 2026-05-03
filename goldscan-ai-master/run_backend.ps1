# run_backend.ps1 -- Start GoldScan AI Backend (FastAPI + Uvicorn)

$ErrorActionPreference = "Stop"
$BackendDir = Join-Path $PSScriptRoot "backend"

Write-Host ""
Write-Host "  GoldScan AI  |  Backend v2.0  |  FastAPI + Gemini Vision" -ForegroundColor Yellow
Write-Host "  --------------------------------------------------------" -ForegroundColor DarkGray
Write-Host ""

# Load .env and export variables
$EnvFile = Join-Path $BackendDir ".env"
if (Test-Path $EnvFile) {
    Get-Content $EnvFile | ForEach-Object {
        if ($_ -match "^\s*([^#][^=]+)=(.*)$") {
            $key   = $Matches[1].Trim()
            $value = $Matches[2].Trim()
            [System.Environment]::SetEnvironmentVariable($key, $value, "Process")
            # Mirror: if VITE_GEMINI_API_KEY is set, also expose as GEMINI_API_KEY
            if ($key -eq "VITE_GEMINI_API_KEY" -and -not $env:GEMINI_API_KEY) {
                [System.Environment]::SetEnvironmentVariable("GEMINI_API_KEY", $value, "Process")
            }
        }
    }
    Write-Host "  [OK] Environment loaded from backend/.env" -ForegroundColor Green
} else {
    Write-Host "  [!] No .env file found -- running without Gemini API key (demo mode)" -ForegroundColor Yellow
}

# Activate virtual environment if present
$VenvActivate = Join-Path $BackendDir ".venv\Scripts\Activate.ps1"
if (Test-Path $VenvActivate) {
    & $VenvActivate
    Write-Host "  [OK] Virtual environment activated" -ForegroundColor Green
} else {
    Write-Host "  [!] No .venv found -- using system Python" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "  Starting on  : http://localhost:8000" -ForegroundColor Cyan
Write-Host "  API Docs     : http://localhost:8000/docs" -ForegroundColor DarkGray
Write-Host "  Press Ctrl+C to stop" -ForegroundColor DarkGray
Write-Host ""

Set-Location $BackendDir
uvicorn main:app --reload --host 0.0.0.0 --port 8000
