"""
Chzzk-Recorder-Pro: FastAPI 진입점
Lifespan 컨텍스트 매니저를 통해 Conductor 라이프사이클을 관리한다.
"""

from __future__ import annotations

import asyncio
import sys

# 윈도우에서 subprocess 실행을 위해 ProactorEventLoopPolicy 설정 (Python 3.8+ 기본이지만 명시적 설정 권장)
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.logger import logger
from app.engine.auth import AuthManager
from app.engine.conductor import Conductor
from app.services.recorder import RecorderService
from app.services.discord_bot import DiscordBotService

# API Routers
from app.api.stream import router as stream_router
from app.api.vod import router as vod_router
from app.api.settings import router as settings_router

# ── 전역 인스턴스 ────────────────────────────────────────
_recorder_service: RecorderService | None = None


def get_recorder_service() -> RecorderService:
    """RecorderService 인스턴스를 반환한다. (DI용)"""
    if _recorder_service is None:
        raise RuntimeError("RecorderService가 초기화되지 않았습니다.")
    return _recorder_service


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """애플리케이션 시작/종료 라이프사이클 관리."""
    global _recorder_service

    settings = get_settings()
    logger.info(f"🚀 {settings.app_name} 시작 중...")

    # FFmpeg 경로 검증
    try:
        ffmpeg = settings.resolve_ffmpeg_path()
        logger.info(f"✅ FFmpeg 확인: {ffmpeg}")
    except FileNotFoundError as e:
        logger.warning(f"⚠️ {e}")

    # 서비스 초기화
    auth = AuthManager()
    conductor = Conductor(auth=auth)
    _recorder_service = RecorderService(conductor=conductor, auth=auth)

    if auth.is_authenticated:
        logger.info("🔑 인증 쿠키 로드 완료.")
    else:
        logger.info("🔓 비로그인 모드로 동작합니다.")

    # Discord Bot 시작 (토큰이 설정되어 있으면 자동 구동)
    discord_bot = DiscordBotService(recorder_service=_recorder_service)
    await discord_bot.start()

    # Conductor와 VodEngine에 Discord Bot 연결 (순환 참조 방지를 위해 나중에 설정)
    conductor._discord_bot = discord_bot
    _recorder_service._vod_engine._discord_bot = discord_bot

    logger.info(f"✅ {settings.app_name} Engine Started!")

    # Conductor 시작 (감시 루프 실행)
    await conductor.start()

    yield

    # ── 종료 ──
    logger.info(f"🛑 {settings.app_name} 종료 중...")
    if discord_bot:
        await discord_bot.stop()
    if conductor:
        await conductor.stop()
    _recorder_service = None
    logger.info("👋 Goodbye!")


# ── FastAPI 앱 ───────────────────────────────────────────
app = FastAPI(
    title="Chzzk-Recorder-Pro",
    description="치지직 스트리밍 및 VOD 전문 녹화 솔루션",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS 설정 (프론트엔드 연동용)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── 라우터 등록 ──────────────────────────────────────────
app.include_router(stream_router)
app.include_router(vod_router)
app.include_router(settings_router)


# ── 헬스 체크 ────────────────────────────────────────────
@app.get("/", tags=["Health"])
async def root():
    """헬스 체크 엔드포인트."""
    return {"message": "Chzzk-Recorder-Pro Engine Started"}


@app.get("/health", tags=["Health"])
async def health_check():
    """상세 헬스 체크."""
    settings = get_settings()
    service = None
    try:
        service = get_recorder_service()
    except RuntimeError:
        pass

    return {
        "status": "ok",
        "app": settings.app_name,
        "version": "0.1.0",
        "authenticated": bool(settings.nid_aut and settings.nid_ses),
    }


if __name__ == "__main__":
    import uvicorn

    settings = get_settings()
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=True,
    )
