"""
Chzzk-Recorder-Pro: Stream API Router
라이브 채널 관리 및 녹화 제어 엔드포인트.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.core.utils import extract_channel_id

router = APIRouter(prefix="/api/stream", tags=["Stream"])


# ── 요청 스키마 ──────────────────────────────────────────

class AddChannelRequest(BaseModel):
    """채널 추가 요청."""

    channel_id: str = Field(..., description="치지직 채널 ID")
    auto_record: bool = Field(True, description="방송 시작 시 자동 녹화 여부")


# ── 채널 관리 ────────────────────────────────────────────

@router.post("/channels", summary="감시 채널 추가")
async def add_channel(req: AddChannelRequest):
    """감시할 채널을 등록합니다."""
    from app.main import get_recorder_service

    service = get_recorder_service()

    channel_id = extract_channel_id(req.channel_id)
    return service.add_channel(channel_id, req.auto_record)


@router.delete("/channels/{channel_id:path}", summary="채널 제거")
async def remove_channel(channel_id: str):
    """채널을 감시 목록에서 제거합니다."""
    from app.main import get_recorder_service

    service = get_recorder_service()

    channel_id = extract_channel_id(channel_id)
    return await service.remove_channel(channel_id)


@router.get("/channels", summary="채널 목록 조회")
async def list_channels():
    """등록된 모든 채널과 상태를 조회합니다."""
    from app.main import get_recorder_service

    service = get_recorder_service()
    return service.get_channels()


@router.patch("/channels/{channel_id:path}/auto-record", summary="자동 녹화 토글")
async def toggle_auto_record(channel_id: str):
    """채널의 자동 녹화 설정을 ON/OFF 토글합니다."""
    from app.main import get_recorder_service

    service = get_recorder_service()

    channel_id = extract_channel_id(channel_id)

    try:
        return service.toggle_auto_record(channel_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ── 녹화 제어 ────────────────────────────────────────────

@router.post("/record/{channel_id:path}/start", summary="수동 녹화 시작")
async def start_recording(channel_id: str):
    """특정 채널의 녹화를 수동으로 시작합니다."""
    from app.main import get_recorder_service

    service = get_recorder_service()

    channel_id = extract_channel_id(channel_id)

    try:
        return await service.start_recording(channel_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/record/{channel_id:path}/stop", summary="녹화 중지")
async def stop_recording(channel_id: str):
    """특정 채널의 녹화를 중지합니다."""
    from app.main import get_recorder_service

    service = get_recorder_service()

    channel_id = extract_channel_id(channel_id)

    try:
        return await service.stop_recording(channel_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Conductor 제어 ───────────────────────────────────────

@router.post("/monitor/start", summary="전체 감시 시작")
async def start_monitoring():
    """등록된 모든 채널의 감시를 시작합니다."""
    from app.main import get_recorder_service

    service = get_recorder_service()
    return await service.start_monitoring()


@router.post("/monitor/stop", summary="전체 감시 중지")
async def stop_monitoring():
    """모든 감시 및 녹화를 중지합니다."""
    from app.main import get_recorder_service

    service = get_recorder_service()
    return await service.stop_monitoring()
