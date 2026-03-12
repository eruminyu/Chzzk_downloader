"""
Chzzk-Recorder-Pro: 설정 관리 모듈
pydantic-settings 기반으로 환경변수 및 .env 파일에서 설정을 로드한다.
"""

from __future__ import annotations

import sys
import shutil
from functools import lru_cache
from pathlib import Path
from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


def _resolve_env_file() -> str:
    """실행 환경에 맞는 .env 파일의 절대 경로를 문자열로 반환한다.

    탐색 순서:
        1. PyInstaller exe 빌드: exe 파일 옆
        2. Docker 컨테이너: /app/.env
        3. 개발 환경: 프로젝트 루트
    """
    if getattr(sys, "frozen", False):
        return str(Path(sys.executable).parent / ".env")

    if Path("/.dockerenv").exists():
        return "/app/.env"

    project_root = Path(__file__).resolve().parents[3]
    candidate = project_root / ".env"
    if candidate.exists():
        return str(candidate)
    backend_env = project_root / "backend" / ".env"
    if backend_env.exists():
        return str(backend_env)
    return str(candidate)


class Settings(BaseSettings):
    """애플리케이션 전역 설정."""

    model_config = SettingsConfigDict(
        env_file=_resolve_env_file(),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── 앱 메타 ──────────────────────────────────────────
    app_name: str = "Chzzk-Recorder-Pro"
    debug: bool = False

    # ── FFmpeg ───────────────────────────────────────────
    ffmpeg_path: str = "ffmpeg"

    # ── 저장 경로 ────────────────────────────────────────
    download_dir: str = "./recordings"
    split_download_dirs: bool = False   # 분할 저장 경로 사용 여부
    vod_chzzk_dir: str = ""             # 치지직 VOD/클립 저장 경로 (빈 문자열 = download_dir 사용)
    vod_external_dir: str = ""          # 외부 URL(유튜브 등) 저장 경로 (빈 문자열 = download_dir 사용)

    # ── 치지직 인증 쿠키 (Optional) ──────────────────────
    nid_aut: Optional[str] = None
    nid_ses: Optional[str] = None

    # ── 서버 ─────────────────────────────────────────────
    host: str = "0.0.0.0"
    port: int = 8000

    # ── Discord Bot ──────────────────────────────────────
    discord_bot_token: Optional[str] = None
    discord_notification_channel_id: Optional[str] = None  # 알림을 보낼 채널 ID

    # ── 감시 주기 (초) ───────────────────────────────────
    monitor_interval: int = 30

    # ── 다운로드 설정 ─────────────────────────────────────
    keep_download_parts: bool = False  # VOD 다운로드 중단 시 .part 파일 유지 여부
    max_record_retries: int = 3        # 라이브 녹화 자동 재시도 최대 횟수

    # ── 녹화 포맷/품질 ─────────────────────────────────────
    output_format: str = "ts"          # 녹화 출력 포맷: ts, mp4, mkv
    recording_quality: str = "best"    # 녹화 품질: best, 1080p, 720p, 480p

    # ── VOD 다운로드 설정 ──────────────────────────────────
    vod_max_concurrent: int = 3        # 동시 다운로드 최대 개수
    vod_default_quality: str = "best"  # 기본 화질: best, 1080p, 720p, 480p
    vod_max_speed: int = 0             # 최대 다운로드 속도 (MB/s, 0 = 무제한)

    # ── 채팅 아카이빙 ────────────────────────────────────
    chat_archive_enabled: bool = True   # 녹화 시 채팅 자동 아카이빙 여부

    def resolve_ffmpeg_path(self) -> str:
        """FFmpeg 실행 파일 경로를 탐색 순서에 따라 결정한다.

        탐색 순서:
            1. 설정값 (FFMPEG_PATH)
            2. exe/스크립트 옆 bin/ 폴더 (배포 번들 및 개발 환경)
            3. 시스템 PATH
        """
        import sys as _sys

        # 1) 설정값이 유효한 경우
        configured = Path(self.ffmpeg_path)
        if configured.is_file():
            return str(configured)

        # 2) exe 옆 bin/ 폴더 (PyInstaller 빌드 환경 포함)
        if getattr(_sys, "frozen", False):
            # 빌드된 .exe 기준
            base_dir = Path(_sys.executable).parent
        else:
            # 개발 환경: 프로젝트 루트 기준
            base_dir = Path(__file__).resolve().parents[3]

        for fname in ("ffmpeg.exe", "ffmpeg"):
            candidate = base_dir / "bin" / fname
            if candidate.is_file():
                return str(candidate)

        # 3) 시스템 PATH
        system_ffmpeg = shutil.which("ffmpeg")
        if system_ffmpeg:
            return system_ffmpeg

        raise FileNotFoundError(
            "FFmpeg를 찾을 수 없습니다. "
            "FFMPEG_PATH 환경변수를 설정하거나 "
            "프로그램 옆 bin/ffmpeg.exe를 배치하거나 "
            "시스템 PATH에 ffmpeg를 추가하세요."
        )


@lru_cache
def get_settings() -> Settings:
    """싱글턴 Settings 인스턴스를 반환한다."""
    return Settings()
