# ── Stage 1: Frontend Build ──────────────────────────────
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# 의존성 캐싱 최적화 (package.json이 변경될 때만 npm install 재실행)
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci

# 소스 복사 및 빌드 (출력: /app/frontend/dist)
COPY frontend/ ./
RUN npm run build -- --outDir /app/frontend/dist


# ── Stage 2: Runtime ─────────────────────────────────────
FROM python:3.12-slim AS runtime

WORKDIR /app

# 시스템 패키지 설치 (ffmpeg + streamlink)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    streamlink \
    && rm -rf /var/lib/apt/lists/*

# Python 의존성 설치
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# 백엔드 소스 복사
COPY backend/ ./backend/

# Stage 1에서 빌드된 프론트엔드 정적 파일 복사
# FastAPI가 서빙하는 경로: backend/app/static
COPY --from=frontend-builder /app/frontend/dist ./backend/app/static

# 데이터 디렉토리 생성
RUN mkdir -p /app/recordings /app/data /app/logs

EXPOSE 8000

# 진입점: backend 디렉토리를 PYTHONPATH에 추가
ENV PYTHONPATH=/app/backend
WORKDIR /app/backend

CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
