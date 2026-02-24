import { useState, useEffect, useCallback } from "react";
import {
    Settings as SettingsIcon,
    Shield,
    Save,
    Key,
    Download,
    RefreshCcw,
    Film,
    Gauge,
    Timer,
    Loader2,
    MessageSquare,
    MessageCircle,
    FolderOpen,
    Folder,
    HardDrive,
    ArrowLeft,
    ChevronRight,
    X,
} from "lucide-react";
import { api, Settings as SettingsType, BrowseDirsResponse, DirEntry } from "../api/client";
import { useToast } from "../components/ui/Toast";
import { getErrorMessage } from "../utils/error";
import { DirInput } from "../components/ui/DirInput";

// ── ToggleSwitch ─────────────────────────────────────────


// ── ToggleSwitch ─────────────────────────────────────────

interface ToggleSwitchProps {
    checked: boolean;
    onChange: (v: boolean) => void;
    activeColor?: string;
    focusRingColor?: string;
}

function ToggleSwitch({
    checked,
    onChange,
    activeColor = "bg-green-600",
    focusRingColor = "focus:ring-green-500",
}: ToggleSwitchProps) {
    return (
        <button
            type="button"
            onClick={() => onChange(!checked)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                        focus:outline-none focus:ring-2 ${focusRingColor}
                        focus:ring-offset-2 focus:ring-offset-zinc-900
                        ${checked ? activeColor : "bg-zinc-700"}`}
        >
            <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white
                            transition-transform ${checked ? "translate-x-6" : "translate-x-1"}`}
            />
        </button>
    );
}

// ── Settings 메인 컴포넌트 ────────────────────────────────

export default function Settings() {
    const [settings, setSettings] = useState<SettingsType | null>(null);
    const toast = useToast();

    // ── Auth state ──
    const [nidAut, setNidAut] = useState("");
    const [nidSes, setNidSes] = useState("");

    // ── Download state ──
    const [keepParts, setKeepParts] = useState(false);
    const [maxRetries, setMaxRetries] = useState(3);
    const [dlSaving, setDlSaving] = useState(false);

    // ── General state ──
    const [downloadDir, setDownloadDir] = useState("");
    const [monitorInterval, setMonitorInterval] = useState(30);
    const [outputFormat, setOutputFormat] = useState("ts");
    const [recordingQuality, setRecordingQuality] = useState("best");
    const [splitDownloadDirs, setSplitDownloadDirs] = useState(false);
    const [vodChzzkDir, setVodChzzkDir] = useState("");
    const [vodExternalDir, setVodExternalDir] = useState("");
    const [genSaving, setGenSaving] = useState(false);

    // ── VOD settings state ──
    const [vodMaxConcurrent, setVodMaxConcurrent] = useState(3);
    const [vodDefaultQuality, setVodDefaultQuality] = useState("best");
    const [vodMaxSpeed, setVodMaxSpeed] = useState(0);
    const [vodSaving, setVodSaving] = useState(false);

    // ── Chat settings state ──
    const [chatArchiveEnabled, setChatArchiveEnabled] = useState(false);
    const [chatSaving, setChatSaving] = useState(false);

    // Discord Settings
    const [discordBotToken, setDiscordBotToken] = useState("");
    const [discordChannelId, setDiscordChannelId] = useState("");
    const [discordSaving, setDiscordSaving] = useState(false);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const data = await api.getSettings();
            setSettings(data);
            setKeepParts(data.keep_download_parts);
            setMaxRetries(data.max_record_retries);
            setDownloadDir(data.download_dir);
            setMonitorInterval(data.monitor_interval);
            setOutputFormat(data.output_format || "ts");
            setRecordingQuality(data.recording_quality || "best");
            setVodMaxConcurrent(data.vod_max_concurrent);
            setVodDefaultQuality(data.vod_default_quality);
            setVodMaxSpeed(data.vod_max_speed);
            setChatArchiveEnabled(data.chat_archive_enabled);
            setDiscordChannelId(data.discord_notification_channel_id || "");
            setSplitDownloadDirs(data.split_download_dirs ?? false);
            setVodChzzkDir(data.vod_chzzk_dir ?? "");
            setVodExternalDir(data.vod_external_dir ?? "");
        } catch {
            toast.error("설정을 불러오는 데 실패했습니다.");
        }
    };

    // ── Auth handlers ──
    const handleUpdateCookies = async () => {
        try {
            await api.updateCookies(nidAut, nidSes);
            toast.success("쿠키가 저장되었습니다!");
            loadSettings();
            setNidAut("");
            setNidSes("");
        } catch {
            toast.error("쿠키 저장에 실패했습니다.");
        }
    };

    const handleTestCookies = async () => {
        try {
            const res = await api.testCookies();
            if (res.valid) {
                toast.success(`인증 성공! 닉네임: ${res.user_status?.nickname || "User"}`);
            } else {
                toast.error("쿠키가 유효하지 않습니다.");
            }
        } catch (e: unknown) {
            toast.error(getErrorMessage(e, "검증에 실패했습니다."));
        }
    };

    // ── Download settings save ──
    const handleSaveDownloadSettings = async () => {
        setDlSaving(true);
        try {
            await api.updateDownloadSettings(keepParts, maxRetries);
            toast.success("다운로드 설정이 저장되었습니다.");
            loadSettings();
        } catch {
            toast.error("다운로드 설정 저장에 실패했습니다.");
        } finally {
            setDlSaving(false);
        }
    };

    // ── General settings save ──
    const handleSaveGeneralSettings = async () => {
        setGenSaving(true);
        try {
            await api.updateGeneralSettings({
                download_dir: downloadDir,
                monitor_interval: monitorInterval,
                output_format: outputFormat,
                recording_quality: recordingQuality,
                split_download_dirs: splitDownloadDirs,
                vod_chzzk_dir: vodChzzkDir,
                vod_external_dir: vodExternalDir,
            });
            toast.success("일반 설정이 저장되었습니다.");
            loadSettings();
        } catch (e: unknown) {
            toast.error(getErrorMessage(e, "일반 설정 저장에 실패했습니다."));
        } finally {
            setGenSaving(false);
        }
    };

    // ── VOD settings save ──
    const handleSaveVodSettings = async () => {
        setVodSaving(true);
        try {
            await api.updateVodSettings({
                vod_max_concurrent: vodMaxConcurrent,
                vod_default_quality: vodDefaultQuality,
                vod_max_speed: vodMaxSpeed,
            });
            toast.success("VOD 설정이 저장되었습니다.");
            loadSettings();
        } catch (e: unknown) {
            toast.error(getErrorMessage(e, "VOD 설정 저장에 실패했습니다."));
        } finally {
            setVodSaving(false);
        }
    };

    // ── Chat settings save ──
    const handleSaveChatSettings = async () => {
        setChatSaving(true);
        try {
            await api.updateChatSettings({
                chat_archive_enabled: chatArchiveEnabled,
            });
            toast.success("채팅 설정이 저장되었습니다.");
            loadSettings();
        } catch (e: unknown) {
            toast.error(getErrorMessage(e, "채팅 설정 저장에 실패했습니다."));
        } finally {
            setChatSaving(false);
        }
    };

    // ── Discord settings save ──
    const handleSaveDiscordSettings = async () => {
        setDiscordSaving(true);
        try {
            await api.updateDiscordSettings({
                discord_bot_token: discordBotToken || undefined,
                discord_notification_channel_id: discordChannelId || undefined,
            });
            toast.success("Discord 설정이 저장되었습니다. 재시작 후 적용됩니다.");
            loadSettings();
            setDiscordBotToken("");
        } catch (e: unknown) {
            toast.error(getErrorMessage(e, "Discord 설정 저장에 실패했습니다."));
        } finally {
            setDiscordSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <SettingsIcon className="w-6 h-6 text-green-500" />
                    Settings
                </h2>
                <p className="text-zinc-400">애플리케이션 설정을 관리합니다.</p>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                {/* ════════════════════════════════════════════
                    LEFT COLUMN
                   ════════════════════════════════════════════ */}
                <div className="space-y-6">
                    {/* ── General Settings Card ── */}
                    <div className="bg-zinc-900/50 p-6 rounded-xl border border-zinc-800 space-y-5">
                        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                            <SettingsIcon className="w-5 h-5 text-green-500" />
                            일반 설정
                        </h3>

                        {/* 기본 저장 경로 */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                                <FolderOpen className="w-4 h-4" />
                                저장 경로
                            </label>
                            <DirInput
                                value={downloadDir}
                                onChange={setDownloadDir}
                                placeholder="예: E:\recordings"
                            />
                            <p className="text-xs text-zinc-500">
                                라이브 녹화 + 채팅 로그가 저장되는 기본 경로입니다.
                            </p>
                        </div>

                        {/* 분할 저장 경로 토글 */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-zinc-300">
                                    분할 저장 경로 사용
                                </label>
                                <ToggleSwitch
                                    checked={splitDownloadDirs}
                                    onChange={setSplitDownloadDirs}
                                />
                            </div>
                            <p className="text-xs text-zinc-500">
                                활성화 시 콘텐츠 종류별로 저장 경로를 분리할 수 있습니다.
                            </p>

                            {/* 펼침 영역 */}
                            {splitDownloadDirs && (
                                <div className="space-y-4 pl-4 border-l-2 border-zinc-700 pt-1">
                                    {/* 치지직 VOD/클립 */}
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
                                            <Folder className="w-3.5 h-3.5" />
                                            치지직 VOD / 클립 저장 경로
                                        </label>
                                        <DirInput
                                            value={vodChzzkDir}
                                            onChange={setVodChzzkDir}
                                            placeholder="비어있으면 기본 저장 경로 사용"
                                        />
                                        <p className="text-xs text-zinc-600">
                                            chzzk.naver.com URL 다운로드에 적용됩니다.
                                        </p>
                                    </div>

                                    {/* 외부 다운로드 */}
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
                                            <Folder className="w-3.5 h-3.5" />
                                            외부 다운로드 저장 경로 (유튜브 등)
                                        </label>
                                        <DirInput
                                            value={vodExternalDir}
                                            onChange={setVodExternalDir}
                                            placeholder="비어있으면 기본 저장 경로 사용"
                                        />
                                        <p className="text-xs text-zinc-600">
                                            유튜브 등 외부 URL(yt-dlp) 다운로드에 적용됩니다.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Monitor Interval */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                                <Timer className="w-4 h-4" />
                                감시 주기 (초)
                            </label>
                            <input
                                type="number"
                                min={5}
                                max={300}
                                value={monitorInterval}
                                onChange={(e) =>
                                    setMonitorInterval(parseInt(e.target.value) || 30)
                                }
                                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-green-500"
                            />
                            <p className="text-xs text-zinc-500">
                                채널 라이브 상태를 확인하는 간격 (5~300초).
                            </p>
                        </div>

                        {/* Output Format */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                                <Film className="w-4 h-4" />
                                녹화 포맷
                            </label>
                            <Select
                                value={outputFormat}
                                onChange={setOutputFormat}
                                options={[
                                    { value: "ts", label: "TS (MPEG Transport Stream)" },
                                    { value: "mp4", label: "MP4 (권장 — 범용)" },
                                    { value: "mkv", label: "MKV (Matroska)" },
                                ]}
                            />
                            <p className="text-xs text-zinc-500">
                                TS는 중단 시에도 파일이 유지되며, MP4/MKV는 호환성이 좋습니다.
                            </p>
                        </div>

                        {/* Recording Quality */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                                <Gauge className="w-4 h-4" />
                                녹화 품질
                            </label>
                            <Select
                                value={recordingQuality}
                                onChange={setRecordingQuality}
                                options={[
                                    { value: "best", label: "최고 (Best)" },
                                    { value: "1080p", label: "1080p" },
                                    { value: "720p", label: "720p" },
                                    { value: "480p", label: "480p" },
                                ]}
                            />
                            <p className="text-xs text-zinc-500">
                                Streamlink이 지원하는 화질 중 선택됩니다.
                            </p>
                        </div>

                        {/* Save Button */}
                        <button
                            onClick={handleSaveGeneralSettings}
                            disabled={genSaving}
                            className="w-full bg-green-600 hover:bg-green-500 disabled:bg-zinc-700 text-white py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                        >
                            {genSaving ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Save className="w-4 h-4" />
                            )}
                            {genSaving ? "저장 중..." : "일반 설정 저장"}
                        </button>
                    </div>

                    {/* ── VOD Download Settings Card ── */}
                    <div className="bg-zinc-900/50 p-6 rounded-xl border border-zinc-800 space-y-5">
                        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                            <Film className="w-5 h-5 text-purple-500" />
                            VOD 다운로드 설정
                        </h3>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                                    <Download className="w-4 h-4" />
                                    동시 다운로드 개수
                                </label>
                                <input
                                    type="number"
                                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                                    value={vodMaxConcurrent}
                                    onChange={(e) => setVodMaxConcurrent(Number(e.target.value))}
                                    min={1}
                                    max={10}
                                />
                                <p className="text-xs text-zinc-500">
                                    한 번에 다운로드할 수 있는 최대 영상 개수 (1-10개)
                                </p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                                    <Gauge className="w-4 h-4" />
                                    기본 화질
                                </label>
                                <Select
                                    value={vodDefaultQuality}
                                    onChange={setVodDefaultQuality}
                                    options={[
                                        { value: "best", label: "최고 화질 (Best)" },
                                        { value: "1080p", label: "1080p" },
                                        { value: "720p", label: "720p" },
                                        { value: "480p", label: "480p" },
                                    ]}
                                />
                                <p className="text-xs text-zinc-500">
                                    VOD 다운로드 시 기본으로 사용할 화질
                                </p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                                    <Gauge className="w-4 h-4" />
                                    최대 다운로드 속도 (MB/s)
                                </label>
                                <input
                                    type="number"
                                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                                    value={vodMaxSpeed}
                                    onChange={(e) => setVodMaxSpeed(Number(e.target.value))}
                                    min={0}
                                    max={1000}
                                />
                                <p className="text-xs text-zinc-500">
                                    0 = 무제한, 네트워크 대역폭 제한 시 사용
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={handleSaveVodSettings}
                            disabled={vodSaving}
                            className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 px-4 rounded-lg transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {vodSaving ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Save className="w-4 h-4" />
                            )}
                            {vodSaving ? "저장 중..." : "VOD 설정 저장"}
                        </button>
                    </div>
                </div>

                {/* ════════════════════════════════════════════
                    RIGHT COLUMN
                   ════════════════════════════════════════════ */}
                <div className="space-y-6">
                    {/* ── Authentication Card ── */}
                    <div className="bg-zinc-900/50 p-6 rounded-xl border border-zinc-800 space-y-5">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                <Key className="w-5 h-5 text-yellow-500" />
                                인증 (Authentication)
                            </h3>
                            <span
                                className={`px-2 py-1 rounded text-xs font-bold ${settings?.authenticated
                                    ? "bg-green-500/20 text-green-400"
                                    : "bg-red-500/20 text-red-400"
                                    }`}
                            >
                                {settings?.authenticated ? "AUTHENTICATED" : "GUEST MODE"}
                            </span>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-300">
                                    NID_AUT
                                </label>
                                <input
                                    type="password"
                                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-green-500"
                                    value={nidAut}
                                    onChange={(e) => setNidAut(e.target.value)}
                                    placeholder="NID_AUT 쿠키 값 입력..."
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-300">
                                    NID_SES
                                </label>
                                <input
                                    type="password"
                                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-green-500"
                                    value={nidSes}
                                    onChange={(e) => setNidSes(e.target.value)}
                                    placeholder="NID_SES 쿠키 값 입력..."
                                />
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={handleUpdateCookies}
                                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                            >
                                <Save className="w-4 h-4" /> 저장
                            </button>
                            <button
                                onClick={handleTestCookies}
                                className="flex-1 bg-green-600 hover:bg-green-500 text-white py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                            >
                                <Shield className="w-4 h-4" /> 검증
                            </button>
                        </div>
                    </div>

                    {/* ── Download Settings Card ── */}
                    <div className="bg-zinc-900/50 p-6 rounded-xl border border-zinc-800 space-y-5">
                        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                            <Download className="w-5 h-5 text-blue-500" />
                            다운로드 설정
                        </h3>

                        {/* Keep Parts Toggle */}
                        <div>
                            <label className="block text-sm font-medium text-zinc-300 mb-2">
                                미완료 파일 보관 (.part)
                            </label>
                            <div className="flex items-center gap-3">
                                <ToggleSwitch
                                    checked={keepParts}
                                    onChange={setKeepParts}
                                    activeColor="bg-green-600"
                                    focusRingColor="focus:ring-green-500"
                                />
                                <span className="text-sm text-zinc-500">
                                    {keepParts ? "취소/오류 시 보관" : "취소 시 삭제"}
                                </span>
                            </div>
                        </div>

                        {/* Max Retries */}
                        <div>
                            <label className="block text-sm font-medium text-zinc-300 mb-2 flex items-center gap-2">
                                <RefreshCcw className="w-4 h-4" />
                                자동 재시도 횟수
                            </label>
                            <input
                                type="number"
                                min={0}
                                max={100}
                                value={maxRetries}
                                onChange={(e) =>
                                    setMaxRetries(parseInt(e.target.value) || 0)
                                }
                                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-green-500"
                            />
                            <p className="text-xs text-zinc-500 mt-1">
                                라이브 녹화 중단 시 자동 재시도 횟수.
                            </p>
                        </div>

                        {/* Save Button */}
                        <button
                            onClick={handleSaveDownloadSettings}
                            disabled={dlSaving}
                            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 text-white py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                        >
                            {dlSaving ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Save className="w-4 h-4" />
                            )}
                            {dlSaving ? "저장 중..." : "다운로드 설정 저장"}
                        </button>
                    </div>

                    {/* ── Chat Settings Card ── */}
                    <div className="bg-zinc-900/50 p-6 rounded-xl border border-zinc-800 space-y-5">
                        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                            <MessageSquare className="w-5 h-5 text-cyan-500" />
                            채팅 아카이빙
                        </h3>

                        <div>
                            <label className="block text-sm font-medium text-zinc-300 mb-2">
                                실시간 채팅 저장
                            </label>
                            <div className="flex items-center gap-3">
                                <ToggleSwitch
                                    checked={chatArchiveEnabled}
                                    onChange={setChatArchiveEnabled}
                                    activeColor="bg-cyan-600"
                                    focusRingColor="focus:ring-cyan-500"
                                />
                                <span className="text-sm text-zinc-500">
                                    {chatArchiveEnabled
                                        ? "녹화 시 채팅 자동 저장"
                                        : "채팅 저장 안 함"}
                                </span>
                            </div>
                            <p className="text-xs text-zinc-500 mt-2">
                                활성화 시 녹화와 함께 채팅 메시지를 JSONL 파일로 저장합니다.
                            </p>
                        </div>

                        <button
                            onClick={handleSaveChatSettings}
                            disabled={chatSaving}
                            className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-zinc-700 text-white py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                        >
                            {chatSaving ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Save className="w-4 h-4" />
                            )}
                            {chatSaving ? "저장 중..." : "채팅 설정 저장"}
                        </button>
                    </div>

                    {/* ── Discord Settings Card ── */}
                    <div className="bg-zinc-900/50 p-6 rounded-xl border border-zinc-800 space-y-5">
                        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                            <MessageCircle className="w-5 h-5 text-purple-500" />
                            Discord Bot 알림
                        </h3>

                        <div>
                            <label className="block text-sm font-medium text-zinc-300 mb-2">
                                Bot 토큰
                            </label>
                            <input
                                type="password"
                                value={discordBotToken}
                                onChange={(e) => setDiscordBotToken(e.target.value)}
                                placeholder="Bot 토큰을 입력하세요 (변경 시에만)"
                                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                            />
                            <p className="text-xs text-zinc-500 mt-2">
                                비어있으면 기존 설정 유지. Discord Developer Portal에서 발급받은 Bot 토큰을 입력하세요.
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-zinc-300 mb-2">
                                알림 채널 ID
                            </label>
                            <input
                                type="text"
                                value={discordChannelId}
                                onChange={(e) => setDiscordChannelId(e.target.value)}
                                placeholder="Discord 채널 ID를 입력하세요"
                                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                            />
                            <p className="text-xs text-zinc-500 mt-2">
                                개발자 모드 활성화 후 채널 우클릭 → ID 복사로 확인 가능합니다.
                            </p>
                        </div>

                        <div className="flex items-center gap-2 text-sm">
                            <div
                                className={`w-2 h-2 rounded-full ${settings?.discord_bot_configured ? "bg-green-500" : "bg-zinc-600"}`}
                            />
                            <span className="text-zinc-400">
                                {settings?.discord_bot_configured
                                    ? "Bot 설정됨 (재시작 후 활성화)"
                                    : "Bot 미설정"}
                            </span>
                        </div>

                        <button
                            onClick={handleSaveDiscordSettings}
                            disabled={discordSaving}
                            className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-zinc-700 text-white py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                        >
                            {discordSaving ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Save className="w-4 h-4" />
                            )}
                            {discordSaving ? "저장 중..." : "Discord 설정 저장"}
                        </button>
                    </div>

                    {/* ── System Info Card ── */}
                    <div className="bg-zinc-900/50 p-6 rounded-xl border border-zinc-800">
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <SettingsIcon className="w-5 h-5 text-zinc-500" />
                            시스템 정보
                        </h3>
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between py-2 border-b border-zinc-800">
                                <span className="text-zinc-500">앱 이름</span>
                                <span className="text-zinc-200">
                                    {settings?.app_name || "Loading..."}
                                </span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-zinc-800">
                                <span className="text-zinc-500">FFmpeg 경로</span>
                                <span
                                    className="text-zinc-200 truncate max-w-[220px]"
                                    title={settings?.ffmpeg_path}
                                >
                                    {settings?.ffmpeg_path || "Loading..."}
                                </span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-zinc-800">
                                <span className="text-zinc-500">서버</span>
                                <span className="text-zinc-200">
                                    {settings
                                        ? `${settings.host}:${settings.port}`
                                        : "Loading..."}
                                </span>
                            </div>
                            <div className="flex justify-between py-2">
                                <span className="text-zinc-500">Discord Bot</span>
                                <span
                                    className={`${settings?.discord_bot_configured
                                        ? "text-green-400"
                                        : "text-zinc-500"
                                        }`}
                                >
                                    {settings?.discord_bot_configured
                                        ? "연결됨"
                                        : "미설정"}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Select (파일 스코프 컴포넌트) ────────────────────────

function Select({
    value,
    onChange,
    options,
}: {
    value: string;
    onChange: (v: string) => void;
    options: { value: string; label: string }[];
}) {
    return (
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-green-500 appearance-none cursor-pointer"
        >
            {options.map((o) => (
                <option key={o.value} value={o.value}>
                    {o.label}
                </option>
            ))}
        </select>
    );
}
