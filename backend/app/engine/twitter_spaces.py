"""
Chzzk-Recorder-Pro: Twitter Spaces 엔진
Twitter API v2로 스페이스 라이브 상태를 확인하고,
yt-dlp asyncio subprocess로 오디오(m4a)를 녹화한다.

참고:
- streamlink는 Twitter Spaces 미지원 → yt-dlp 사용
- 라이브 감지: GET /2/spaces?user_ids={id}&space.fields=state,title
- 녹화: yt-dlp https://twitter.com/i/spaces/{space_id}
- 쿠키 파일: Netscape 형식 (선택 사항이나 권장)
"""

from __future__ import annotations

import asyncio
import shutil
from datetime import datetime
from pathlib import Path
from typing import Optional

import httpx

from app.core.config import get_settings
from app.core.logger import logger
from app.engine.base import LiveStatus

# ── Twitter API v2 ──────────────────────────────────────────
TWITTER_API_BASE = "https://api.twitter.com/2"
TWITTER_SPACES_URL = "https://twitter.com/i/spaces/{space_id}"


class TwitterSpacesEngine:
    """Twitter Spaces 라이브 감지 + yt-dlp 오디오 녹화 엔진.

    라이브 감지: Twitter API v2 `GET /2/spaces?user_ids={id}&space.fields=state,title`
    녹화: yt-dlp subprocess (m4a 오디오)
    인증: Bearer Token (OAuth 2.0 App-Only)
    """

    def _get_auth_header(self) -> dict[str, str]:
        """Bearer Token 헤더를 생성한다."""
        settings = get_settings()
        token = settings.twitter_bearer_token
        if not token:
            return {}
        return {"Authorization": f"Bearer {token}"}

    async def check_live_status(self, channel_id: str) -> LiveStatus:
        """Twitter API v2로 사용자의 활성 Spaces를 확인한다.

        Args:
            channel_id: Twitter 사용자 ID (숫자 형식, 예: "123456789")
                        @핸들이 아닌 numeric user_id 필요.

        Returns:
            LiveStatus 딕셔너리.
            is_live=True 시 space_id 필드에 녹화에 필요한 Space ID 포함.
        """
        settings = get_settings()
        if not settings.twitter_bearer_token:
            logger.warning(f"[TwitterSpaces:{channel_id}] Bearer Token 미설정. 감지 불가.")
            return self._offline_status(channel_id)

        url = f"{TWITTER_API_BASE}/spaces"
        params = {
            "user_ids": channel_id,
            "space.fields": "state,title,host_ids",
        }
        headers = {
            "Accept": "application/json",
            **self._get_auth_header(),
        }

        async with httpx.AsyncClient() as client:
            try:
                resp = await client.get(url, params=params, headers=headers, timeout=10.0)
            except httpx.RequestError as e:
                logger.error(f"[TwitterSpaces:{channel_id}] API 요청 실패: {e}")
                return self._offline_status(channel_id)

        if resp.status_code != 200:
            logger.warning(f"[TwitterSpaces:{channel_id}] API 응답 {resp.status_code}: {resp.text[:200]}")
            return self._offline_status(channel_id)

        try:
            data = resp.json()
        except Exception:
            return self._offline_status(channel_id)

        spaces = data.get("data") or []
        if not spaces:
            return self._offline_status(channel_id)

        # 현재 라이브(state == "live") Space 검색
        live_space = next((s for s in spaces if s.get("state") == "live"), None)
        if live_space is None:
            return self._offline_status(channel_id)

        return LiveStatus(
            channel_id=channel_id,
            is_live=True,
            channel_name=channel_id,  # Twitter API v2 기본 응답에 display name 없음
            title=live_space.get("title", "Twitter Spaces"),
            category="Twitter Spaces",
            viewer_count=0,
            thumbnail_url="",
            profile_image_url="",
            space_id=live_space.get("id"),
        )

    def get_stream(self, channel_id: str, quality: str = "best") -> object:
        """Twitter Spaces는 streamlink 미지원.

        대신 start_ytdlp_recording()을 사용할 것.
        """
        raise NotImplementedError(
            "Twitter Spaces는 streamlink를 지원하지 않습니다. "
            "start_ytdlp_recording()을 사용하세요."
        )

    async def start_ytdlp_recording(
        self,
        space_id: str,
        output_dir: str,
        channel_name: str,
        title: Optional[str] = None,
        cookie_file: Optional[str] = None,
    ) -> asyncio.subprocess.Process:
        """yt-dlp subprocess로 Twitter Spaces 오디오를 녹화한다.

        Args:
            space_id: Twitter Space ID (예: "1YqKDqWkrjRKV")
            output_dir: 저장 디렉토리 경로
            channel_name: 스트리머 이름 (파일명 생성용)
            title: 방송 제목 (파일명 생성용)
            cookie_file: Netscape 형식 쿠키 파일 경로 (선택)

        Returns:
            실행 중인 asyncio.subprocess.Process 객체.
        """
        ytdlp_path = self._resolve_ytdlp_path()
        space_url = TWITTER_SPACES_URL.format(space_id=space_id)

        # 파일명 생성: [채널명] 제목_날짜시간.m4a
        safe_channel = _sanitize_filename(channel_name)
        safe_title = _sanitize_filename(title or "Twitter Spaces")
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"[{safe_channel}] {safe_title}_{timestamp}.m4a"

        output_path = Path(output_dir) / filename
        output_path.parent.mkdir(parents=True, exist_ok=True)

        cmd = [
            ytdlp_path,
            space_url,
            "--output", str(output_path),
            "--format", "bestaudio",
            "--audio-format", "m4a",
            "--no-progress",
            "--quiet",
        ]

        if cookie_file and Path(cookie_file).is_file():
            cmd.extend(["--cookies", cookie_file])
        elif cookie_file:
            logger.warning(f"[TwitterSpaces] 쿠키 파일을 찾을 수 없습니다: {cookie_file}")

        logger.info(f"[TwitterSpaces] yt-dlp 녹화 시작: {output_path}")

        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        return process

    @staticmethod
    def _resolve_ytdlp_path() -> str:
        """yt-dlp 실행 파일 경로를 찾는다."""
        for name in ("yt-dlp", "yt-dlp.exe", "yt_dlp"):
            path = shutil.which(name)
            if path:
                return path
        raise FileNotFoundError(
            "yt-dlp를 찾을 수 없습니다. "
            "pip install yt-dlp 또는 시스템 PATH에 yt-dlp를 추가하세요."
        )

    @staticmethod
    def _offline_status(channel_id: str) -> LiveStatus:
        """오프라인 상태 딕셔너리를 반환한다."""
        return LiveStatus(
            channel_id=channel_id,
            is_live=False,
            channel_name=channel_id,
            title="",
            category="",
            viewer_count=0,
            thumbnail_url="",
            profile_image_url="",
            space_id=None,
        )


def _sanitize_filename(name: str) -> str:
    """파일명에 사용 불가한 문자를 제거한다."""
    invalid = r'\/:*?"<>|'
    for ch in invalid:
        name = name.replace(ch, "_")
    return name.strip()[:50]  # 최대 50자
