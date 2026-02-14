"""
Chzzk-Recorder-Pro: Settings API Router
시스템 설정 및 인증 쿠키 관리 엔드포인트.
"""

from __future__ import annotations

from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.core.config import get_settings

router = APIRouter(prefix="/api/settings", tags=["Settings"])


# ── 요청 스키마 ──────────────────────────────────────────

class CookieUpdateRequest(BaseModel):
    """인증 쿠키 업데이트 요청."""

    nid_aut: str = Field(..., description="NID_AUT 쿠키 값")
    nid_ses: str = Field(..., description="NID_SES 쿠키 값")


class DownloadSettingsUpdateRequest(BaseModel):
    """다운로드 설정 업데이트 요청."""

    keep_download_parts: bool = Field(..., description="VOD 다운로드 중단 시 .part 파일 유지 여부")
    max_record_retries: int = Field(..., ge=0, le=100, description="라이브 녹화 자동 재시도 횟수")


class GeneralSettingsUpdateRequest(BaseModel):
    """일반 설정 업데이트 요청."""

    download_dir: Optional[str] = Field(None, description="녹화 저장 경로")
    monitor_interval: Optional[int] = Field(None, ge=5, le=300, description="감시 주기 (초)")
    output_format: Optional[str] = Field(None, description="녹화 출력 포맷 (ts, mp4, mkv)")
    recording_quality: Optional[str] = Field(None, description="녹화 품질 (best, 1080p, 720p, 480p)")


class VodSettingsUpdateRequest(BaseModel):
    """VOD 다운로드 설정 업데이트 요청."""

    vod_max_concurrent: Optional[int] = Field(None, ge=1, le=10, description="동시 다운로드 최대 개수")
    vod_default_quality: Optional[str] = Field(None, description="기본 화질 (best, 1080p, 720p, 480p)")
    vod_max_speed: Optional[int] = Field(None, ge=0, le=1000, description="최대 다운로드 속도 (MB/s, 0=무제한)")


# ── .env 파일 헬퍼 ──────────────────────────────────────

def _update_env_file(updates: dict[str, str]) -> None:
    """updates 딕셔너리의 키-값을 .env 파일에 반영한다.

    기존 키는 덮어쓰고, 없는 키는 끝에 추가한다.
    """
    env_path = Path(".env")
    lines: list[str] = []
    if env_path.exists():
        lines = env_path.read_text(encoding="utf-8").splitlines()

    remaining = dict(updates)  # 아직 갱신되지 않은 키
    new_lines: list[str] = []

    for line in lines:
        if line.strip().startswith("#") or "=" not in line:
            new_lines.append(line)
            continue

        key = line.split("=", 1)[0].strip().upper()

        if key in remaining:
            new_lines.append(f"{key}={remaining.pop(key)}")
        else:
            new_lines.append(line)

    # 파일에 없던 새 키 추가
    for key, val in remaining.items():
        new_lines.append(f"{key}={val}")

    env_path.write_text("\n".join(new_lines), encoding="utf-8")


# ── 엔드포인트 ───────────────────────────────────────────

VALID_FORMATS = {"ts", "mp4", "mkv"}
VALID_QUALITIES = {"best", "1080p", "720p", "480p"}


@router.get("/", summary="현재 설정 조회")
async def get_current_settings():
    """현재 애플리케이션 설정을 조회합니다 (민감정보 마스킹)."""
    settings = get_settings()
    return {
        "app_name": settings.app_name,
        "download_dir": settings.download_dir,
        "ffmpeg_path": settings.ffmpeg_path,
        "monitor_interval": settings.monitor_interval,
        "host": settings.host,
        "port": settings.port,
        "authenticated": bool(settings.nid_aut and settings.nid_ses),
        "discord_bot_configured": bool(settings.discord_bot_token),
        "keep_download_parts": settings.keep_download_parts,
        "max_record_retries": settings.max_record_retries,
        "output_format": settings.output_format,
        "recording_quality": settings.recording_quality,
        # VOD 설정
        "vod_max_concurrent": settings.vod_max_concurrent,
        "vod_default_quality": settings.vod_default_quality,
        "vod_max_speed": settings.vod_max_speed,
    }


@router.put("/download", summary="다운로드/녹화 설정 업데이트")
async def update_download_settings(req: DownloadSettingsUpdateRequest):
    """다운로드 및 녹화 관련 설정을 업데이트합니다."""
    settings = get_settings()
    settings.keep_download_parts = req.keep_download_parts
    settings.max_record_retries = req.max_record_retries

    try:
        _update_env_file({
            "KEEP_DOWNLOAD_PARTS": str(req.keep_download_parts).lower(),
            "MAX_RECORD_RETRIES": str(req.max_record_retries),
        })
    except Exception as e:
        print(f"설정 파일 저장 실패: {e}")

    return {
        "message": "다운로드 설정이 업데이트되었습니다.",
        "settings": {
            "keep_download_parts": settings.keep_download_parts,
            "max_record_retries": settings.max_record_retries,
        },
    }


@router.put("/general", summary="일반 설정 업데이트")
async def update_general_settings(req: GeneralSettingsUpdateRequest):
    """일반 설정(저장 경로, 감시 주기, 포맷, 품질)을 업데이트합니다."""
    settings = get_settings()
    env_updates: dict[str, str] = {}

    # ── download_dir ──
    if req.download_dir is not None:
        dir_path = Path(req.download_dir)
        try:
            dir_path.mkdir(parents=True, exist_ok=True)
        except OSError as e:
            raise HTTPException(
                status_code=400,
                detail=f"저장 경로를 생성할 수 없습니다: {e}",
            )
        settings.download_dir = req.download_dir
        env_updates["DOWNLOAD_DIR"] = req.download_dir

    # ── monitor_interval ──
    if req.monitor_interval is not None:
        settings.monitor_interval = req.monitor_interval
        env_updates["MONITOR_INTERVAL"] = str(req.monitor_interval)

    # ── output_format ──
    if req.output_format is not None:
        fmt = req.output_format.lower()
        if fmt not in VALID_FORMATS:
            raise HTTPException(
                status_code=400,
                detail=f"지원하지 않는 포맷입니다. 사용 가능: {', '.join(VALID_FORMATS)}",
            )
        settings.output_format = fmt
        env_updates["OUTPUT_FORMAT"] = fmt

    # ── recording_quality ──
    if req.recording_quality is not None:
        quality = req.recording_quality.lower()
        if quality not in VALID_QUALITIES:
            raise HTTPException(
                status_code=400,
                detail=f"지원하지 않는 품질입니다. 사용 가능: {', '.join(VALID_QUALITIES)}",
            )
        settings.recording_quality = quality
        env_updates["RECORDING_QUALITY"] = quality

    # .env 영구 저장
    if env_updates:
        try:
            _update_env_file(env_updates)
        except Exception as e:
            print(f"설정 파일 저장 실패: {e}")

    return {
        "message": "설정이 업데이트되었습니다.",
        "settings": {
            "download_dir": settings.download_dir,
            "monitor_interval": settings.monitor_interval,
            "output_format": settings.output_format,
            "recording_quality": settings.recording_quality,
        },
    }


@router.put("/cookies", summary="인증 쿠키 업데이트")
async def update_cookies(req: CookieUpdateRequest):
    """치지직 인증 쿠키(NID_AUT, NID_SES)를 업데이트합니다."""
    from app.main import get_recorder_service

    service = get_recorder_service()
    return service.update_cookies(req.nid_aut, req.nid_ses)


@router.post("/cookies/test", summary="쿠키 유효성 검증")
async def test_cookies():
    """현재 설정된 쿠키로 치지직 API에 접근하여 유효성을 검증합니다."""
    import httpx

    from app.main import get_recorder_service

    service = get_recorder_service()
    auth_status = service.get_auth_status()

    if not auth_status["authenticated"]:
        raise HTTPException(
            status_code=400,
            detail="쿠키가 설정되지 않았습니다. 먼저 쿠키를 입력해주세요.",
        )

    try:
        from app.engine.auth import AuthManager

        auth = AuthManager()
        headers = auth.get_http_headers()

        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://comm-api.game.naver.com/nng_main/v1/user/getUserStatus",
                headers=headers,
                timeout=10.0,
            )
            data = resp.json()

        if data.get("code") == 200:
            return {
                "valid": True,
                "message": "쿠키 검증 성공! 로그인 상태가 확인되었습니다.",
                "user_status": data.get("content", {}),
            }
        else:
            return {
                "valid": False,
                "message": "쿠키가 만료되었거나 유효하지 않습니다.",
            }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"쿠키 검증 중 오류 발생: {e}",
        )


@router.put("/vod", summary="VOD 다운로드 설정 업데이트")
async def update_vod_settings(req: VodSettingsUpdateRequest):
    """VOD 다운로드 설정을 업데이트합니다."""
    settings = get_settings()
    env_updates: dict[str, str] = {}

    # ── vod_max_concurrent ──
    if req.vod_max_concurrent is not None:
        settings.vod_max_concurrent = req.vod_max_concurrent
        env_updates["VOD_MAX_CONCURRENT"] = str(req.vod_max_concurrent)

    # ── vod_default_quality ──
    if req.vod_default_quality is not None:
        quality = req.vod_default_quality.lower()
        if quality not in VALID_QUALITIES:
            raise HTTPException(
                status_code=400,
                detail=f"지원하지 않는 품질입니다. 사용 가능: {', '.join(VALID_QUALITIES)}",
            )
        settings.vod_default_quality = quality
        env_updates["VOD_DEFAULT_QUALITY"] = quality

    # ── vod_max_speed ──
    if req.vod_max_speed is not None:
        settings.vod_max_speed = req.vod_max_speed
        env_updates["VOD_MAX_SPEED"] = str(req.vod_max_speed)

    # .env 영구 저장
    if env_updates:
        try:
            _update_env_file(env_updates)
        except Exception as e:
            print(f"설정 파일 저장 실패: {e}")

    # VodEngine의 세마포어를 업데이트하려면 재시작이 필요
    # 현재는 런타임 중 반영 불가 (재시작 필요 안내)
    return {
        "message": "VOD 설정이 업데이트되었습니다. 일부 설정은 서버 재시작 후 적용됩니다.",
        "settings": {
            "vod_max_concurrent": settings.vod_max_concurrent,
            "vod_default_quality": settings.vod_default_quality,
            "vod_max_speed": settings.vod_max_speed,
        },
    }


@router.get("/auth", summary="인증 상태 확인")
async def get_auth_status():
    """현재 인증 상태를 확인합니다."""
    from app.main import get_recorder_service

    service = get_recorder_service()
    return service.get_auth_status()
