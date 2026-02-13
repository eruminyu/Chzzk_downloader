"""
Chzzk-Recorder-Pro: 설정 관리 모듈
pydantic-settings 기반으로 환경변수 및 .env 파일에서 설정을 로드한다.
"""

from __future__ import annotations

import shutil
from functools import lru_cache
from pathlib import Path
from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """애플리케이션 전역 설정."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── 앱 메타 ──────────────────────────────────────────
    app_name: str = "Chzzk-Recorder-Pro"
    debug: bool = False

    # ── FFmpeg ───────────────────────────────────────────
    ffmpeg_path: str = "C:\\ffmpeg\\bin\\ffmpeg.exe"

    # ── 저장 경로 ────────────────────────────────────────
    download_dir: str = "./recordings"

    # ── 치지직 인증 쿠키 (Optional) ──────────────────────
    nid_aut: Optional[str] = None
    nid_ses: Optional[str] = None

    # ── 서버 ─────────────────────────────────────────────
    host: str = "0.0.0.0"
    port: int = 8000

    # ── Discord Bot (Phase 2) ────────────────────────────
    discord_bot_token: Optional[str] = None

    # ── 감시 주기 (초) ───────────────────────────────────
    monitor_interval: int = 30

    # ── 다운로드 설정 ─────────────────────────────────────
    keep_download_parts: bool = False  # VOD 다운로드 중단 시 .part 파일 유지 여부
    max_record_retries: int = 3        # 라이브 녹화 자동 재시도 최대 횟수

    # ── 녹화 포맷/품질 ─────────────────────────────────────
    output_format: str = "ts"          # 녹화 출력 포맷: ts, mp4, mkv
    recording_quality: str = "best"    # 녹화 품질: best, 1080p, 720p, 480p

    def resolve_ffmpeg_path(self) -> str:
        """FFmpeg 실행 파일 경로를 탐색 순서에 따라 결정한다.

        탐색 순서:
            1. 설정값 (FFMPEG_PATH)
            2. 프로젝트 bin/ 폴더
            3. 시스템 PATH
        """
        # 1) 설정값이 유효한 경우
        configured = Path(self.ffmpeg_path)
        if configured.is_file():
            return str(configured)

        # 2) 프로젝트 bin/ 폴더
        project_bin = Path(__file__).resolve().parents[3] / "bin" / "ffmpeg.exe"
        if project_bin.is_file():
            return str(project_bin)

        # 3) 시스템 PATH
        system_ffmpeg = shutil.which("ffmpeg")
        if system_ffmpeg:
            return system_ffmpeg

        raise FileNotFoundError(
            "FFmpeg를 찾을 수 없습니다. "
            "FFMPEG_PATH 환경변수를 설정하거나 bin/ 폴더에 ffmpeg.exe를 배치하세요."
        )


@lru_cache
def get_settings() -> Settings:
    """싱글턴 Settings 인스턴스를 반환한다."""
    return Settings()
