"""
Chzzk-Recorder-Pro: Twitter Spaces 엔진
yt-dlp subprocess 폴링으로 스페이스 라이브 상태를 확인하고,
yt-dlp asyncio subprocess로 오디오(m4a)를 녹화한다.

참고:
- streamlink는 Twitter Spaces 미지원 → yt-dlp 사용
- 라이브 감지: yt-dlp --flat-playlist --dump-single-json https://x.com/{username}
              (Twitter API v2 Free 티어 제한으로 API 방식 대신 사용)
- 녹화: yt-dlp https://x.com/i/spaces/{space_id}
- 쿠키 파일: Netscape 형식 (권장 — 없으면 감지/녹화 모두 실패할 수 있음)
- channel_id: @핸들 제외한 username (예: KalserianT)
"""

from __future__ import annotations

import asyncio
import json
import shutil
from datetime import datetime
from pathlib import Path
from typing import Optional

# import httpx  # Twitter API v2 방식에서 사용 (현재 주석 처리)

from app.core.config import get_settings
from app.core.logger import logger
from app.engine.base import LiveStatus

# ── Twitter API v2 (Free 티어 제한으로 현재 미사용) ────────────
# TWITTER_API_BASE = "https://api.twitter.com/2"
TWITTER_SPACES_URL = "https://x.com/i/spaces/{space_id}"
TWITTER_USER_URL = "https://x.com/{username}"


class TwitterSpacesEngine:
    """Twitter Spaces 라이브 감지 + yt-dlp 오디오 녹화 엔진.

    라이브 감지: yt-dlp --flat-playlist로 유저 페이지 폴링 (API Free 티어 우회)
    녹화: yt-dlp subprocess (m4a 오디오)
    인증: 쿠키 파일 (Netscape 형식, 권장)
    """

    # ── [주석 처리] Twitter API v2 방식 ────────────────────────
    # Twitter API v2 Basic 티어($100/월) 이상에서 사용 가능.
    # Free 티어에서는 CreditsDepleted 오류 발생.
    #
    # def _get_auth_header(self) -> dict[str, str]:
    #     settings = get_settings()
    #     token = settings.twitter_bearer_token
    #     if not token:
    #         return {}
    #     return {"Authorization": f"Bearer {token}"}
    #
    # async def _check_live_via_api(self, channel_id: str) -> LiveStatus:
    #     """Twitter API v2로 사용자의 활성 Spaces를 확인한다.
    #     channel_id: 숫자 형식 numeric user_id 필요.
    #     """
    #     import httpx
    #     settings = get_settings()
    #     if not settings.twitter_bearer_token:
    #         logger.warning(f"[TwitterSpaces:{channel_id}] Bearer Token 미설정.")
    #         return self._offline_status(channel_id)
    #     url = f"{TWITTER_API_BASE}/spaces"
    #     params = {"user_ids": channel_id, "space.fields": "state,title,host_ids"}
    #     headers = {"Accept": "application/json", **self._get_auth_header()}
    #     async with httpx.AsyncClient() as client:
    #         try:
    #             resp = await client.get(url, params=params, headers=headers, timeout=10.0)
    #         except httpx.RequestError as e:
    #             logger.error(f"[TwitterSpaces:{channel_id}] API 요청 실패: {e}")
    #             return self._offline_status(channel_id)
    #     if resp.status_code != 200:
    #         logger.warning(f"[TwitterSpaces:{channel_id}] API 응답 {resp.status_code}: {resp.text[:200]}")
    #         return self._offline_status(channel_id)
    #     spaces = (resp.json().get("data") or [])
    #     live_space = next((s for s in spaces if s.get("state") == "live"), None)
    #     if live_space is None:
    #         return self._offline_status(channel_id)
    #     return LiveStatus(
    #         channel_id=channel_id, is_live=True, channel_name=channel_id,
    #         title=live_space.get("title", "Twitter Spaces"), category="Twitter Spaces",
    #         viewer_count=0, thumbnail_url="", profile_image_url="",
    #         space_id=live_space.get("id"),
    #     )
    # ── [주석 처리 끝] ──────────────────────────────────────────

    async def check_live_status(self, channel_id: str) -> LiveStatus:
        """yt-dlp 폴링으로 사용자의 활성 Spaces를 확인한다.

        Args:
            channel_id: Twitter username (예: "KalserianT"). @핸들 제외.

        Returns:
            LiveStatus 딕셔너리.
            is_live=True 시 space_id 필드에 녹화에 필요한 Space ID 포함.
        """
        ytdlp_path = self._resolve_ytdlp_path()
        settings = get_settings()
        profile_url = TWITTER_USER_URL.format(username=channel_id)

        cmd = [
            ytdlp_path,
            profile_url,
            "--flat-playlist",
            "--dump-single-json",
            "--no-warnings",
            "--quiet",
        ]
        if settings.twitter_cookie_file and Path(settings.twitter_cookie_file).is_file():
            cmd.extend(["--cookies", settings.twitter_cookie_file])

        try:
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=30.0)
        except asyncio.TimeoutError:
            logger.warning(f"[TwitterSpaces:{channel_id}] yt-dlp 폴링 타임아웃.")
            return self._offline_status(channel_id)
        except Exception as e:
            logger.error(f"[TwitterSpaces:{channel_id}] yt-dlp 실행 실패: {e}")
            return self._offline_status(channel_id)

        if proc.returncode != 0:
            err = stderr.decode(errors="replace").strip()
            logger.warning(f"[TwitterSpaces:{channel_id}] yt-dlp 오류 (rc={proc.returncode}): {err[:200]}")
            return self._offline_status(channel_id)

        try:
            data = json.loads(stdout.decode(errors="replace"))
        except Exception:
            return self._offline_status(channel_id)

        # entries 중 type==url 이고 url에 /i/spaces/ 가 포함된 항목이 라이브 Space
        entries = data.get("entries") or []
        live_entry = next(
            (e for e in entries if "/i/spaces/" in (e.get("url") or e.get("id") or "")),
            None,
        )
        if live_entry is None:
            return self._offline_status(channel_id)

        # space_id 추출: URL 마지막 세그먼트
        space_url = live_entry.get("url") or live_entry.get("id") or ""
        space_id = space_url.rstrip("/").split("/")[-1].split("?")[0]
        title = live_entry.get("title") or "Twitter Spaces"

        logger.info(f"[TwitterSpaces:{channel_id}] 라이브 Space 감지: {space_id} — {title}")

        return LiveStatus(
            channel_id=channel_id,
            is_live=True,
            channel_name=channel_id,
            title=title,
            category="Twitter Spaces",
            viewer_count=0,
            thumbnail_url="",
            profile_image_url="",
            space_id=space_id,
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
        """yt-dlp 실행 파일 경로를 찾는다.

        시스템 PATH → 현재 Python 인터프리터의 venv Scripts/bin 순으로 탐색.
        """
        import sys

        for name in ("yt-dlp", "yt-dlp.exe", "yt_dlp"):
            path = shutil.which(name)
            if path:
                return path

        # venv 내부 탐색 (pip install yt-dlp 했지만 PATH에 없는 경우)
        venv_bin = Path(sys.executable).parent
        for name in ("yt-dlp", "yt-dlp.exe", "yt_dlp"):
            candidate = venv_bin / name
            if candidate.is_file():
                return str(candidate)

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
