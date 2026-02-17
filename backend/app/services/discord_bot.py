"""
Chzzk-Recorder-Pro: Discord Bot 서비스
User-Hosted Bot으로 원격에서 녹화 상태 확인 및 제어.

사용자가 DISCORD_BOT_TOKEN을 설정에 입력하면 자동 구동된다.
Phase 2 기준 기본 명령어: !status, !list, !record

NOTE: discord.py 라이브러리가 필요합니다.
      requirements.txt에 discord.py 추가 필요.
"""

from __future__ import annotations

import asyncio
import platform
from typing import TYPE_CHECKING, Optional

from app.core.config import get_settings
from app.core.logger import logger

if TYPE_CHECKING:
    from app.services.recorder import RecorderService

# discord.py가 설치되어 있는지 확인
try:
    import discord
    from discord.ext import commands

    HAS_DISCORD = True
except ImportError:
    HAS_DISCORD = False


class DiscordBotService:
    """Discord Bot 서비스.

    치지직 녹화 상태를 외부에서 확인하고 제어한다.
    사용자가 직접 발급받은 BOT_TOKEN으로 구동한다.

    Commands:
        !status  — 현재 녹화 상태 + 시스템 리소스
        !list    — 감시 중인 채널 목록
        !record on/off [channel_id] — 녹화 제어
    """

    def __init__(self, recorder_service: RecorderService) -> None:
        self._service = recorder_service
        self._bot: Optional[commands.Bot] = None
        self._task: Optional[asyncio.Task] = None

    async def start(self) -> None:
        """Discord Bot을 시작한다."""
        if not HAS_DISCORD:
            logger.warning(
                "discord.py가 설치되지 않았습니다. "
                "Discord Bot 기능을 사용하려면 'pip install discord.py'를 실행하세요."
            )
            return

        settings = get_settings()
        token = settings.discord_bot_token

        if not token:
            logger.info("Discord Bot 토큰이 설정되지 않았습니다. Bot을 건너뜁니다.")
            return

        intents = discord.Intents.default()
        intents.message_content = True

        self._bot = commands.Bot(command_prefix="!", intents=intents)
        self._register_commands()

        logger.info("🤖 Discord Bot 시작 중...")
        self._task = asyncio.create_task(self._run_bot(token))

    async def _run_bot(self, token: str) -> None:
        """Bot을 비동기로 실행한다."""
        try:
            await self._bot.start(token)  # type: ignore[union-attr]
        except Exception as e:
            logger.error(f"Discord Bot 오류: {e}")

    async def stop(self) -> None:
        """Discord Bot을 종료한다."""
        bot = self._bot
        if bot is not None and not bot.is_closed():
            await bot.close()
            logger.info("🤖 Discord Bot 종료.")

        task = self._task
        if task is not None and not task.done():
            task.cancel()

    async def send_notification(
        self,
        title: str,
        description: str,
        color: str = "green",
        fields: Optional[dict[str, str]] = None,
    ) -> None:
        """Discord 채널에 Embed 알림을 전송한다.

        Args:
            title: Embed 제목
            description: Embed 내용
            color: Embed 색상 ("green", "red", "blue", "yellow")
            fields: 추가 필드 (key-value 형식)
        """
        if not HAS_DISCORD:
            return

        settings = get_settings()
        channel_id = settings.discord_notification_channel_id

        if not channel_id or self._bot is None or not self._bot.is_ready():
            return

        try:
            channel = self._bot.get_channel(int(channel_id))
            if channel is None:
                logger.warning(f"Discord 채널을 찾을 수 없습니다: {channel_id}")
                return

            # 색상 매핑
            color_map = {
                "green": discord.Color.green(),
                "red": discord.Color.red(),
                "blue": discord.Color.blue(),
                "yellow": discord.Color.yellow(),
            }
            embed_color = color_map.get(color, discord.Color.greyple())

            embed = discord.Embed(
                title=title,
                description=description,
                color=embed_color,
            )

            if fields:
                for key, value in fields.items():
                    embed.add_field(name=key, value=value, inline=False)

            await channel.send(embed=embed)  # type: ignore[union-attr]
            logger.debug(f"Discord 알림 전송 완료: {title}")

        except Exception as e:
            logger.error(f"Discord 알림 전송 실패: {e}")

    def _register_commands(self) -> None:
        """Bot 명령어를 등록한다."""
        if self._bot is None:
            return

        bot: commands.Bot = self._bot
        assert bot is not None  # type narrowing for Pyre2

        @bot.event
        async def on_ready() -> None:
            logger.info(f"🤖 Discord Bot 로그인: {bot.user}")

        @bot.command(name="status")
        async def cmd_status(ctx: commands.Context) -> None:
            """현재 녹화 상태 + 시스템 리소스."""
            channels = self._service.get_channels()
            recording_count = sum(
                1
                for ch in channels
                if ch.get("recording") and ch["recording"].get("state") == "recording"
            )

            # 시스템 리소스
            try:
                import psutil

                cpu = psutil.cpu_percent()
                mem = psutil.virtual_memory().percent
                disk = psutil.disk_usage("/").percent
                sys_info = f"CPU: {cpu}% | RAM: {mem}% | Disk: {disk}%"
            except ImportError:
                sys_info = f"OS: {platform.system()} {platform.release()}"

            embed = discord.Embed(
                title="📊 Chzzk-Recorder-Pro 상태",
                color=discord.Color.green() if recording_count > 0 else discord.Color.grey(),
            )
            embed.add_field(name="감시 채널", value=str(len(channels)), inline=True)
            embed.add_field(name="녹화 중", value=str(recording_count), inline=True)
            embed.add_field(name="시스템", value=sys_info, inline=False)

            await ctx.send(embed=embed)

        @bot.command(name="list")
        async def cmd_list(ctx: commands.Context) -> None:
            """감시 중인 채널 목록."""
            channels = self._service.get_channels()

            if not channels:
                await ctx.send("📭 등록된 채널이 없습니다.")
                return

            lines: list[str] = []
            for ch in channels:
                status = "🔴 LIVE" if ch["is_live"] else "⚫ OFF"
                rec = ""
                if ch.get("recording"):
                    rec_state = ch["recording"].get("state", "")
                    if rec_state == "recording":
                        dur = ch["recording"].get("duration_seconds", 0)
                        rec = f" | 🎬 녹화 중 ({dur:.0f}s)"
                line = f"{status} `{ch['channel_id']}` {rec}"
                lines.append(line)

            embed = discord.Embed(
                title="📋 채널 목록",
                description="\n".join(lines),
                color=discord.Color.blue(),
            )
            await ctx.send(embed=embed)

        @bot.command(name="record")
        async def cmd_record(ctx: commands.Context, action: str = "", channel_id: str = ""):
            """녹화 제어: !record on/off [channel_id]."""
            if not action or not channel_id:
                await ctx.send("❓ 사용법: `!record on <channel_id>` 또는 `!record off <channel_id>`")
                return

            if action.lower() == "on":
                result = await self._service.start_recording(channel_id)
                await ctx.send(f"🎬 녹화 시작: `{channel_id}`\n```json\n{result}\n```")
            elif action.lower() == "off":
                result = await self._service.stop_recording(channel_id)
                await ctx.send(f"⏹ 녹화 중지: `{channel_id}`\n```json\n{result}\n```")
            else:
                await ctx.send("❓ `on` 또는 `off`를 지정해주세요.")
