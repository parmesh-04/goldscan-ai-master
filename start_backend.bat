@echo off
echo Starting GoldScan AI Backend...
cd /d "%~dp0backend"
if exist .venv\Scripts\activate.bat (
    call .venv\Scripts\activate.bat
)
call pip install -r requirements.txt
call uvicorn main:app --reload --host 0.0.0.0 --port 8000
pause
