"""
Chzzk-Recorder-Pro: 공통 유틸리티
중복 방지를 위한 공용 헬퍼 함수 모음.
"""

from __future__ import annotations

import re
from pathlib import Path

from app.core.logger import logger


def extract_channel_id(channel_id: str) -> str:
    """치지직 URL 또는 순수 채널 ID에서 채널 ID만 추출한다.

    지원 형식:
        - https://chzzk.naver.com/live/CHANNEL_ID
        - https://chzzk.naver.com/CHANNEL_ID
        - CHANNEL_ID (순수 ID)
    """
    channel_id = channel_id.strip()
    if "chzzk.naver.com/" in channel_id:
        channel_id = channel_id.rstrip("/").split("/")[-1].split("?")[0]
    return channel_id


def clean_filename(name: str, max_length: int = 150) -> str:
    """파일명에서 사용할 수 없는 특수문자를 제거한다.

    Args:
        name: 원본 파일명.
        max_length: 최대 길이 (기본 150자).

    Returns:
        정제된 파일명.
    """
    # Windows 파일명 금지 문자: \ / : * ? " < > |
    cleaned = re.sub(r'[\\/:*?"<>|]', "_", name)
    cleaned = cleaned.strip()
    return cleaned[:max_length]


def update_env_file(updates: dict[str, str]) -> None:
    """updates 딕셔너리의 키-값을 .env 파일에 반영한다.

    기존 키는 덮어쓰고, 없는 키는 끝에 추가한다.
    """
    env_path = Path(".env")
    if not env_path.exists():
        env_path = Path("backend/.env")
        if not env_path.exists():
            return

    try:
        lines = env_path.read_text(encoding="utf-8").splitlines()
        remaining = dict(updates)
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
    except Exception as e:
        logger.error(f".env 파일 업데이트 실패: {e}")
