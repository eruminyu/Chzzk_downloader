"""
Chzzk-Recorder-Pro: Live Engine (Streamlink 래퍼)
Streamlink을 사용하여 치지직 라이브 스트림 URL을 추출한다.
"""

from __future__ import annotations

from typing import Optional

import httpx
import streamlink

from app.core.logger import logger
from app.engine.auth import AuthManager

# ── 치지직 API ──────────────────────────────────────────
CHZZK_API_BASE = "https://api.chzzk.naver.com"
CHZZK_LIVE_DETAIL = f"{CHZZK_API_BASE}/service/v3/channels/{{channel_id}}/live-detail"
CHZZK_LIVE_URL = "https://chzzk.naver.com/live/{channel_id}"


class StreamExtractError(Exception):
    """스트림 URL 추출 실패 예외."""


class ChannelOfflineError(StreamExtractError):
    """채널이 오프라인 상태."""


class StreamLinkEngine:
    """Streamlink 기반 라이브 스트림 엔진.

    치지직 채널의 HLS 스트림 URL을 추출하고,
    인증 쿠키를 주입하여 성인 인증 방송에 접근한다.
    """

    def __init__(self, auth: Optional[AuthManager] = None) -> None:
        self._auth = auth or AuthManager()

    def _create_session(self) -> streamlink.Streamlink:
        """인증 쿠키와 HLS 옵션이 설정된 Streamlink 세션을 생성한다."""
        session = streamlink.Streamlink()
        sl_options = self._auth.get_streamlink_options()
        for key, value in sl_options.items():
            session.set_option(key, value)
        session.set_option("hls-live-edge", 3)
        session.set_option("hls-segment-attempts", 5)
        session.set_option("hls-segment-timeout", 15.0)
        return session

    async def check_live_status(self, channel_id: str) -> dict:
        """치지직 API를 통해 채널의 라이브 상태를 확인한다.

        Returns:
            라이브 상태 정보 딕셔너리 (status, title, thumbnail 등).
        """
        url = CHZZK_LIVE_DETAIL.format(channel_id=channel_id)
        headers = self._auth.get_http_headers()

        async with httpx.AsyncClient() as client:
            resp = await client.get(url, headers=headers, timeout=10.0)
            resp.raise_for_status()
            data = resp.json()

        content = data.get("content", {})
        status = content.get("status", "CLOSE")
        channel = content.get("channel", {})

        # 실시간 썸네일 URL에서 {type} 플레이스홀더 치환
        raw_thumbnail = content.get("liveImageUrl", "")
        thumbnail_url = raw_thumbnail.replace("{type}", "480") if raw_thumbnail else ""

        return {
            "channel_id": channel_id,
            "status": status,
            "is_live": status == "OPEN",
            "channel_name": channel.get("channelName", "Unknown"),
            "title": content.get("liveTitle", "No Title"),
            "category": content.get("liveCategoryValue", ""),
            "viewer_count": content.get("concurrentUserCount", 0),
            "thumbnail_url": thumbnail_url,
            "profile_image_url": channel.get("channelImageUrl", ""),
        }

    def get_stream(
        self,
        channel_id: str,
        quality: str = "best",
    ) -> streamlink.Stream:
        """Streamlink 스트림 객체를 직접 반환한다.
        
        Hybrid Pipe Engine에서 FFmpeg의 stdin으로 데이터를 공급하는 데 사용됨.
        """
        live_url = CHZZK_LIVE_URL.format(channel_id=channel_id)
        session = self._create_session()
        streams = session.streams(live_url)
        if not streams:
            raise ChannelOfflineError(f"채널 '{channel_id}'이(가) 오프라인입니다.")

        if quality not in streams:
            quality = "best"

        return streams[quality]

    def get_available_qualities(self, channel_id: str) -> list[str]:
        """사용 가능한 화질 목록을 반환한다."""
        live_url = CHZZK_LIVE_URL.format(channel_id=channel_id)

        try:
            session = self._create_session()
            streams = session.streams(live_url)
            return list(streams.keys())
        except Exception as e:
            logger.error(f"화질 목록 조회 실패: {e}")
            return []
