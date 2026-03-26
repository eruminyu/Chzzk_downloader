@echo off
chcp 65001 >nul
echo ==========================================
echo  Chzzk Recorder Pro - Test Server
echo ==========================================
echo.
echo [1/2] Frontend ^(Vite^) start...
start "Frontend (Vite)" cmd /k "cd frontend && npm run dev"

echo.
echo [2/2] Backend ^(FastAPI^) start...
start "Backend (Uvicorn)" cmd /k "cd backend && .venv\Scripts\python.exe run.py"

echo.
echo ==========================================
echo  Frontend : http://localhost:3000
echo  Backend  : http://localhost:8000
echo ==========================================
pause >nul
