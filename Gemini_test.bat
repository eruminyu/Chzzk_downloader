@echo off
echo ==========================================
echo Starting UI Refactoring Test Servers
echo ==========================================
echo [1/2] Starting Frontend (Vite)...
start "Frontend" cmd /k "cd frontend && npm run dev"
echo [2/2] Starting Backend (FastAPI)...
start "Backend" cmd /k "cd backend && .venv\Scripts\python.exe run.py"
echo ==========================================
echo All servers are starting in new windows!
echo Frontend: http://localhost:3000
echo Backend API : http://localhost:8000
echo ==========================================
pause
