"""
Chzzk-Recorder-Pro: 초기 설정 API
최초 실행 감지 및 마법사 완료 처리를 담당한다.
"""
from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional

from app.core.config import get_settings
from app.core.logger import logger

router = APIRouter(prefix="/api/setup", tags=["Setup"])

# 초기 설정 완료 여부를 표시하는 플래그 파일
# backend/ 기준 상위의 data/ 폴더에 위치
_FLAG_FILE = Path(__file__).resolve().parents[3] / "data" / ".setup_complete"


def is_setup_complete() -> bool:
    """초기 설정이 완료되었는지 확인한다."""
    return _FLAG_FILE.exists()


# ── 요청 스키마 ──────────────────────────────────────────

class SetupCompleteRequest(BaseModel):
    """초기 설정 완료 요청."""

    # Step 1: 기본 설정
    download_dir: str = Field(..., description="녹화 저장 경로")
    output_format: str = Field("ts", description="녹화 출력 포맷 (ts, mp4, mkv)")
    recording_quality: str = Field("best", description="녹화 품질 (best, 1080p, 720p, 480p)")

    # Step 2: 치지직 인증 (선택)
    nid_aut: Optional[str] = Field(None, description="NID_AUT 쿠키 (선택)")
    nid_ses: Optional[str] = Field(None, description="NID_SES 쿠키 (선택)")


# ── 엔드포인트 ───────────────────────────────────────────

@router.get("/status", summary="초기 설정 완료 여부 확인")
async def get_setup_status():
    """초기 설정이 필요한지 반환한다."""
    return {"needs_setup": not is_setup_complete()}


@router.post("/complete", summary="초기 설정 완료 처리")
async def complete_setup(req: SetupCompleteRequest):
    """
    마법사 완료 시 설정을 .env에 저장하고 플래그 파일을 생성한다.
    이후 서버 재시작 없이 in-memory 설정도 즉시 반영한다.
    """
    from app.api.settings import _update_env_file

    VALID_FORMATS = {"ts", "mp4", "mkv"}
    VALID_QUALITIES = {"best", "1080p", "720p", "480p"}

    fmt = req.output_format.lower()
    quality = req.recording_quality.lower()

    if fmt not in VALID_FORMATS:
        raise HTTPException(status_code=400, detail=f"지원하지 않는 포맷: {fmt}")
    if quality not in VALID_QUALITIES:
        raise HTTPException(status_code=400, detail=f"지원하지 않는 품질: {quality}")

    # 저장 경로 생성
    save_dir = Path(req.download_dir)
    save_dir.mkdir(parents=True, exist_ok=True)

    # .env 업데이트
    env_updates: dict[str, str] = {
        "DOWNLOAD_DIR": req.download_dir,
        "OUTPUT_FORMAT": fmt,
        "RECORDING_QUALITY": quality,
    }
    if req.nid_aut and req.nid_ses:
        env_updates["NID_AUT"] = req.nid_aut
        env_updates["NID_SES"] = req.nid_ses

    _update_env_file(env_updates)

    # in-memory 설정 즉시 반영
    settings = get_settings()
    settings.download_dir = req.download_dir
    settings.output_format = fmt
    settings.recording_quality = quality
    if req.nid_aut and req.nid_ses:
        settings.nid_aut = req.nid_aut
        settings.nid_ses = req.nid_ses

    # 플래그 파일 생성 (data/ 폴더도 없으면 함께 생성)
    _FLAG_FILE.parent.mkdir(parents=True, exist_ok=True)
    _FLAG_FILE.touch()

    logger.info("✅ 초기 설정 완료. 플래그 파일 생성됨.")
    return {"success": True, "message": "초기 설정이 완료되었습니다."}
