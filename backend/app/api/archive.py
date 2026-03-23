"""
Chzzk-Recorder-Pro: Archive API Router
TwitCasting 아카이브 목록 조회 및 아카이브 다운로드 엔드포인트.
"""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from app.engine.twitcasting import TwitcastingEngine

router = APIRouter(prefix="/api/archive", tags=["Archive"])


# ── 요청 스키마 ──────────────────────────────────────────

class ArchiveDownloadRequest(BaseModel):
    """아카이브 다운로드 요청."""

    url: str = Field(..., description="아카이브 URL (TwitCasting 아카이브 또는 Twitter Spaces URL)")
    quality: str = Field("best", description="화질 (best, worst, format_id)")
    output_dir: Optional[str] = Field(None, description="저장 디렉토리 (기본: settings)")


# ── 엔드포인트 ───────────────────────────────────────────

@router.get("/twitcasting/{channel_id}", summary="TwitCasting 아카이브 목록 조회")
async def get_twitcasting_archives(
    channel_id: str,
    offset: int = Query(0, ge=0, le=1000, description="페이지 오프셋"),
    limit: int = Query(20, ge=1, le=50, description="한 번에 가져올 개수"),
):
    """TwitCasting 채널의 과거 방송 아카이브 목록을 조회합니다."""
    engine = TwitcastingEngine()
    try:
        result = await engine.get_movie_list(channel_id, offset=offset, limit=limit)
        return result
    except PermissionError as e:
        raise HTTPException(status_code=401, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/download", summary="아카이브 다운로드 시작")
async def download_archive(req: ArchiveDownloadRequest):
    """TwitCasting 아카이브 또는 Twitter Spaces 아카이브 다운로드를 시작합니다.
    기존 VOD 엔진(yt-dlp)을 재사용하며, task_id를 반환합니다."""
    from app.main import get_recorder_service

    service = get_recorder_service()
    try:
        task_id = await service.download_vod(
            url=req.url,
            quality=req.quality,
            output_dir=req.output_dir,
        )
        return {
            "task_id": task_id,
            "message": "아카이브 다운로드가 시작되었습니다.",
            "url": req.url,
            "quality": req.quality,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
