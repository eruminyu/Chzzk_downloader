"""
Chzzk-Recorder-Pro: RecorderService
Conductor와 VodEngine을 감싸는 비즈니스 로직 레이어.
API 라우터에서 직접 엔진을 호출하지 않고 이 서비스를 통해 접근한다.
"""

from __future__ import annotations

from typing import Optional

from app.core.logger import logger
from app.engine.auth import AuthManager
from app.engine.conductor import Conductor
from app.engine.vod import VodEngine


class RecorderService:
    """녹화 및 VOD 다운로드를 총괄하는 서비스 레이어.

    Conductor(라이브 녹화)와 VodEngine(다시보기)을 통합 관리한다.
    FastAPI의 lifespan에서 초기화되어 앱 전역에서 공유된다.
    """

    def __init__(
        self,
        conductor: Conductor,
        auth: Optional[AuthManager] = None,
    ) -> None:
        self._conductor = conductor
        self._auth = auth or AuthManager()
        self._vod_engine = VodEngine(auth=self._auth)
        # Discord Bot은 나중에 설정 (순환 참조 방지)

    # ── 채널 관리 ────────────────────────────────────────

    def add_channel(self, channel_id: str, auto_record: bool = True) -> dict:
        """감시 채널을 추가한다."""
        self._conductor.add_channel(channel_id, auto_record=auto_record)
        return {
            "channel_id": channel_id,
            "auto_record": auto_record,
            "message": f"채널 '{channel_id}' 등록 완료.",
        }

    async def remove_channel(self, channel_id: str) -> dict:
        """감시 채널을 제거한다."""
        await self._conductor.remove_channel(channel_id)
        return {
            "channel_id": channel_id,
            "message": f"채널 '{channel_id}' 제거 완료.",
        }

    def get_channels(self) -> list[dict]:
        """모든 채널 상태를 반환한다."""
        return self._conductor.get_all_status()

    def toggle_auto_record(self, channel_id: str) -> dict:
        """채널의 자동 녹화 설정을 토글한다."""
        new_value = self._conductor.toggle_auto_record(channel_id)
        logger.info(f"[Service] 자동 녹화 토글: {channel_id} → {'ON' if new_value else 'OFF'}")
        return {
            "channel_id": channel_id,
            "auto_record": new_value,
            "message": f"자동 녹화 {'ON' if new_value else 'OFF'}",
        }

    # ── 라이브 녹화 ──────────────────────────────────────

    async def start_recording(self, channel_id: str) -> dict:
        """수동 녹화를 시작한다."""
        logger.info(f"[Service] 녹화 시작 요청: {channel_id}")
        return await self._conductor.start_manual_recording(channel_id)

    async def stop_recording(self, channel_id: str) -> dict:
        """녹화를 중지한다."""
        logger.info(f"[Service] 녹화 중지 요청: {channel_id}")
        return await self._conductor.stop_manual_recording(channel_id)

    # ── Conductor 제어 ───────────────────────────────────

    async def start_monitoring(self) -> dict:
        """모든 채널 감시를 시작한다."""
        await self._conductor.start()
        return {
            "message": "Conductor 시작.",
            "channels": self._conductor.channel_count,
        }

    async def stop_monitoring(self) -> dict:
        """모든 감시 및 녹화를 중지한다."""
        await self._conductor.stop()
        return {"message": "Conductor 종료."}

    # ── VOD 다운로드 ─────────────────────────────────────

    async def get_vod_info(self, url: str) -> dict:
        """VOD 메타데이터를 조회한다."""
        return await self._vod_engine.get_video_info(url)

    async def download_vod(
        self,
        url: str,
        quality: str = "best",
        output_dir: Optional[str] = None,
    ) -> str:
        """VOD 다운로드를 시작한다. task_id를 반환한다."""
        logger.info(f"[Service] VOD 다운로드 요청: {url}")
        task_id = await self._vod_engine.download(
            url=url,
            quality=quality,
            output_dir=output_dir,
        )
        return task_id

    def list_vod_tasks(self) -> list[dict]:
        """모든 VOD 다운로드 작업 목록을 반환한다."""
        return self._vod_engine.list_all_tasks()

    def get_vod_task_status(self, task_id: str) -> dict:
        """특정 VOD 다운로드 작업의 상태를 반환한다."""
        return self._vod_engine.get_task_status(task_id)

    def get_vod_status(self) -> dict:
        """하위 호환성을 위한 메서드. 첫 번째 작업의 상태를 반환한다."""
        return self._vod_engine.get_status()

    def cancel_vod(self, task_id: str) -> dict:
        """VOD 다운로드를 취소한다."""
        logger.info(f"[Service] VOD 다운로드 취소 요청: {task_id}")
        return self._vod_engine.cancel_download(task_id)

    def pause_vod(self, task_id: str) -> dict:
        """VOD 다운로드를 일시정지한다."""
        logger.info(f"[Service] VOD 다운로드 일시정지 요청: {task_id}")
        return self._vod_engine.pause_download(task_id)

    def resume_vod(self, task_id: str) -> dict:
        """VOD 다운로드를 재개한다."""
        logger.info(f"[Service] VOD 다운로드 재개 요청: {task_id}")
        return self._vod_engine.resume_download(task_id)

    async def retry_vod(self, task_id: str) -> str:
        """VOD 다운로드를 재시도한다. 새 task_id를 반환한다."""
        logger.info(f"[Service] VOD 다운로드 재시도 요청: {task_id}")
        return await self._vod_engine.retry_download(task_id)

    def reorder_vod_tasks(self, task_ids: list[str]) -> dict:
        """VOD 다운로드 작업 순서를 재정렬한다."""
        logger.info(f"[Service] VOD 작업 순서 재정렬 요청: {len(task_ids)}개")
        return self._vod_engine.reorder_tasks(task_ids)

    def clear_completed_vod_tasks(self) -> dict:
        """완료된 VOD 작업들을 일괄 삭제한다."""
        logger.info(f"[Service] 완료된 VOD 작업 일괄 삭제 요청")
        return self._vod_engine.clear_completed_tasks()

    def open_vod_file_location(self, task_id: str) -> dict:
        """VOD 다운로드 파일 위치를 탐색기로 연다."""
        logger.info(f"[Service] VOD 파일 위치 열기 요청: {task_id}")
        return self._vod_engine.open_file_location(task_id)

    # ── 인증 ─────────────────────────────────────────────

    def update_cookies(self, nid_aut: str, nid_ses: str) -> dict:
        """인증 쿠키를 업데이트한다."""
        self._auth.update_cookies(nid_aut, nid_ses)
        return {"message": "쿠키 업데이트 완료.", "authenticated": True}

    def get_auth_status(self) -> dict:
        """인증 상태를 반환한다."""
        return {"authenticated": self._auth.is_authenticated}
