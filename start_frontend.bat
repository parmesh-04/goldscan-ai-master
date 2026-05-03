@echo off
echo Starting GoldScan AI Frontend...
cd /d "%~dp0frontend"
call npm install
call npm run dev
pause
