"""
Chzzk-Recorder-Pro: Conductor (비동기 오케스트레이터)
다중 채널 감시 루프를 관리하고, 방송 시작 시 자동 녹화를 트리거한다.
"""

from __future__ import annotations

import asyncio
import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import TYPE_CHECKING, Optional

from app.core.config import get_settings
from app.core.logger import logger
from app.engine.auth import AuthManager
from app.engine.chat import ChatArchiver
from app.engine.downloader import StreamLinkEngine
from app.engine.pipeline import FFmpegPipeline, RecordingState

if TYPE_CHECKING:
    from app.services.discord_bot import DiscordBotService


@dataclass
class ChannelTask:
    """감시 대상 채널 정보."""

    channel_id: str
    auto_record: bool = True
    pipeline: Optional[FFmpegPipeline] = field(default=None, repr=False)
    chat_archiver: Optional[ChatArchiver] = field(default=None, repr=False)
    monitor_task: Optional[asyncio.Task] = field(default=None, repr=False)
    is_live: bool = False
    channel_name: Optional[str] = None
    title: Optional[str] = None
    category: Optional[str] = None
    viewer_count: int = 0
    thumbnail_url: Optional[str] = None
    profile_image_url: Optional[str] = None


class Conductor:
    """비동기 오케스트레이터.

    Python 3.14의 비동기 성능을 활용하여
    단일 스레드로 수십 개의 채널을 동시 감시한다.

    주요 기능:
        - 채널 등록/제거
        - 주기적 라이브 상태 확인
        - 방송 시작 감지 시 자동 녹화 트리거
        - 방송 종료 감지 시 녹화 중지
    """

    def __init__(
        self,
        auth: Optional[AuthManager] = None,
        discord_bot: Optional[DiscordBotService] = None,
    ) -> None:
        self._auth = auth or AuthManager()
        self._engine = StreamLinkEngine(auth=self._auth)
        self._channels: dict[str, ChannelTask] = {}
        self._running = False
        self._persistence_path = Path("data/channels.json")
        self._discord_bot = discord_bot
        self._load_persistence()

    @property
    def is_running(self) -> bool:
        return self._running

    @property
    def channel_count(self) -> int:
        return len(self._channels)

    def add_channel(self, channel_id: str, auto_record: bool = True) -> None:
        """감시할 채널을 등록한다."""
        if channel_id in self._channels:
            logger.warning(f"채널 '{channel_id}'은(는) 이미 등록되어 있습니다.")
            return

        task = ChannelTask(channel_id=channel_id, auto_record=auto_record)
        self._channels[channel_id] = task
        logger.info(f"채널 등록: {channel_id} (auto_record={auto_record})")
        
        self._save_persistence()

        # 이미 실행 중이면 즉시 감시 시작
        if self._running:
            task.monitor_task = asyncio.create_task(
                self._monitor_channel(channel_id)
            )

    def toggle_auto_record(self, channel_id: str) -> bool:
        """채널의 자동 녹화 설정을 토글한다.

        Returns:
            변경 후의 auto_record 값.
        """
        task = self._channels.get(channel_id)
        if task is None:
            raise ValueError(f"채널 '{channel_id}'을(를) 찾을 수 없습니다.")

        task.auto_record = not task.auto_record
        logger.info(f"[{channel_id}] 자동 녹화 {'ON' if task.auto_record else 'OFF'}")
        self._save_persistence()
        return task.auto_record

    async def remove_channel(self, channel_id: str) -> None:
        """채널을 감시 목록에서 제거한다."""
        task = self._channels.pop(channel_id, None)
        if task is None:
            logger.warning(f"채널 '{channel_id}'을(를) 찾을 수 없습니다.")
            return

        # 녹화 중이면 파이프라인 정지 (ffmpeg 프로세스 + 파일 핸들 해제)
        pipe = task.pipeline
        if pipe is not None and pipe.state in (RecordingState.RECORDING, RecordingState.ERROR):
            logger.info(f"[{channel_id}] 채널 제거 전 녹화 정지 중...")
            await self._stop_recording(channel_id)

        # 감시 태스크 취소
        mt = task.monitor_task
        if mt is not None and not mt.done():
            mt.cancel()

        logger.info(f"채널 제거: {channel_id}")
        self._save_persistence()

    async def start(self) -> None:
        """모든 등록된 채널의 감시를 시작한다."""
        if self._running:
            logger.warning("Conductor가 이미 실행 중입니다.")
            return

        self._running = True
        logger.info(f"Conductor 시작. 감시 채널 수: {self.channel_count}")

        for channel_id, task in self._channels.items():
            task.monitor_task = asyncio.create_task(
                self._monitor_channel(channel_id)
            )

    async def stop(self) -> None:
        """모든 감시 및 녹화를 중지한다."""
        self._running = False
        logger.info("Conductor 종료 요청...")

        # 모든 녹화 중지
        for channel_id, task in self._channels.items():
            pipe = task.pipeline
            if pipe is not None and pipe.state == RecordingState.RECORDING:
                await self._stop_recording(channel_id)

            mt = task.monitor_task
            if mt is not None and not mt.done():
                mt.cancel()

        logger.info("Conductor 종료 완료.")

    def _save_persistence(self) -> None:
        """채널 목록을 파일에 저장한다."""
        try:
            self._persistence_path.parent.mkdir(parents=True, exist_ok=True)
            data = {
                cid: {"auto_record": t.auto_record}
                for cid, t in self._channels.items()
            }
            with open(self._persistence_path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=4, ensure_ascii=False)
            logger.debug(f"채널 목록 저장 완료: {self._persistence_path}")
        except Exception as e:
            logger.error(f"채널 목록 저장 실패: {e}")

    def _load_persistence(self) -> None:
        """파일에서 채널 목록을 로드한다."""
        if not self._persistence_path.exists():
            return

        try:
            with open(self._persistence_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            
            for channel_id, config in data.items():
                auto_record = config.get("auto_record", True)
                self.add_channel(channel_id, auto_record=auto_record)
            
            logger.info(f"채널 목록 로드 완료 ({len(data)}개): {self._persistence_path}")
        except Exception as e:
            logger.error(f"채널 목록 로드 실패: {e}")

    async def _monitor_channel(self, channel_id: str) -> None:
        """단일 채널의 라이브 상태를 주기적으로 확인한다."""
        settings = get_settings()
        interval = settings.monitor_interval
        retry_count = 0
        max_retries = settings.max_record_retries

        logger.info(f"[{channel_id}] 감시 시작 (주기: {interval}초)")

        while self._running:
            try:
                status = await self._engine.check_live_status(channel_id)
                task = self._channels.get(channel_id)

                if task is None:
                    break

                was_live = task.is_live
                task.is_live = status["is_live"]
                task.channel_name = status.get("channel_name")
                task.title = status.get("title")
                task.category = status.get("category")
                task.viewer_count = status.get("viewer_count", 0)
                task.thumbnail_url = status.get("thumbnail_url")
                task.profile_image_url = status.get("profile_image_url")

                # ── 방송 시작 감지 ──
                if status["is_live"] and not was_live:
                    logger.info(
                        f"[{channel_id}] 🔴 방송 시작 감지! "
                        f"스트리머: {task.channel_name}, 제목: {task.title}"
                    )
                    if task.auto_record:
                        await self._start_recording(channel_id, channel_name=task.channel_name, title=task.title)
                        retry_count = 0

                # ── 방송 종료 감지 ──
                elif not status["is_live"] and was_live:
                    logger.info(f"[{channel_id}] ⚫ 방송 종료 감지.")
                    await self._stop_recording(channel_id)
                    retry_count = 0

                # ── 녹화 오류 시 자동 재시작 ──
                elif status["is_live"] and task.auto_record:
                    pipe = task.pipeline
                    if pipe is not None and pipe.state in (RecordingState.ERROR, RecordingState.COMPLETED):
                        if retry_count < max_retries:
                            retry_count += 1
                            logger.warning(
                                f"[{channel_id}] 녹화 중단 감지. "
                                f"자동 재녹화 시도 ({retry_count}/{max_retries})..."
                            )
                            await asyncio.sleep(5)  # 재시작 전 짧은 대기
                            await self._start_recording(channel_id, channel_name=task.channel_name, title=task.title)
                        elif retry_count == max_retries:
                            retry_count += 1  # 로그 한 번만
                            logger.error(
                                f"[{channel_id}] 최대 재시도 횟수 초과. "
                                f"녹화 시작 버튼으로 수동 재시작하세요."
                            )

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"[{channel_id}] 감시 오류: {e}")

            await asyncio.sleep(interval)

    async def _stop_recording(self, channel_id: str) -> None:
        """채널의 녹화 및 채팅 아카이빙을 중지한다."""
        task = self._channels.get(channel_id)
        if task is None:
            return

        # 녹화 중지
        pipe = task.pipeline
        if pipe is not None and pipe.state == RecordingState.RECORDING:
            await pipe.stop_recording()

            # ── Discord 알림: 녹화 완료 ──
            if self._discord_bot:
                status = pipe.get_status()
                duration = status.get("duration_seconds", 0)
                output_file = status.get("output_file", "N/A")
                file_size = status.get("file_size_bytes", 0) / (1024 * 1024)  # MB

                await self._discord_bot.send_notification(
                    title="⏹ 녹화 완료",
                    description=f"채널: **{task.channel_name or channel_id}**",
                    color="blue",
                    fields={
                        "녹화 시간": f"{duration // 60:.0f}분 {duration % 60:.0f}초",
                        "파일 크기": f"{file_size:.1f} MB",
                        "저장 경로": output_file,
                    },
                )

        # 채팅 아카이빙 중지
        archiver = task.chat_archiver
        if archiver is not None:
            try:
                await archiver.stop()
                task.chat_archiver = None
            except Exception as e:
                logger.error(f"[{channel_id}] 채팅 아카이빙 중지 실패: {e}")

    async def _start_recording(self, channel_id: str, channel_name: Optional[str] = None, title: Optional[str] = None) -> None:
        """채널의 녹화를 시작한다."""
        task = self._channels.get(channel_id)
        if task is None:
            return

        try:
            settings = get_settings()
            quality = settings.recording_quality or "best"
            stream_obj = self._engine.get_stream(channel_id, quality=quality)
            pipeline = FFmpegPipeline(channel_id=channel_id)
            task.pipeline = pipeline

            # 메타데이터 전달 (파일명 생성용)
            await pipeline.start_recording(
                stream_obj,
                streamer_name=channel_name or task.channel_name,
                title=title or task.title
            )
            logger.info(f"[{channel_id}] 자동 라이브 녹화 시작 (Hybrid, quality={quality}).")

            # ── Discord 알림: 녹화 시작 ──
            if self._discord_bot:
                await self._discord_bot.send_notification(
                    title="🔴 녹화 시작",
                    description=f"채널: **{channel_name or channel_id}**\n제목: {title or 'N/A'}",
                    color="green",
                    fields={"화질": quality},
                )

            # ── 채팅 아카이빙 시작 (설정 활성화 시) ──
            if settings.chat_archive_enabled:
                try:
                    # 녹화 파일과 같은 디렉토리에 .jsonl 파일 생성
                    recording_status = pipeline.get_status()
                    output_file = recording_status.get("output_file")
                    if output_file:
                        chat_file = Path(output_file).with_suffix(".jsonl")
                        archiver = ChatArchiver(
                            channel_id=channel_id,
                            output_path=chat_file,
                            auth=self._auth,
                        )
                        await archiver.start()
                        task.chat_archiver = archiver
                        logger.info(f"[{channel_id}] 채팅 아카이빙 시작: {chat_file}")
                except Exception as e:
                    logger.error(f"[{channel_id}] 채팅 아카이빙 시작 실패: {e}")
        except Exception as e:
            logger.error(f"[{channel_id}] 녹화 시작 실패: {e}")

            # ── Discord 알림: 녹화 시작 실패 ──
            if self._discord_bot:
                await self._discord_bot.send_notification(
                    title="❌ 녹화 시작 실패",
                    description=f"채널: **{channel_name or channel_id}**\n오류: {str(e)}",
                    color="red",
                )

    async def start_manual_recording(self, channel_id: str) -> dict:
        """수동으로 특정 채널의 녹화를 시작한다."""
        task = self._channels.get(channel_id)
        if task is None:
            # 미등록 채널도 임시로 녹화 가능
            task = ChannelTask(channel_id=channel_id, auto_record=False)
            self._channels[channel_id] = task

        pipe = task.pipeline
        if pipe is not None and pipe.state == RecordingState.RECORDING:
            return {"error": "이미 녹화 중입니다.", **pipe.get_status()}

        # 수동 녹화 시에도 상태 정보 업데이트 시도
        try:
            status = await self._engine.check_live_status(channel_id)
            task.channel_name = status.get("channel_name")
            task.title = status.get("title")
        except:
            pass

        await self._start_recording(channel_id)

        pipe = task.pipeline
        if pipe is not None:
            return pipe.get_status()
        return {"error": "녹화 시작 실패."}

    async def stop_manual_recording(self, channel_id: str) -> dict:
        """수동으로 특정 채널의 녹화를 중지한다."""
        task = self._channels.get(channel_id)
        if task is None:
            return {"error": "녹화 중인 채널이 아닙니다."}
        pipe = task.pipeline
        if pipe is None:
            return {"error": "녹화 중인 채널이 아닙니다."}

        await self._stop_recording(channel_id)
        return pipe.get_status()

    def get_all_status(self) -> list[dict]:
        """모든 채널의 상태를 반환한다."""
        result: list[dict] = []
        for channel_id, task in self._channels.items():
            status: dict = {
                "channel_id": channel_id,
                "auto_record": task.auto_record,
                "is_live": task.is_live,
                "recording": None,
                "chat_archiving": None,
                "channel_name": task.channel_name,
                "title": task.title,
                "category": task.category,
                "viewer_count": task.viewer_count,
                "thumbnail_url": task.thumbnail_url,
                "profile_image_url": task.profile_image_url,
            }
            pipe = task.pipeline
            if pipe is not None:
                status["recording"] = pipe.get_status()

            archiver = task.chat_archiver
            if archiver is not None:
                status["chat_archiving"] = archiver.get_status()

            result.append(status)
        return result
