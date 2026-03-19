"""
Chzzk-Recorder-Pro: TwitCasting 엔진
TwitCasting API v2로 라이브 상태를 확인하고,
Streamlink twitcasting.tv 플러그인으로 스트림을 추출한다.
"""

from __future__ import annotations

import base64
from typing import Optional

import httpx
import streamlink

from app.core.config import get_settings
from app.core.logger import logger
from app.engine.base import LiveStatus

# ── TwitCasting API v2 ──────────────────────────────────────
TWITCASTING_API_BASE = "https://apiv2.twitcasting.tv"
TWITCASTING_LIVE_URL = "https://twitcasting.tv/{channel_id}"


class TwitcastingEngine:
    """TwitCasting 라이브 감지 + 스트림 추출 엔진.

    라이브 감지: TwitCasting API v2 `GET /users/{id}/current_live`
    스트림 추출: Streamlink twitcasting.tv 플러그인
    인증: Basic Auth (Client ID + Client Secret)
    """

    def _get_auth_header(self) -> dict[str, str]:
        """Basic Auth 헤더를 생성한다."""
        settings = get_settings()
        client_id = settings.twitcasting_client_id
        client_secret = settings.twitcasting_client_secret

        if not client_id or not client_secret:
            return {}

        credentials = f"{client_id}:{client_secret}"
        encoded = base64.b64encode(credentials.encode()).decode()
        return {"Authorization": f"Basic {encoded}"}

    async def check_live_status(self, channel_id: str) -> LiveStatus:
        """TwitCasting API v2로 채널의 라이브 상태를 확인한다.

        오프라인 시 404 응답이 반환되므로 예외 없이 처리한다.

        Args:
            channel_id: TwitCasting 사용자 ID (예: "someuser")

        Returns:
            LiveStatus 딕셔너리.
        """
        url = f"{TWITCASTING_API_BASE}/users/{channel_id}/current_live"
        headers = {
            "Accept": "application/json",
            **self._get_auth_header(),
        }

        async with httpx.AsyncClient() as client:
            try:
                resp = await client.get(url, headers=headers, timeout=10.0)
            except httpx.RequestError as e:
                logger.error(f"[TwitCasting:{channel_id}] API 요청 실패: {e}")
                return self._offline_status(channel_id)

        # 404 = 오프라인 (공식 동작)
        if resp.status_code == 404:
            return self._offline_status(channel_id)

        if resp.status_code != 200:
            logger.warning(f"[TwitCasting:{channel_id}] API 응답 {resp.status_code}")
            return self._offline_status(channel_id)

        try:
            data = resp.json()
        except Exception:
            return self._offline_status(channel_id)

        movie = data.get("movie") or {}
        broadcaster = data.get("broadcaster") or {}

        is_live = bool(movie.get("is_live", False))

        return LiveStatus(
            channel_id=channel_id,
            is_live=is_live,
            channel_name=broadcaster.get("screen_id") or broadcaster.get("name") or channel_id,
            title=movie.get("title", ""),
            category=movie.get("category") or "",
            viewer_count=movie.get("current_view_count", 0),
            thumbnail_url=movie.get("large_thumbnail", "") or "",
            profile_image_url=broadcaster.get("image") or "",
        )

    def get_stream(self, channel_id: str, quality: str = "best") -> streamlink.Stream:
        """Streamlink twitcasting.tv 플러그인으로 스트림 객체를 반환한다.

        Chzzk 쿠키는 주입하지 않는다 (별도 세션 사용).

        Args:
            channel_id: TwitCasting 사용자 ID
            quality: 화질 (best, worst 등)

        Returns:
            Streamlink Stream 객체.
        """
        live_url = TWITCASTING_LIVE_URL.format(channel_id=channel_id)
        session = streamlink.Streamlink()
        session.set_option("hls-live-edge", 3)
        session.set_option("hls-segment-attempts", 5)
        session.set_option("hls-segment-timeout", 15.0)

        streams = session.streams(live_url)
        if not streams:
            raise RuntimeError(f"TwitCasting 채널 '{channel_id}'이(가) 오프라인이거나 스트림을 찾을 수 없습니다.")

        if quality not in streams:
            quality = "best"

        return streams[quality]

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
        )
