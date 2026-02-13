"""
Chzzk-Recorder-Pro: VOD API Router
VOD/클립 다운로드 관련 엔드포인트.
"""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/vod", tags=["VOD"])


# ── 요청 스키마 ──────────────────────────────────────────

class VodInfoRequest(BaseModel):
    """VOD 정보 조회 요청."""

    url: str = Field(..., description="치지직 VOD 또는 클립 URL")


class VodDownloadRequest(BaseModel):
    """VOD 다운로드 요청."""

    url: str = Field(..., description="치지직 VOD 또는 클립 URL")
    quality: str = Field("best", description="화질 (best, worst, format_id)")
    output_dir: Optional[str] = Field(None, description="저장 디렉토리 (기본: settings)")


# ── 엔드포인트 ───────────────────────────────────────────

@router.post("/info", summary="VOD 메타데이터 조회")
async def get_vod_info(req: VodInfoRequest):
    """VOD/클립의 제목, 길이, 썸네일, 화질 옵션을 조회합니다."""
    from app.main import get_recorder_service

    service = get_recorder_service()
    try:
        return await service.get_vod_info(req.url)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/download", summary="VOD 다운로드 시작")
async def download_vod(
    req: VodDownloadRequest,
    background_tasks: BackgroundTasks,
):
    """VOD/클립 다운로드를 비동기로 시작합니다."""
    from app.main import get_recorder_service
    from fastapi import BackgroundTasks

    service = get_recorder_service()
    
    # 현재 다운로드 중인지 확인 (Simple check)
    status = service.get_vod_status()
    if status.get("state") == "downloading":
        raise HTTPException(status_code=409, detail="이미 다운로드가 진행 중입니다.")

    try:
        # 백그라운드 작업으로 등록
        background_tasks.add_task(
            service.download_vod,
            url=req.url,
            quality=req.quality,
            output_dir=req.output_dir,
        )
        return {
            "message": "다운로드가 백그라운드에서 시작되었습니다.",
            "url": req.url,
            "quality": req.quality
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status", summary="다운로드 상태 조회")
async def get_vod_status():
    """현재 VOD 다운로드 진행 상태를 조회합니다."""
    from app.main import get_recorder_service

    service = get_recorder_service()
    return service.get_vod_status()


@router.post("/cancel", summary="다운로드 취소")
async def cancel_vod_download():
    """진행 중인 VOD 다운로드를 취소합니다."""
    from app.main import get_recorder_service

    service = get_recorder_service()
    return service.cancel_vod()


@router.post("/pause", summary="다운로드 일시정지")
async def pause_vod_download():
    """진행 중인 VOD 다운로드를 일시정지합니다."""
    from app.main import get_recorder_service

    service = get_recorder_service()
    return service.pause_vod()


@router.post("/resume", summary="다운로드 재개")
async def resume_vod_download():
    """일시정지된 VOD 다운로드를 재개합니다."""
    from app.main import get_recorder_service

    service = get_recorder_service()
    return service.resume_vod()
