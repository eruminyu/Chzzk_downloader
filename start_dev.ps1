# Chzzk Recorder Pro - Development Start Script

Write-Host "🚀 Chzzk Recorder Pro 개발 서버를 시작합니다..." -ForegroundColor Cyan

$root = Get-Location

# 1. Start Backend Server
$backendPath = Join-Path $root "backend"
if (Test-Path $backendPath) {
    Write-Host "Starting Backend Server..." -ForegroundColor Green
    # python -m uvicorn app.main:app --reload --port 8000
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "& {cd '$backendPath'; Write-Host 'Backend Server (FastAPI)'; python run.py}"
}
else {
    Write-Error "Backend directory not found at $backendPath"
}

# 2. Start Frontend Server
$frontendPath = Join-Path $root "frontend"
if (Test-Path $frontendPath) {
    Write-Host "Starting Frontend Server..." -ForegroundColor Green
    # npm run dev
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "& {cd '$frontendPath'; Write-Host 'Frontend Server (Vite)'; npm run dev}"
}
else {
    Write-Error "Frontend directory not found at $frontendPath"
}

Write-Host "✨ 모든 서버가 새 창에서 실행되었습니다." -ForegroundColor Cyan
Write-Host "👉 Frontend: http://localhost:5173" -ForegroundColor Yellow
Write-Host "👉 Backend: http://localhost:8000/docs" -ForegroundColor Yellow
