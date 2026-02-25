"""
Chzzk-Recorder-Pro: VOD Engine (yt-dlp 래퍼)
yt-dlp를 사용하여 치지직 VOD/클립을 다운로드한다.
취소, 일시정지, 재개 기능을 지원한다.
"""

from __future__ import annotations

import asyncio
import json
import threading
import uuid
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import TYPE_CHECKING, Any, Callable, Optional

from app.core.config import get_settings
from app.core.logger import logger
from app.engine.auth import AuthManager

if TYPE_CHECKING:
    from app.services.discord_bot import DiscordBotService


class DownloadCancelledError(Exception):
    """다운로드 취소 예외."""


class VodDownloadState(str, Enum):
    """VOD 다운로드 상태."""

    IDLE = "idle"
    DOWNLOADING = "downloading"
    PAUSED = "paused"
    COMPLETED = "completed"
    ERROR = "error"
    CANCELLING = "cancelling"


@dataclass
class VodDownloadTask:
    """개별 다운로드 작업."""

    task_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    url: str = ""
    title: str = "Unknown"
    state: VodDownloadState = VodDownloadState.IDLE
    progress: float = 0.0
    quality: str = "best"
    output_dir: str = ""
    output_path: Optional[str] = None
    expected_part_file: Optional[str] = None
    error_message: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.now)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    # 다운로드 통계
    download_speed: float = 0.0  # MB/s
    downloaded_bytes: int = 0  # 바이트
    total_bytes: int = 0  # 바이트
    eta_seconds: int = 0  # 예상 남은 시간 (초)

    # 재시도 관련
    retry_count: int = 0  # 현재까지 재시도 횟수
    max_retries: int = 3  # 최대 재시도 횟수

    # 제어 플래그 (각 작업별 독립)
    cancel_flag: bool = False
    pause_event: threading.Event = field(default_factory=threading.Event)
    download_task: Optional[asyncio.Task] = None

    def __post_init__(self) -> None:
        self.pause_event.set()  # 초기 상태: 일시정지 아님


class VodEngine:
    """yt-dlp 기반 VOD/클립 다운로드 엔진.

    치지직 다시보기 및 클립 URL을 파싱하여 고속 다운로드한다.
    인증 쿠키를 통해 성인 인증 영상에도 접근 가능하다.
    취소, 일시정지, 재개 기능을 제공한다.

    다중 다운로드를 지원하며, task_id로 각 작업을 관리한다.
    """

    def __init__(
        self,
        auth: Optional[AuthManager] = None,
        discord_bot: Optional[DiscordBotService] = None,
    ) -> None:
        self._auth = auth or AuthManager()
        self._tasks: dict[str, VodDownloadTask] = {}
        self._discord_bot = discord_bot

        # 설정에서 동시 다운로드 개수 가져오기
        settings = get_settings()
        self._max_concurrent = settings.vod_max_concurrent
        self._semaphore = asyncio.Semaphore(self._max_concurrent)

        self._history_file = Path("data/vod_history.json")
        self._load_history()

    @property
    def state(self) -> VodDownloadState:
        """하위 호환성을 위한 속성. 첫 번째 작업의 상태 반환."""
        if not self._tasks:
            return VodDownloadState.IDLE
        first_task = next(iter(self._tasks.values()))
        return first_task.state

    @property
    def progress(self) -> float:
        """하위 호환성을 위한 속성. 첫 번째 작업의 진행률 반환."""
        if not self._tasks:
            return 0.0
        first_task = next(iter(self._tasks.values()))
        return first_task.progress

    def _is_chzzk_url(self, url: str) -> bool:
        """치지직 URL인지 확인."""
        return "chzzk.naver.com" in url

    def _build_ytdlp_options(
        self,
        task: VodDownloadTask,
        progress_callback: Optional[Callable[[dict], None]] = None,
    ) -> dict[str, Any]:
        """yt-dlp 옵션 딕셔너리를 구성한다."""
        settings = get_settings()
        ffmpeg_path = settings.resolve_ffmpeg_path()
        ffmpeg_dir = str(Path(ffmpeg_path).parent)

        opts: dict[str, Any] = {
            "format": task.quality,
            "outtmpl": str(Path(task.output_dir) / "[%(uploader,channel)s] %(title)s.%(ext)s"),
            "ffmpeg_location": ffmpeg_dir,
            "no_warnings": True,
            "quiet": True,
            "no_color": True,
        }

        # 치지직 URL인 경우에만 인증 쿠키 주입
        if self._is_chzzk_url(task.url):
            cookies = self._auth.get_cookies()
            if cookies:
                # yt-dlp에 쿠키를 전달하는 방법: http_headers를 통한 Cookie 헤더
                opts["http_headers"] = {
                    "Cookie": cookies.to_cookie_string(),
                    "User-Agent": (
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                        "AppleWebKit/537.36 (KHTML, like Gecko) "
                        "Chrome/131.0.0.0 Safari/537.36"
                    ),
                }

        # 진행률 콜백
        if progress_callback:
            opts["progress_hooks"] = [progress_callback]

        # 속도 제한 (MB/s → bytes/s)
        if settings.vod_max_speed > 0:
            opts["ratelimit"] = settings.vod_max_speed * 1024 * 1024  # MB/s to bytes/s

        return opts

    def _make_progress_callback(self, task: VodDownloadTask) -> Callable[[dict], None]:
        """task별 진행률 콜백 생성."""
        def _on_progress(d: dict) -> None:
            """yt-dlp 진행률 콜백 핸들러.

            이 콜백 내에서 취소/일시정지를 제어한다.
            yt-dlp가 주기적으로 이 콜백을 호출하므로, 여기서 blocking하면 일시정지 효과가 나타남.
            """
            # 취소 체크 — 즉시 예외로 yt-dlp를 중단
            if task.cancel_flag:
                raise DownloadCancelledError("다운로드가 취소되었습니다.")

            # 일시정지 체크 — event가 set될 때까지 blocking
            task.pause_event.wait()

            # 다시 취소 체크 (일시정지 해제 후 취소된 경우)
            if task.cancel_flag:
                raise DownloadCancelledError("다운로드가 취소되었습니다.")

            if d.get("status") == "downloading":
                total = d.get("total_bytes") or d.get("total_bytes_estimate", 0)
                downloaded = d.get("downloaded_bytes", 0)
                if total > 0:
                    task.progress = (downloaded / total) * 100

                # 다운로드 통계 업데이트
                task.downloaded_bytes = downloaded
                task.total_bytes = total

                # 속도 (bytes/s → MB/s)
                speed_bytes = d.get("speed", 0) or 0
                task.download_speed = speed_bytes / (1024 * 1024) if speed_bytes > 0 else 0.0

                # 예상 남은 시간 (초)
                task.eta_seconds = d.get("eta", 0) or 0

            elif d.get("status") == "finished":
                task.progress = 100.0

        return _on_progress

    async def get_video_info(self, url: str) -> dict:
        """VOD/클립의 메타데이터를 조회한다.

        Returns:
            title, duration, thumbnail, formats 등.
        """
        opts: dict[str, Any] = {
            "quiet": True,
            "no_warnings": True,
            "extract_flat": False,
        }

        # 치지직 URL인 경우에만 쿠키 주입
        if self._is_chzzk_url(url):
            cookies = self._auth.get_cookies()
            if cookies:
                opts["http_headers"] = {"Cookie": cookies.to_cookie_string()}

        def _extract() -> dict[str, Any] | None:
            import yt_dlp
            with yt_dlp.YoutubeDL(opts) as ydl:
                return ydl.extract_info(url, download=False)

        info: dict[str, Any] | None = await asyncio.to_thread(lambda: _extract())  # type: ignore[arg-type]

        if not info:
            raise ValueError(f"영상 정보를 가져올 수 없습니다: {url}")

        formats = []
        for f in info.get("formats", []):
            formats.append({
                "format_id": f.get("format_id"),
                "ext": f.get("ext"),
                "resolution": f.get("resolution", "audio only"),
                "filesize": f.get("filesize"),
            })

        return {
            "title": info.get("title", "Unknown"),
            "duration": info.get("duration", 0),
            "thumbnail": info.get("thumbnail", ""),
            "uploader": info.get("uploader", ""),
            "formats": formats,
            "url": url,
        }

    async def download(
        self,
        url: str,
        output_dir: Optional[str] = None,
        quality: str = "best",
    ) -> str:
        """VOD/클립 다운로드를 시작한다.

        Args:
            url: 치지직 VOD/클립 URL 또는 유튜브 등 yt-dlp 지원 사이트 URL.
            output_dir: 저장 디렉토리.
            quality: 화질 ('best', 'worst', 또는 format_id).

        Returns:
            task_id (작업 추적용 UUID).
        """
        settings = get_settings()

        if output_dir is not None:
            # 명시적으로 경로가 주어진 경우 → 그대로 사용
            save_dir = output_dir
        elif not settings.split_download_dirs:
            # 분할 경로 비활성화 → 기본 download_dir 사용
            save_dir = settings.download_dir
        elif self._is_chzzk_url(url):
            # 분할 경로 활성화 + 치지직 URL → vod_chzzk_dir (미설정 시 download_dir 폴백)
            save_dir = settings.vod_chzzk_dir or settings.download_dir
        else:
            # 분할 경로 활성화 + 외부 URL → vod_external_dir (미설정 시 download_dir 폴백)
            save_dir = settings.vod_external_dir or settings.download_dir

        Path(save_dir).mkdir(parents=True, exist_ok=True)

        # 새 작업 생성
        task = VodDownloadTask(
            url=url,
            quality=quality,
            output_dir=save_dir,
            state=VodDownloadState.IDLE,
        )

        # 새 작업을 맨 앞에 추가 (최신 항목이 위로)
        new_tasks = {task.task_id: task}
        new_tasks.update(self._tasks)
        self._tasks = new_tasks

        # 백그라운드에서 다운로드 시작
        task.download_task = asyncio.create_task(self._run_download(task.task_id))

        logger.info(f"[{task.task_id}] VOD 다운로드 작업 추가: {url} (화질: {quality})")
        return task.task_id

    async def _run_download(self, task_id: str) -> None:
        """실제 다운로드 실행 (세마포어로 동시 실행 제어)."""
        async with self._semaphore:  # 동시 다운로드 제한
            task = self._tasks.get(task_id)
            if not task:
                logger.error(f"[{task_id}] 작업을 찾을 수 없습니다.")
                return

            task.state = VodDownloadState.DOWNLOADING
            task.started_at = datetime.now()
            logger.info(f"[{task_id}] 다운로드 시작: {task.url}")

            # URL 타입 감지
            is_chzzk = self._is_chzzk_url(task.url)
            is_clip = "/clips/" in task.url

            try:
                if is_chzzk and is_clip:
                    # 치지직 클립 (Streamlink + FFmpeg, 짧은 영상)
                    await self._download_clip(task_id, task)
                else:
                    # 치지직 VOD 및 모든 외부 URL → yt-dlp
                    # ── 근본 수정: Streamlink DASHStream.read()가 EOF를 반환하지 않아
                    # VOD 다운로드가 99%에서 멈추는 버그. yt-dlp는 EOF를 정확히 알고 있음.
                    await self._download_external(task_id, task)

            except DownloadCancelledError:
                task.state = VodDownloadState.IDLE
                task.progress = 0.0
                logger.info(f"[{task_id}] 다운로드 취소됨: {task.url}")

            except asyncio.CancelledError:
                # 서버 종료(Ctrl+C) 등으로 태스크가 취소됨 → 재시도하지 않음
                task.state = VodDownloadState.IDLE
                task.progress = 0.0
                logger.info(f"[{task_id}] 다운로드 태스크 취소됨 (서버 종료): {task.url}")
                raise  # CancelledError는 반드시 재전파

            except Exception as e:
                # FFmpeg 프로세스 실패 시 처리
                if task.cancel_flag:
                    task.state = VodDownloadState.IDLE
                    task.progress = 0.0
                    logger.info(f"[{task_id}] 다운로드 취소됨 (예외 처리): {task.url}")
                else:
                    import traceback

                    # 이벤트 루프가 종료 중이면 재시도하지 않음
                    loop = asyncio.get_event_loop()
                    if not loop.is_running():
                        logger.info(f"[{task_id}] 이벤트 루프 종료 중, 재시도 중단")
                        task.state = VodDownloadState.ERROR
                        task.error_message = str(e)
                        return

                    task.retry_count += 1

                    # 재시도 가능 여부 확인
                    if task.retry_count < task.max_retries:
                        logger.warning(
                            f"[{task_id}] 다운로드 실패 (재시도 {task.retry_count}/{task.max_retries}): {e}"
                        )
                        task.error_message = f"재시도 중... ({task.retry_count}/{task.max_retries}): {str(e)}"

                        # 일시적 오류일 가능성이 있으므로 잠시 대기 후 재시도
                        await asyncio.sleep(3 * task.retry_count)  # 백오프: 3초, 6초, 9초...

                        # 진행률 초기화 후 재시도
                        task.progress = 0.0
                        task.download_speed = 0.0
                        task.downloaded_bytes = 0

                        # 재귀적으로 재시도
                        return await self._run_download(task_id)
                    else:
                        # 최대 재시도 횟수 초과
                        logger.error(f"[{task_id}] 최대 재시도 횟수 초과: {e}")
                        logger.error(f"[{task_id}] 상세 트레이스:\n{traceback.format_exc()}")

                        task.error_message = f"재시도 {task.max_retries}회 실패: {str(e)}"
                        task.state = VodDownloadState.ERROR
                        # 에러 발생 시 이력 저장
                        self._save_history()

    async def _download_vod(self, task_id: str, task: VodDownloadTask) -> None:
        """Streamlink + FFmpeg를 사용한 VOD 다운로드 (중단 시에도 재생 가능).

        치지직 VOD URL → Streamlink으로 스트림 추출 → FFmpeg 파이프라인으로 저장.
        라이브 녹화와 동일한 방식으로, 중단되어도 바로 재생 가능하다.
        """
        from app.engine.pipeline import FFmpegPipeline

        settings = get_settings()

        # 1. Streamlink으로 VOD 스트림 및 메타데이터 가져오기
        def _get_streams() -> dict[str, Any]:
            import streamlink
            from streamlink.plugins.chzzk import Chzzk

            session = streamlink.Streamlink()
            sl_options = self._auth.get_streamlink_options()
            for key, value in sl_options.items():
                session.set_option(key, value)

            plugin = Chzzk(session, task.url)
            streams = plugin.streams()
            if not streams:
                raise RuntimeError("VOD 스트림을 찾을 수 없습니다.")

            vod_title = getattr(plugin, 'title', None) or "Unknown VOD"
            channel_name = getattr(plugin, 'author', None) or "Unknown Channel"

            logger.info(f"[{task_id}] VOD 제목: {vod_title}, 채널: {channel_name}")

            return {
                "streams": streams,
                "vod_title": vod_title,
                "channel_name": channel_name,
            }

        stream_data: dict[str, Any] = await asyncio.to_thread(_get_streams)
        streams = stream_data["streams"]

        # UI 표시용 제목 설정
        task.title = f'[{stream_data["channel_name"]}] {stream_data["vod_title"]}'
        logger.info(f"[{task_id}] VOD 메타데이터: {task.title}")

        # 화질 선택
        stream = streams.get(task.quality) or streams.get("best")
        if not stream:
            raise RuntimeError(f"화질 '{task.quality}'를 찾을 수 없습니다.")

        # 파일명 생성: [채널명] 제목.{ext}
        ext = settings.output_format or "mp4"
        channel_name_clean = self._clean_filename(stream_data["channel_name"])
        vod_title_clean = self._clean_filename(stream_data["vod_title"])
        filename = f"[{channel_name_clean}] {vod_title_clean}.{ext}"
        output_file = Path(task.output_dir) / filename
        task.output_path = str(output_file)

        logger.info(f"[{task_id}] VOD 다운로드: {task.url} -> {output_file}")

        # 2. FFmpeg 파이프라인으로 다운로드
        pipeline = FFmpegPipeline(channel_id=task_id)
        await pipeline.start_recording(
            stream_obj=stream,
            output_dir=task.output_dir,
            filename=filename,
        )

        # 3. 진행률 모니터링 (파일 크기 기반 + 정체 감지)
        last_size = 0
        stall_count = 0
        STALL_THRESHOLD = 15  # 15회 × 2초 = 30초 동안 파일 크기 변화 없으면 완료로 간주

        while pipeline.state.value == "recording":
            if task.cancel_flag:
                await pipeline.stop_recording()
                raise DownloadCancelledError("사용자에 의해 취소되었습니다.")

            # 일시정지 체크
            task.pause_event.wait()

            # 파일 크기 기반 진행률 추정
            if output_file.exists():
                downloaded = output_file.stat().st_size
                task.downloaded_bytes = downloaded
                task.download_speed = 0.0
                # 크기 정보가 없으므로 대략적으로 표시
                task.progress = min((downloaded / (500 * 1024 * 1024)) * 100, 99.0)

                # ── VOD 정체(Stall) 감지 ──
                # Streamlink DASHStream이 모든 데이터 전송 후 EOF를 보내지 않아
                # FFmpeg가 종료되지 않는 문제를 우회한다.
                if downloaded > 0 and downloaded == last_size:
                    stall_count += 1
                    if stall_count >= STALL_THRESHOLD:
                        logger.info(
                            f"[{task_id}] VOD 스트림 데이터 수신 완료 감지 "
                            f"(파일 크기 {downloaded / (1024*1024):.1f}MB, {stall_count * 2}초 정체). "
                            f"파이프라인을 종료합니다."
                        )
                        await pipeline.stop_recording()
                        break
                else:
                    stall_count = 0
                    last_size = downloaded

            await asyncio.sleep(2)

        # 4. 완료 확인 (stall 감지로 stop_recording된 경우도 파일이 있으면 완료 처리)
        if output_file.exists() and pipeline.state.value in ("completed", "stopping"):
            task.state = VodDownloadState.COMPLETED
            task.completed_at = datetime.now()
            task.output_path = str(output_file)
            task.progress = 100.0
            logger.info(f"[{task_id}] VOD 다운로드 완료: {output_file}")
            self._save_history()

            # ── Discord 알림: VOD 다운로드 완료 ──
            if self._discord_bot:
                file_size = output_file.stat().st_size / (1024 * 1024)
                duration = (task.completed_at - task.started_at).total_seconds() if task.started_at and task.completed_at else 0

                await self._discord_bot.send_notification(
                    title="📥 VOD 다운로드 완료",
                    description=f"제목: **{task.title}**",
                    color="green",
                    fields={
                        "화질": task.quality,
                        "파일 크기": f"{file_size:.1f} MB",
                        "다운로드 시간": f"{duration // 60:.0f}분 {duration % 60:.0f}초" if duration > 0 else "N/A",
                        "저장 경로": str(output_file),
                    },
                )
        else:
            raise RuntimeError(f"FFmpeg 파이프라인 오류: {pipeline.state.value}")

    async def _download_clip(self, task_id: str, task: VodDownloadTask) -> None:
        """Streamlink + FFmpeg를 사용한 클립 다운로드."""
        from app.engine.pipeline import FFmpegPipeline

        settings = get_settings()

        # Streamlink로 클립 스트림 및 메타데이터 가져오기
        def _get_streams() -> dict[str, Any]:
            import streamlink
            from streamlink.plugins.chzzk import Chzzk

            session = streamlink.Streamlink()
            sl_options = self._auth.get_streamlink_options()
            for key, value in sl_options.items():
                session.set_option(key, value)

            # Chzzk 플러그인 인스턴스 직접 생성
            plugin = Chzzk(session, task.url)

            # ── Streamlink 8.2.0 chzzk 플러그인 버그 패치 ──
            # _get_vod_playback()에서 metadata를 4개 언패킹하지만
            # get_clips()는 3개만 반환하여 ValueError 발생.
            # metadata가 부족하면 None으로 패딩하여 우회한다.
            _original_get_vod_playback = plugin._get_vod_playback

            def _patched_get_vod_playback(datatype, data):
                if datatype == "error":
                    return _original_get_vod_playback(datatype, data)
                # data 튜플에서 앞 4개(adult, in_key, vod_id, playback)를 제외한 나머지가 metadata
                if isinstance(data, tuple) and len(data) >= 4:
                    metadata_len = len(data) - 4
                    if metadata_len < 4:
                        # metadata를 4개로 패딩 (id, author, title, category)
                        data = data + (None,) * (4 - metadata_len)
                return _original_get_vod_playback(datatype, data)

            plugin._get_vod_playback = _patched_get_vod_playback

            # 플러그인의 streams() 메서드를 직접 호출
            streams = plugin.streams()
            if not streams:
                raise RuntimeError("클립 스트림을 찾을 수 없습니다.")

            # 플러그인에서 메타데이터 가져오기 (streams() 호출 후 설정됨)
            clip_title = getattr(plugin, 'title', None) or "Unknown Clip"
            channel_name = getattr(plugin, 'author', None) or "Unknown Channel"

            logger.info(f"[{task_id}] 클립 제목: {clip_title}, 채널: {channel_name}")

            return {
                "streams": streams,
                "clip_title": clip_title,
                "channel_name": channel_name
            }

        stream_data: dict[str, Any] = await asyncio.to_thread(_get_streams)
        streams = stream_data["streams"]

        # UI 표시용 제목 설정 (채널명 + 클립제목)
        task.title = f'[{stream_data["channel_name"]}] {stream_data["clip_title"]}'
        logger.info(f"[{task_id}] 클립 메타데이터: {task.title}")

        # 화질 선택
        stream = streams.get(task.quality) or streams.get("best")
        if not stream:
            raise RuntimeError(f"화질 '{task.quality}'를 찾을 수 없습니다.")

        # FFmpeg로 다운로드
        # 파일명 생성: [채널명].{ext}
        ext = settings.output_format or "mp4"
        channel_name_clean = self._clean_filename(stream_data["channel_name"])
        filename = f"[{channel_name_clean}].{ext}"
        output_file = Path(task.output_dir) / filename
        task.expected_part_file = str(output_file) + ".part"

        logger.info(f"[{task_id}] 클립 다운로드: {task.url} -> {output_file}")

        # FFmpeg 파이프라인 생성 및 시작
        pipeline = FFmpegPipeline(channel_id=task_id)
        await pipeline.start_recording(
            stream_obj=stream,
            output_dir=task.output_dir,
            filename=filename,
        )

        # 진행률 모니터링 (파일 크기 기반 + 정체 감지)
        last_size = 0
        stall_count = 0
        STALL_THRESHOLD = 10  # 10회 × 2초 = 20초 (클립은 짧으므로 더 짧은 감지)

        while pipeline.state.value == "recording":
            if task.cancel_flag:
                await pipeline.stop_recording()
                raise DownloadCancelledError("사용자에 의해 취소되었습니다.")

            # 일시정지 체크
            task.pause_event.wait()

            # 파일 크기 기반 진행률 추정 (완전한 추정이 불가능하므로 대략적으로)
            if output_file.exists():
                current_size = output_file.stat().st_size
                file_size_mb = current_size / (1024 * 1024)
                # 임의로 100MB를 100%로 가정 (클립은 보통 짧음)
                task.progress = min((file_size_mb / 100) * 100, 99.0)

                # ── 클립 정체(Stall) 감지 ──
                if current_size > 0 and current_size == last_size:
                    stall_count += 1
                    if stall_count >= STALL_THRESHOLD:
                        logger.info(
                            f"[{task_id}] 클립 데이터 수신 완료 감지 "
                            f"(파일 크기 {file_size_mb:.1f}MB). 파이프라인을 종료합니다."
                        )
                        await pipeline.stop_recording()
                        break
                else:
                    stall_count = 0
                    last_size = current_size

            await asyncio.sleep(2)

        # 완료 확인 (stall 감지로 stop_recording된 경우도 파일이 있으면 완료 처리)
        if output_file.exists() and pipeline.state.value in ("completed", "stopping"):
            task.state = VodDownloadState.COMPLETED
            task.completed_at = datetime.now()
            task.output_path = str(output_file)
            task.progress = 100.0
            logger.info(f"[{task_id}] 클립 다운로드 완료: {output_file}")
            # 완료 시 이력 저장
            self._save_history()
        else:
            raise RuntimeError(f"FFmpeg 파이프라인 오류: {pipeline.state.value}")

    async def _download_external(self, task_id: str, task: VodDownloadTask) -> None:
        """yt-dlp를 사용한 외부 URL(유튜브 등) 다운로드."""
        import yt_dlp

        # 1. 메타데이터 추출
        opts_info = self._build_ytdlp_options(task, progress_callback=None)

        def _extract_info() -> dict[str, Any] | None:
            with yt_dlp.YoutubeDL(opts_info) as ydl:
                return ydl.extract_info(task.url, download=False)

        info: dict[str, Any] | None = await asyncio.to_thread(lambda: _extract_info())  # type: ignore[arg-type]

        if not info:
            raise RuntimeError("영상 정보를 가져올 수 없습니다.")

        vod_title = info.get("title", "Unknown")
        uploader = info.get("uploader") or info.get("channel") or "Unknown Channel"
        task.title = f"[{uploader}] {vod_title}"
        logger.info(f"[{task_id}] 외부 VOD 메타데이터: {task.title}")

        # 예상 파일명 저장
        with yt_dlp.YoutubeDL(opts_info) as ydl:
            expected_file = ydl.prepare_filename(info)
            task.expected_part_file = expected_file + ".part"

        # 2. 실제 다운로드
        opts = self._build_ytdlp_options(
            task,
            progress_callback=self._make_progress_callback(task),
        )

        def _download() -> str | None:
            with yt_dlp.YoutubeDL(opts) as ydl:
                ydl.extract_info(task.url, download=True)
                return expected_file

        filepath: str | None = await asyncio.to_thread(lambda: _download())  # type: ignore[arg-type]

        if filepath:
            task.state = VodDownloadState.COMPLETED
            task.completed_at = datetime.now()
            task.output_path = filepath
            task.progress = 100.0
            logger.info(f"[{task_id}] 외부 VOD 다운로드 완료: {filepath}")
            self._save_history()

            if self._discord_bot:
                file_size = Path(filepath).stat().st_size / (1024 * 1024) if Path(filepath).exists() else 0
                duration = (task.completed_at - task.started_at).total_seconds() if task.started_at and task.completed_at else 0

                await self._discord_bot.send_notification(
                    title="📥 VOD 다운로드 완료",
                    description=f"제목: **{task.title}**",
                    color="green",
                    fields={
                        "화질": task.quality,
                        "파일 크기": f"{file_size:.1f} MB",
                        "다운로드 시간": f"{duration // 60:.0f}분 {duration % 60:.0f}초" if duration > 0 else "N/A",
                        "저장 경로": filepath,
                    },
                )
        else:
            task.state = VodDownloadState.ERROR
            task.error_message = "다운로드 결과를 확인할 수 없습니다."
            logger.error(f"[{task_id}] {task.error_message}")
            self._save_history()

    def _clean_filename(self, name: str) -> str:
        """파일명에서 사용할 수 없는 특수문자를 제거한다."""
        from app.core.utils import clean_filename
        return clean_filename(name, max_length=100)

    def cancel_download(self, task_id: str) -> dict[str, Any]:
        """특정 다운로드를 취소한다."""
        task = self._tasks.get(task_id)
        if not task:
            return {"error": "작업을 찾을 수 없습니다.", "task_id": task_id}

        if task.state not in (VodDownloadState.DOWNLOADING, VodDownloadState.PAUSED):
            return {
                "error": "취소할 다운로드가 없습니다.",
                "state": task.state.value,
                "task_id": task_id,
            }

        logger.info(f"[{task_id}] 다운로드 취소 요청...")
        task.cancel_flag = True
        task.state = VodDownloadState.CANCELLING
        # 일시정지 중이면 해제해서 취소가 진행되도록
        task.pause_event.set()
        return {
            "message": "다운로드 취소 요청됨.",
            "state": task.state.value,
            "task_id": task_id,
        }

    def pause_download(self, task_id: str) -> dict[str, Any]:
        """특정 다운로드를 일시정지한다."""
        task = self._tasks.get(task_id)
        if not task:
            return {"error": "작업을 찾을 수 없습니다.", "task_id": task_id}

        if task.state != VodDownloadState.DOWNLOADING:
            return {
                "error": "일시정지할 다운로드가 없습니다.",
                "state": task.state.value,
                "task_id": task_id,
            }

        logger.info(f"[{task_id}] 다운로드 일시정지 요청...")
        task.pause_event.clear()  # progress callback에서 blocking
        task.state = VodDownloadState.PAUSED
        return {
            "message": "다운로드가 일시정지되었습니다.",
            "state": task.state.value,
            "task_id": task_id,
        }

    def resume_download(self, task_id: str) -> dict[str, Any]:
        """일시정지된 다운로드를 재개한다."""
        task = self._tasks.get(task_id)
        if not task:
            return {"error": "작업을 찾을 수 없습니다.", "task_id": task_id}

        if task.state != VodDownloadState.PAUSED:
            return {
                "error": "재개할 다운로드가 없습니다.",
                "state": task.state.value,
                "task_id": task_id,
            }

        logger.info(f"[{task_id}] 다운로드 재개 요청...")
        task.pause_event.set()  # progress callback 해제
        task.state = VodDownloadState.DOWNLOADING
        return {
            "message": "다운로드가 재개되었습니다.",
            "state": task.state.value,
            "task_id": task_id,
        }


    async def retry_download(self, task_id: str) -> str:
        """완료/에러 상태의 작업을 재다운로드한다."""
        old_task = self._tasks.get(task_id)
        if not old_task:
            raise ValueError("작업을 찾을 수 없습니다.")

        if old_task.state not in (VodDownloadState.COMPLETED, VodDownloadState.ERROR):
            raise ValueError(f"재다운로드는 완료 또는 에러 상태에서만 가능합니다. 현재 상태: {old_task.state.value}")

        logger.info(f"[{task_id}] 재다운로드 요청 - URL: {old_task.url}, 화질: {old_task.quality}")

        # 기존 작업 정보를 기반으로 새 다운로드 시작
        new_task_id = await self.download(
            url=old_task.url,
            output_dir=old_task.output_dir,
            quality=old_task.quality,
        )

        logger.info(f"[{task_id}] → 새 작업 생성: {new_task_id}")
        return new_task_id

    def get_task_status(self, task_id: str) -> dict[str, Any]:
        """특정 작업의 상태를 반환한다."""
        task = self._tasks.get(task_id)
        if not task:
            return {"error": "작업을 찾을 수 없습니다.", "task_id": task_id}

        return {
            "task_id": task.task_id,
            "url": task.url,
            "title": task.title,
            "state": task.state.value,
            "progress": round(task.progress, 1),
            "quality": task.quality,
            "output_path": task.output_path,
            "error_message": task.error_message,
            "created_at": task.created_at.isoformat(),
            "started_at": task.started_at.isoformat() if task.started_at else None,
            "completed_at": task.completed_at.isoformat() if task.completed_at else None,
            # 다운로드 통계
            "download_speed": round(task.download_speed, 2),  # MB/s
            "downloaded_bytes": task.downloaded_bytes,
            "total_bytes": task.total_bytes,
            "eta_seconds": task.eta_seconds,
        }

    def list_all_tasks(self) -> list[dict[str, Any]]:
        """모든 작업 목록을 반환한다."""
        return [self.get_task_status(tid) for tid in self._tasks.keys()]

    def reorder_tasks(self, task_ids: list[str]) -> dict[str, Any]:
        """작업 순서를 재정렬한다.

        Args:
            task_ids: 새로운 순서대로 정렬된 task_id 리스트

        Returns:
            성공 메시지 또는 에러
        """
        # 모든 task_id가 유효한지 확인
        for tid in task_ids:
            if tid not in self._tasks:
                return {"error": f"존재하지 않는 작업 ID: {tid}"}

        # 제공된 task_ids와 현재 tasks의 개수가 일치하는지 확인
        if len(task_ids) != len(self._tasks):
            return {
                "error": f"작업 개수 불일치: 제공={len(task_ids)}, 현재={len(self._tasks)}"
            }

        # 새로운 순서로 재정렬
        new_tasks: dict[str, VodDownloadTask] = {}
        for tid in task_ids:
            new_tasks[tid] = self._tasks[tid]

        self._tasks = new_tasks
        logger.info(f"작업 순서 재정렬 완료: {len(task_ids)}개")

        return {"message": "작업 순서가 변경되었습니다.", "count": len(task_ids)}

    def clear_completed_tasks(self) -> dict[str, Any]:
        """완료 및 에러 상태의 작업들을 일괄 삭제한다.

        Returns:
            삭제된 작업 개수 및 메시지
        """
        before_count = len(self._tasks)

        # 완료/에러 상태가 아닌 작업만 남김
        active_tasks = {
            tid: task
            for tid, task in self._tasks.items()
            if task.state not in (VodDownloadState.COMPLETED, VodDownloadState.ERROR)
        }

        deleted_count = before_count - len(active_tasks)
        self._tasks = active_tasks

        logger.info(f"완료된 작업 정리: {deleted_count}개 삭제됨")

        return {
            "message": f"{deleted_count}개의 완료된 작업이 삭제되었습니다.",
            "deleted_count": deleted_count,
            "remaining_count": len(active_tasks),
        }

    def open_file_location(self, task_id: str) -> dict[str, Any]:
        """작업의 출력 파일 위치를 탐색기로 엽니다.

        Args:
            task_id: 작업 ID

        Returns:
            성공/실패 메시지
        """
        task = self._tasks.get(task_id)
        if not task:
            return {"error": "작업을 찾을 수 없습니다."}

        if not task.output_path:
            return {"error": "출력 파일 경로가 없습니다."}

        output_file = Path(task.output_path)
        if not output_file.exists():
            return {"error": "파일이 존재하지 않습니다."}

        # OS별로 파일 탐색기 열기
        import platform
        import subprocess

        try:
            system = platform.system()
            if system == "Windows":
                # Windows: explorer /select,"파일경로"
                subprocess.run(["explorer", "/select,", str(output_file)], check=False)
            elif system == "Darwin":  # macOS
                # macOS: open -R "파일경로"
                subprocess.run(["open", "-R", str(output_file)], check=False)
            else:  # Linux
                # Linux: xdg-open "폴더경로"
                subprocess.run(["xdg-open", str(output_file.parent)], check=False)

            logger.info(f"[{task_id}] 파일 위치 열기: {output_file}")
            return {"message": "파일 위치를 열었습니다.", "path": str(output_file)}

        except Exception as e:
            logger.error(f"[{task_id}] 파일 위치 열기 실패: {e}")
            return {"error": f"파일 위치를 열 수 없습니다: {str(e)}"}

    def get_status(self) -> dict[str, Any]:
        """하위 호환성을 위한 메서드. 첫 번째 작업의 상태 반환."""
        if not self._tasks:
            return {
                "state": VodDownloadState.IDLE.value,
                "progress": 0.0,
                "title": None,
            }

        first_task = next(iter(self._tasks.values()))
        return {
            "state": first_task.state.value,
            "progress": round(first_task.progress, 1),
            "title": first_task.title,
        }

    def _load_history(self) -> None:
        """이력 파일에서 완료된 작업을 불러온다."""
        if not self._history_file.exists():
            return

        try:
            with open(self._history_file, "r", encoding="utf-8") as f:
                history_data = json.load(f)

            for task_data in history_data:
                # 완료/에러 상태의 작업만 복원
                if task_data.get("state") in ["completed", "error"]:
                    task = VodDownloadTask(
                        task_id=task_data["task_id"],
                        url=task_data["url"],
                        title=task_data["title"],
                        state=VodDownloadState(task_data["state"]),
                        progress=task_data["progress"],
                        quality=task_data.get("quality", "best"),
                        output_dir=task_data.get("output_dir", ""),
                        output_path=task_data.get("output_path"),
                        error_message=task_data.get("error_message"),
                        created_at=datetime.fromisoformat(task_data["created_at"]),
                        started_at=datetime.fromisoformat(task_data["started_at"]) if task_data.get("started_at") else None,
                        completed_at=datetime.fromisoformat(task_data["completed_at"]) if task_data.get("completed_at") else None,
                    )
                    self._tasks[task.task_id] = task

            logger.info(f"VOD 다운로드 이력 로드 완료: {len(history_data)}개")
        except Exception as e:
            logger.warning(f"VOD 이력 로드 실패: {e}")

    def _save_history(self) -> None:
        """완료/에러 상태의 작업을 이력 파일에 저장한다."""
        try:
            self._history_file.parent.mkdir(parents=True, exist_ok=True)

            history_data = []
            for task in self._tasks.values():
                # 완료되거나 에러가 난 작업만 저장
                if task.state in (VodDownloadState.COMPLETED, VodDownloadState.ERROR):
                    history_data.append({
                        "task_id": task.task_id,
                        "url": task.url,
                        "title": task.title,
                        "state": task.state.value,
                        "progress": task.progress,
                        "quality": task.quality,
                        "output_dir": task.output_dir,
                        "output_path": task.output_path,
                        "error_message": task.error_message,
                        "created_at": task.created_at.isoformat(),
                        "started_at": task.started_at.isoformat() if task.started_at else None,
                        "completed_at": task.completed_at.isoformat() if task.completed_at else None,
                    })

            with open(self._history_file, "w", encoding="utf-8") as f:
                json.dump(history_data, f, ensure_ascii=False, indent=2)

            logger.debug(f"VOD 다운로드 이력 저장 완료: {len(history_data)}개")
        except Exception as e:
            logger.warning(f"VOD 이력 저장 실패: {e}")
