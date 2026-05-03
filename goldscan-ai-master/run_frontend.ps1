# run_frontend.ps1 -- Start GoldScan AI Frontend (Vite + React)

$ErrorActionPreference = "Stop"
$FrontendDir = Join-Path $PSScriptRoot "frontend"

Write-Host ""
Write-Host "  GoldScan AI  |  Frontend v2.0  |  Vite + React + Tailwind" -ForegroundColor Yellow
Write-Host "  ----------------------------------------------------------" -ForegroundColor DarkGray
Write-Host ""

# Check node_modules
$NodeModules = Join-Path $FrontendDir "node_modules"
if (-not (Test-Path $NodeModules)) {
    Write-Host "  [!] node_modules not found -- running npm install..." -ForegroundColor Yellow
    Set-Location $FrontendDir
    npm install
    Write-Host "  [OK] Dependencies installed" -ForegroundColor Green
    Write-Host ""
}

Write-Host "  Starting on  : http://localhost:5173" -ForegroundColor Cyan
Write-Host "  Backend API  : http://localhost:8000" -ForegroundColor DarkGray
Write-Host "  Press Ctrl+C to stop" -ForegroundColor DarkGray
Write-Host ""

Set-Location $FrontendDir
npm run dev
