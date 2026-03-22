"""
Chzzk-Recorder-Pro: Discord Bot 서비스
User-Hosted Bot으로 원격에서 녹화 상태 확인 및 제어.

사용자가 DISCORD_BOT_TOKEN을 설정에 입력하면 자동 구동된다.
명령어: !status, !list, !start, !stop (프리픽스) + /status, /list, /start, /stop (슬래시)

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
    from discord import app_commands
    from discord.ext import commands

    HAS_DISCORD = True
except ImportError:
    HAS_DISCORD = False

_RECONNECT_DELAY = 30  # 재연결 대기 시간 (초)
_COLOR_MAP = {
    "green": "green",
    "red": "red",
    "blue": "blue",
    "yellow": "yellow",
}


def _make_embed(
    title: str,
    description: str = "",
    color: str = "green",
    fields: Optional[dict[str, str]] = None,
) -> discord.Embed:
    """공통 Embed 생성 헬퍼."""
    color_map = {
        "green": discord.Color.green(),
        "red": discord.Color.red(),
        "blue": discord.Color.blue(),
        "yellow": discord.Color.yellow(),
    }
    embed = discord.Embed(
        title=title,
        description=description or "",
        color=color_map.get(color, discord.Color.greyple()),
    )
    if fields:
        for key, value in fields.items():
            embed.add_field(name=key, value=value, inline=False)
    return embed


class DiscordBotService:
    """Discord Bot 서비스.

    치지직 녹화 상태를 외부에서 확인하고 제어한다.
    사용자가 직접 발급받은 BOT_TOKEN으로 구동한다.

    Commands (프리픽스 & 슬래시 동시 지원):
        status          — 현재 녹화 상태 + 시스템 리소스
        list            — 감시 중인 채널 목록
        start [channel_id] — 녹화 시작 + 자동 녹화 ON
        stop  [channel_id] — 녹화 중지 + 자동 녹화 OFF
    """

    def __init__(self, recorder_service: RecorderService) -> None:
        self._service = recorder_service
        self._bot: Optional[commands.Bot] = None
        self._task: Optional[asyncio.Task] = None
        self._stopping = False

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

        self._stopping = False
        self._token = token
        self._task = asyncio.create_task(self._run_with_reconnect(token))

    async def _build_bot(self) -> commands.Bot:
        """Bot 인스턴스를 생성하고 명령어를 등록한다."""
        intents = discord.Intents.default()
        intents.message_content = True
        bot = commands.Bot(command_prefix="!", intents=intents)
        self._bot = bot
        self._register_commands(bot)
        return bot

    async def _run_with_reconnect(self, token: str) -> None:
        """연결 끊김 시 자동 재연결하며 Bot을 실행한다."""
        while not self._stopping:
            try:
                bot = await self._build_bot()
                logger.info("🤖 Discord Bot 시작 중...")
                await bot.start(token)
            except discord.LoginFailure:
                logger.error("Discord Bot 로그인 실패: 토큰을 확인해주세요.")
                break
            except Exception as e:
                if self._stopping:
                    break
                logger.error(f"Discord Bot 연결 끊김: {e}. {_RECONNECT_DELAY}초 후 재연결...")
                await asyncio.sleep(_RECONNECT_DELAY)
            finally:
                if self._bot is not None and not self._bot.is_closed():
                    try:
                        await self._bot.close()
                    except Exception:
                        pass

    async def stop(self) -> None:
        """Discord Bot을 종료한다."""
        self._stopping = True

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
        channel_id_str = settings.discord_notification_channel_id

        if not channel_id_str or self._bot is None or not self._bot.is_ready():
            return

        try:
            channel_id = int(channel_id_str)
        except ValueError:
            logger.error(f"Discord 알림 채널 ID가 올바르지 않습니다: {channel_id_str!r}")
            return

        try:
            channel = self._bot.get_channel(channel_id)
            if channel is None:
                logger.warning(f"Discord 채널을 찾을 수 없습니다: {channel_id_str}")
                return

            embed = _make_embed(title=title, description=description, color=color, fields=fields)
            await channel.send(embed=embed)  # type: ignore[union-attr]
            logger.debug(f"Discord 알림 전송 완료: {title}")

        except Exception as e:
            logger.error(f"Discord 알림 전송 실패: {e}")

    def _register_commands(self, bot: commands.Bot) -> None:
        """Bot 명령어를 등록한다 (프리픽스 + 슬래시)."""

        # ── 공통 로직 헬퍼 ──────────────────────────────────

        def _get_status_embed() -> discord.Embed:
            channels = self._service.get_channels()
            recording_count = sum(
                1
                for ch in channels
                if ch.get("recording") and ch["recording"].get("state") == "recording"
            )
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
            return embed

        def _get_list_embed() -> tuple[discord.Embed | None, str | None]:
            """(embed, error_message) 반환. 채널 없으면 embed=None."""
            channels = self._service.get_channels()
            if not channels:
                return None, "📭 등록된 채널이 없습니다."

            lines: list[str] = []
            for ch in channels:
                live_status = "🔴 LIVE" if ch["is_live"] else "⚫ OFF"
                name = ch.get("channel_name") or ch["channel_id"]
                channel_id = ch["channel_id"]
                rec = ""
                if ch.get("recording"):
                    rec_state = ch["recording"].get("state", "")
                    if rec_state == "recording":
                        dur = ch["recording"].get("duration_seconds", 0)
                        rec = f" | 🎬 녹화 중 ({dur:.0f}s)"
                lines.append(f"{live_status} **{name}** `({channel_id})`{rec}")

            embed = discord.Embed(
                title="📋 채널 목록",
                description="\n".join(lines),
                color=discord.Color.blue(),
            )
            return embed, None

        def _find_channel(channel_id: str) -> dict | None:
            for ch in self._service.get_channels():
                if ch.get("channel_id") == channel_id:
                    return ch
            return None

        # ── 프리픽스 명령어 ──────────────────────────────────

        @bot.event
        async def on_ready() -> None:
            logger.info(f"🤖 Discord Bot 로그인: {bot.user}")
            try:
                synced = await bot.tree.sync()
                logger.info(f"🤖 슬래시 커맨드 동기화 완료: {len(synced)}개")
            except Exception as e:
                logger.error(f"슬래시 커맨드 동기화 실패: {e}")

        @bot.command(name="status")
        async def cmd_status(ctx: commands.Context) -> None:
            await ctx.send(embed=_get_status_embed())

        @bot.command(name="list")
        async def cmd_list(ctx: commands.Context) -> None:
            embed, err = _get_list_embed()
            if err:
                await ctx.send(err)
            else:
                await ctx.send(embed=embed)

        @bot.command(name="start")
        async def cmd_start(ctx: commands.Context, channel_id: str = "") -> None:
            """녹화 시작 + 자동 녹화 ON: !start <channel_id>."""
            if not channel_id:
                await ctx.send("❓ 사용법: `!start <channel_id>`")
                return

            ch = _find_channel(channel_id)
            if ch is None:
                await ctx.send(f"❌ 등록되지 않은 채널 ID입니다: `{channel_id}`")
                return

            display_name = ch.get("channel_name") or channel_id
            composite_key = ch["composite_key"]
            await self._service.start_channel(composite_key)
            await ctx.send(embed=_make_embed("🎬 녹화 시작", f"**{display_name}**\n자동 녹화 ON", "green"))

        @bot.command(name="stop")
        async def cmd_stop(ctx: commands.Context, channel_id: str = "") -> None:
            """녹화 중지 + 자동 녹화 OFF: !stop <channel_id>."""
            if not channel_id:
                await ctx.send("❓ 사용법: `!stop <channel_id>`")
                return

            ch = _find_channel(channel_id)
            if ch is None:
                await ctx.send(f"❌ 등록되지 않은 채널 ID입니다: `{channel_id}`")
                return

            display_name = ch.get("channel_name") or channel_id
            composite_key = ch["composite_key"]
            await self._service.stop_channel(composite_key)
            await ctx.send(embed=_make_embed("⏹ 녹화 중지", f"**{display_name}**\n자동 녹화 OFF", "blue"))

        # ── 슬래시 커맨드 ────────────────────────────────────

        @bot.tree.command(name="status", description="현재 녹화 상태와 시스템 리소스를 확인합니다")
        async def slash_status(interaction: discord.Interaction) -> None:
            await interaction.response.defer()
            await interaction.followup.send(embed=_get_status_embed())

        @bot.tree.command(name="list", description="감시 중인 채널 목록을 표시합니다")
        async def slash_list(interaction: discord.Interaction) -> None:
            embed, err = _get_list_embed()
            if err:
                await interaction.response.send_message(err)
            else:
                await interaction.response.send_message(embed=embed)

        @bot.tree.command(name="start", description="채널 녹화를 시작하고 자동 녹화를 ON으로 설정합니다")
        @app_commands.describe(channel_id="감시 중인 채널 ID (/list에서 확인)")
        async def slash_start(
            interaction: discord.Interaction,
            channel_id: str,
        ) -> None:
            ch = _find_channel(channel_id)
            if ch is None:
                await interaction.response.send_message(
                    f"❌ 등록되지 않은 채널 ID입니다: `{channel_id}`", ephemeral=True
                )
                return

            display_name = ch.get("channel_name") or channel_id
            composite_key = ch["composite_key"]

            await interaction.response.defer()
            await self._service.start_channel(composite_key)
            await interaction.followup.send(
                embed=_make_embed("🎬 녹화 시작", f"**{display_name}**\n자동 녹화 ON", "green")
            )

        @bot.tree.command(name="stop", description="채널 녹화를 중지하고 자동 녹화를 OFF로 설정합니다")
        @app_commands.describe(channel_id="감시 중인 채널 ID (/list에서 확인)")
        async def slash_stop(
            interaction: discord.Interaction,
            channel_id: str,
        ) -> None:
            ch = _find_channel(channel_id)
            if ch is None:
                await interaction.response.send_message(
                    f"❌ 등록되지 않은 채널 ID입니다: `{channel_id}`", ephemeral=True
                )
                return

            display_name = ch.get("channel_name") or channel_id
            composite_key = ch["composite_key"]

            await interaction.response.defer()
            await self._service.stop_channel(composite_key)
            await interaction.followup.send(
                embed=_make_embed("⏹ 녹화 중지", f"**{display_name}**\n자동 녹화 OFF", "blue")
            )
