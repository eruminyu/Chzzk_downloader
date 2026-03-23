"""
Chzzk-Recorder-Pro: Twitter Spaces 엔진
비공식 GraphQL API + 쿠키 인증으로 Space 라이브 상태를 확인하고,
라이브 중일 때 dynamic_playlist.m3u8 URL을 캡처하여 반환한다.

다운로드는 종료 후 캡처된 m3u8 URL을 VodEngine(yt-dlp/ffmpeg)에 넘겨 처리한다.

인증 방식:
- Netscape 형식 쿠키 파일에서 auth_token, ct0 추출
- Twitter 내부 GraphQL API 호출 (비공식)

참고:
- AudioSpaceById QUERY_ID는 Twitter 배포마다 변경될 수 있음
- channel_id: @핸들 제외한 username (예: KalserianT)
"""

from __future__ import annotations

import json
import re
import shutil
from datetime import datetime
from http.cookiejar import MozillaCookieJar
from pathlib import Path
from typing import Optional

import httpx

from app.core.config import get_settings
from app.core.logger import logger
from app.engine.base import LiveStatus

# ── 상수 ────────────────────────────────────────────────────────────
TWITTER_SPACES_URL = "https://x.com/i/spaces/{space_id}"

# Twitter 웹 클라이언트에 하드코딩된 공개 Bearer 토큰
_BEARER_TOKEN = (
    "AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs"
    "%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA"
)

# GraphQL QUERY_ID — Twitter 배포마다 변경될 수 있음
# twspace-dl 및 yt-dlp 소스에서 최신값 확인 가능
_AUDIO_SPACE_BY_ID_QUERY_ID = "HPEisOmj1epUNLCWTYhUWw"
_USER_BY_SCREEN_NAME_QUERY_ID = "G3KGOASz96M-Qu0nwmGXNg"


class TwitterSpacesEngine:
    """Twitter Spaces 라이브 감지 + m3u8 URL 캡처 엔진.

    라이브 감지: 비공식 GraphQL AudioSpaceById API (쿠키 인증)
    감지 방식: username → user_id → 활성 Space 확인
    m3u8 캡처: live_video_stream/status/{media_key} 에서 URL 추출
    다운로드: 캡처한 URL을 VodEngine(yt-dlp)에 전달 (별도 처리)
    """

    async def check_live_status(self, channel_id: str) -> LiveStatus:
        """비공식 GraphQL API로 사용자의 활성 Space를 확인하고 m3u8 URL을 캡처한다.

        Args:
            channel_id: Twitter username (예: "KalserianT"). @핸들 제외.

        Returns:
            LiveStatus 딕셔너리.
            is_live=True 시 space_id와 m3u8_url 포함.
        """
        settings = get_settings()
        cookie_file = settings.twitter_cookie_file

        if not cookie_file or not Path(cookie_file).is_file():
            logger.warning(
                f"[TwitterSpaces:{channel_id}] 쿠키 파일이 설정되지 않았거나 없습니다: {cookie_file}"
            )
            return self._offline_status(channel_id)

        cookies = _parse_netscape_cookies(cookie_file)
        if not cookies.get("auth_token") or not cookies.get("ct0"):
            logger.warning(
                f"[TwitterSpaces:{channel_id}] 쿠키 파일에서 auth_token/ct0를 찾을 수 없습니다."
            )
            return self._offline_status(channel_id)

        headers = _build_headers(cookies["ct0"])

        try:
            async with httpx.AsyncClient(
                cookies=cookies,
                headers=headers,
                timeout=15.0,
                follow_redirects=True,
            ) as client:
                # 1단계: username → user_id
                user_id = await _get_user_id(client, channel_id)
                if user_id is None:
                    logger.debug(f"[TwitterSpaces:{channel_id}] user_id 조회 실패.")
                    return self._offline_status(channel_id)

                # 2단계: 활성 Space 조회
                space_info = await _get_active_space(client, user_id, channel_id)
                if space_info is None:
                    return self._offline_status(channel_id)

                space_id = space_info["space_id"]
                title = space_info["title"]
                media_key = space_info.get("media_key")

                # 3단계: m3u8 URL 캡처
                m3u8_url: Optional[str] = None
                if media_key:
                    m3u8_url = await _get_m3u8_url(client, media_key, channel_id)

                logger.info(
                    f"[TwitterSpaces:{channel_id}] 라이브 Space 감지: {space_id} — {title}"
                    + (f" (m3u8 캡처 완료)" if m3u8_url else " (m3u8 캡처 실패)")
                )

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
                    m3u8_url=m3u8_url,
                )

        except httpx.HTTPStatusError as e:
            if e.response.status_code == 401:
                logger.warning(
                    f"[TwitterSpaces:{channel_id}] 쿠키 인증 만료 (401). "
                    "쿠키 파일을 다시 추출해주세요."
                )
            else:
                logger.error(
                    f"[TwitterSpaces:{channel_id}] HTTP 오류 {e.response.status_code}: {e}"
                )
            return self._offline_status(channel_id)
        except httpx.RequestError as e:
            logger.error(f"[TwitterSpaces:{channel_id}] 네트워크 오류: {e}")
            return self._offline_status(channel_id)
        except Exception as e:
            logger.error(f"[TwitterSpaces:{channel_id}] 예상치 못한 오류: {e}", exc_info=e)
            return self._offline_status(channel_id)

    def get_stream(self, channel_id: str, quality: str = "best") -> object:
        """Twitter Spaces는 streamlink 미지원.

        대신 캡처된 m3u8 URL을 VodEngine으로 다운로드할 것.
        """
        raise NotImplementedError(
            "Twitter Spaces는 streamlink를 지원하지 않습니다. "
            "캡처된 m3u8_url을 VodEngine에 전달하세요."
        )

    async def start_ytdlp_recording(
        self,
        space_id: str,
        output_dir: str,
        channel_name: str,
        title: Optional[str] = None,
        cookie_file: Optional[str] = None,
    ) -> object:
        """yt-dlp subprocess로 Twitter Spaces를 다운로드한다.

        m3u8 URL 캡처에 실패했을 때의 fallback — space_id URL로 시도.
        """
        import asyncio

        ytdlp_path = self._resolve_ytdlp_path()
        space_url = TWITTER_SPACES_URL.format(space_id=space_id)

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
            "--no-progress",
            "--quiet",
        ]

        if cookie_file and Path(cookie_file).is_file():
            cmd.extend(["--cookies", cookie_file])
        elif cookie_file:
            logger.warning(f"[TwitterSpaces] 쿠키 파일을 찾을 수 없습니다: {cookie_file}")

        logger.info(f"[TwitterSpaces] yt-dlp 다운로드 시작: {output_path}")

        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        return process

    @staticmethod
    def _resolve_ytdlp_path() -> str:
        """yt-dlp 실행 파일 경로를 찾는다."""
        import sys

        for name in ("yt-dlp", "yt-dlp.exe", "yt_dlp"):
            path = shutil.which(name)
            if path:
                return path

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
            m3u8_url=None,
        )


# ── 내부 헬퍼 함수 ───────────────────────────────────────────────────

def _parse_netscape_cookies(cookie_file: str) -> dict[str, str]:
    """Netscape 형식 쿠키 파일에서 Twitter 인증에 필요한 쿠키를 추출한다.

    Returns:
        {"auth_token": "...", "ct0": "...", ...} 형태의 딕셔너리.
        필요한 키가 없으면 빈 딕셔너리.
    """
    result: dict[str, str] = {}
    target_keys = {"auth_token", "ct0"}

    try:
        with open(cookie_file, "r", encoding="utf-8", errors="replace") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                parts = line.split("\t")
                if len(parts) >= 7:
                    name = parts[5]
                    value = parts[6]
                    if name in target_keys:
                        result[name] = value
    except Exception as e:
        logger.error(f"쿠키 파일 파싱 실패: {cookie_file} — {e}")

    return result


def _build_headers(ct0: str) -> dict[str, str]:
    """Twitter 내부 API 호출에 필요한 헤더를 구성한다."""
    return {
        "Authorization": f"Bearer {_BEARER_TOKEN}",
        "x-csrf-token": ct0,
        "x-twitter-auth-type": "OAuth2Client",
        "x-twitter-client-language": "ko",
        "Content-Type": "application/json",
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/120.0.0.0 Safari/537.36"
        ),
    }


async def _get_user_id(client: httpx.AsyncClient, username: str) -> Optional[str]:
    """GraphQL UserByScreenName으로 user_id를 조회한다."""
    variables = json.dumps({
        "screen_name": username,
        "withSafetyModeUserFields": True,
    })
    features = json.dumps({
        "hidden_profile_likes_enabled": True,
        "hidden_profile_subscriptions_enabled": True,
        "responsive_web_graphql_exclude_directive_enabled": True,
        "verified_phone_label_enabled": False,
        "subscriptions_verification_info_is_identity_verified_enabled": True,
        "subscriptions_verification_info_verified_since_enabled": True,
        "highlights_tweets_tab_ui_enabled": True,
        "responsive_web_twitter_article_notes_tab_enabled": False,
        "creator_subscriptions_tweet_preview_api_enabled": True,
        "responsive_web_graphql_skip_user_profile_image_extensions_enabled": False,
        "responsive_web_graphql_timeline_navigation_enabled": True,
    })

    try:
        resp = await client.get(
            f"https://twitter.com/i/api/graphql/{_USER_BY_SCREEN_NAME_QUERY_ID}/UserByScreenName",
            params={"variables": variables, "features": features},
        )
        resp.raise_for_status()
        data = resp.json()
        user = data.get("data", {}).get("user", {}).get("result", {})
        return user.get("rest_id")
    except Exception as e:
        logger.debug(f"UserByScreenName 조회 실패 ({username}): {e}")
        return None


async def _get_active_space(
    client: httpx.AsyncClient,
    user_id: str,
    username: str,
) -> Optional[dict]:
    """AudioSpaceSearch 또는 UserTweets 타임라인에서 활성 Space를 탐색한다.

    Returns:
        {"space_id": ..., "title": ..., "media_key": ...} 또는 None.
    """
    # UserTweets 타임라인에서 Space 관련 트윗 탐색
    variables = json.dumps({
        "userId": user_id,
        "count": 20,
        "includePromotedContent": False,
        "withQuickPromoteEligibilityTweetFields": False,
        "withVoice": True,
        "withV2Timeline": True,
    })
    features = json.dumps({
        "rweb_lists_timeline_redesign_enabled": True,
        "responsive_web_graphql_exclude_directive_enabled": True,
        "verified_phone_label_enabled": False,
        "creator_subscriptions_tweet_preview_api_enabled": True,
        "responsive_web_graphql_timeline_navigation_enabled": True,
        "responsive_web_graphql_skip_user_profile_image_extensions_enabled": False,
        "tweetypie_unmention_optimization_enabled": True,
        "responsive_web_edit_tweet_api_enabled": True,
        "graphql_is_translatable_rweb_tweet_is_translatable_enabled": True,
        "view_counts_everywhere_api_enabled": True,
        "longform_notetweets_consumption_enabled": True,
        "responsive_web_twitter_article_tweet_consumption_enabled": False,
        "tweet_awards_web_tipping_enabled": False,
        "freedom_of_speech_not_reach_fetch_enabled": True,
        "standardized_nudges_misinfo": True,
        "tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled": True,
        "longform_notetweets_rich_text_read_enabled": True,
        "longform_notetweets_inline_media_enabled": True,
        "responsive_web_media_download_video_enabled": False,
        "responsive_web_enhance_cards_enabled": False,
    })

    # 여러 QUERY_ID 후보를 순서대로 시도 (Twitter 배포마다 변경되므로)
    query_ids = [
        "V7H0Ap3_Hh2FyS75OCDO3Q",  # UserTweets (최신 추정)
        "CdG2Vuc1v6F5JyEngGpxVw",  # UserTweets (구버전)
    ]

    for qid in query_ids:
        try:
            resp = await client.get(
                f"https://twitter.com/i/api/graphql/{qid}/UserTweets",
                params={"variables": variables, "features": features},
            )
            if resp.status_code == 400:
                continue
            resp.raise_for_status()
            data = resp.json()
            space_info = _extract_space_from_timeline(data)
            if space_info:
                return space_info
            # 응답은 왔지만 Space 없음 → 오프라인
            return None
        except httpx.HTTPStatusError:
            continue
        except Exception as e:
            logger.debug(f"UserTweets 조회 실패 (qid={qid}): {e}")
            continue

    # 타임라인 실패 시 AudioSpaceById로 직접 시도 (space_id를 모르면 불가, fallback 없음)
    logger.debug(f"[TwitterSpaces:{username}] 모든 타임라인 쿼리 실패.")
    return None


def _extract_space_from_timeline(data: dict) -> Optional[dict]:
    """UserTweets GraphQL 응답에서 활성 Space 정보를 추출한다."""
    try:
        instructions = (
            data.get("data", {})
            .get("user", {})
            .get("result", {})
            .get("timeline_v2", {})
            .get("timeline", {})
            .get("instructions", [])
        )
        for instruction in instructions:
            for entry in instruction.get("entries", []):
                content = entry.get("content", {})
                tweet_result = (
                    content.get("itemContent", {})
                    .get("tweet_results", {})
                    .get("result", {})
                )
                card = tweet_result.get("card", {})
                legacy = card.get("legacy", {})
                binding_values = legacy.get("binding_values", [])

                for bv in binding_values:
                    if bv.get("key") == "card_url":
                        url = bv.get("value", {}).get("scribe_value", {}).get("value", "")
                        if not url:
                            url = bv.get("value", {}).get("string_value", "")
                        if "/i/spaces/" in url:
                            space_id = url.rstrip("/").split("/i/spaces/")[1].split("?")[0].split("/")[0]
                            title = ""
                            for b in binding_values:
                                if b.get("key") == "title":
                                    title = b.get("value", {}).get("string_value", "")
                                    break
                            return {"space_id": space_id, "title": title or "Twitter Spaces", "media_key": None}
    except Exception:
        pass
    return None


async def get_space_by_id(
    client: httpx.AsyncClient,
    space_id: str,
) -> Optional[dict]:
    """AudioSpaceById로 특정 Space의 상태와 media_key를 조회한다."""
    variables = json.dumps({
        "id": space_id,
        "isMetatagsQuery": False,
        "withSuperFollowsUserFields": False,
        "withUserResults": True,
        "withBirdwatchPivots": False,
        "withReactionsMetadata": False,
        "withReactionsPerspective": False,
        "withSuperFollowsTweetFields": False,
        "withReplays": True,
        "withScheduledSpaces": False,
        "withDownvotePerspective": False,
    })

    try:
        resp = await client.get(
            f"https://twitter.com/i/api/graphql/{_AUDIO_SPACE_BY_ID_QUERY_ID}/AudioSpaceById",
            params={"variables": variables},
        )
        resp.raise_for_status()
        data = resp.json()
        metadata = data.get("data", {}).get("audioSpace", {}).get("metadata", {})
        state = metadata.get("state", "")  # "Running" or "Ended" or "NotStarted"
        media_key = metadata.get("media_key")
        title = metadata.get("title", "Twitter Spaces")
        return {"state": state, "media_key": media_key, "title": title}
    except Exception as e:
        logger.debug(f"AudioSpaceById 조회 실패 (space_id={space_id}): {e}")
        return None


async def _get_m3u8_url(
    client: httpx.AsyncClient,
    media_key: str,
    username: str,
) -> Optional[str]:
    """live_video_stream/status/{media_key}에서 m3u8 URL을 추출한다."""
    try:
        resp = await client.get(
            f"https://twitter.com/i/api/1.1/live_video_stream/status/{media_key}",
            params={"client": "web", "use_syndication_guest_id": "false", "cookie_set_token": "xx"},
        )
        resp.raise_for_status()
        data = resp.json()
        location = data.get("source", {}).get("location", "")
        if location and "m3u8" in location:
            return location
        logger.debug(f"[TwitterSpaces:{username}] m3u8 URL 없음. 응답: {str(data)[:200]}")
        return None
    except Exception as e:
        logger.debug(f"[TwitterSpaces:{username}] live_video_stream 조회 실패: {e}")
        return None


def _sanitize_filename(name: str) -> str:
    """파일명에 사용 불가한 문자를 제거한다."""
    invalid = r'\/:*?"<>|'
    for ch in invalid:
        name = name.replace(ch, "_")
    return name.strip()[:50]
