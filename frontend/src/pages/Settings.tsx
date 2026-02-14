import { useState, useEffect } from "react";
import {
    Settings as SettingsIcon,
    Shield,
    Save,
    Check,
    Key,
    Download,
    RefreshCcw,
    FolderOpen,
    Film,
    Gauge,
    Timer,
    Loader2,
    AlertCircle,
} from "lucide-react";
import { api, Settings as SettingsType } from "../api/client";

type Toast = { type: "success" | "error"; text: string };

export default function Settings() {
    const [settings, setSettings] = useState<SettingsType | null>(null);

    // ── Auth state ──
    const [nidAut, setNidAut] = useState("");
    const [nidSes, setNidSes] = useState("");
    const [authMsg, setAuthMsg] = useState<Toast | null>(null);

    // ── Download state ──
    const [keepParts, setKeepParts] = useState(false);
    const [maxRetries, setMaxRetries] = useState(3);
    const [dlSaving, setDlSaving] = useState(false);
    const [dlMsg, setDlMsg] = useState<Toast | null>(null);

    // ── General state ──
    const [downloadDir, setDownloadDir] = useState("");
    const [monitorInterval, setMonitorInterval] = useState(30);
    const [outputFormat, setOutputFormat] = useState("ts");
    const [recordingQuality, setRecordingQuality] = useState("best");
    const [genSaving, setGenSaving] = useState(false);
    const [genMsg, setGenMsg] = useState<Toast | null>(null);

    // ── VOD settings state ──
    const [vodMaxConcurrent, setVodMaxConcurrent] = useState(3);
    const [vodDefaultQuality, setVodDefaultQuality] = useState("best");
    const [vodMaxSpeed, setVodMaxSpeed] = useState(0);
    const [vodSaving, setVodSaving] = useState(false);
    const [vodMsg, setVodMsg] = useState<Toast | null>(null);

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
        } catch (e) {
            console.error(e);
        }
    };

    // ── Auth handlers ──
    const handleUpdateCookies = async () => {
        setAuthMsg(null);
        try {
            await api.updateCookies(nidAut, nidSes);
            setAuthMsg({ type: "success", text: "쿠키가 저장되었습니다!" });
            loadSettings();
            setNidAut("");
            setNidSes("");
        } catch {
            setAuthMsg({ type: "error", text: "쿠키 저장에 실패했습니다." });
        }
    };

    const handleTestCookies = async () => {
        setAuthMsg(null);
        try {
            const res = await api.testCookies();
            if (res.valid) {
                setAuthMsg({
                    type: "success",
                    text: `인증 성공! 닉네임: ${res.user_status?.nickname || "User"}`,
                });
            } else {
                setAuthMsg({ type: "error", text: "쿠키가 유효하지 않습니다." });
            }
        } catch (e: any) {
            setAuthMsg({
                type: "error",
                text: e.response?.data?.detail || "검증에 실패했습니다.",
            });
        }
    };

    // ── Download settings save ──
    const handleSaveDownloadSettings = async () => {
        setDlSaving(true);
        setDlMsg(null);
        try {
            await api.updateDownloadSettings(keepParts, maxRetries);
            setDlMsg({ type: "success", text: "다운로드 설정이 저장되었습니다." });
            loadSettings();
        } catch {
            setDlMsg({ type: "error", text: "다운로드 설정 저장에 실패했습니다." });
        } finally {
            setDlSaving(false);
        }
    };

    // ── General settings save ──
    const handleSaveGeneralSettings = async () => {
        setGenSaving(true);
        setGenMsg(null);
        try {
            await api.updateGeneralSettings({
                download_dir: downloadDir,
                monitor_interval: monitorInterval,
                output_format: outputFormat,
                recording_quality: recordingQuality,
            });
            setGenMsg({ type: "success", text: "일반 설정이 저장되었습니다." });
            loadSettings();
        } catch (e: any) {
            setGenMsg({
                type: "error",
                text: e.response?.data?.detail || "일반 설정 저장에 실패했습니다.",
            });
        } finally {
            setGenSaving(false);
        }
    };

    // ── VOD settings save ──
    const handleSaveVodSettings = async () => {
        setVodSaving(true);
        setVodMsg(null);
        try {
            await api.updateVodSettings({
                vod_max_concurrent: vodMaxConcurrent,
                vod_default_quality: vodDefaultQuality,
                vod_max_speed: vodMaxSpeed,
            });
            setVodMsg({ type: "success", text: "VOD 설정이 저장되었습니다." });
            loadSettings();
        } catch (e: any) {
            setVodMsg({
                type: "error",
                text: e.response?.data?.detail || "VOD 설정 저장에 실패했습니다.",
            });
        } finally {
            setVodSaving(false);
        }
    };

    // ── Shared toast component ──
    const ToastBox = ({ msg }: { msg: Toast | null }) =>
        msg ? (
            <div
                className={`p-3 rounded-lg text-sm flex items-center gap-2 ${
                    msg.type === "success"
                        ? "bg-green-500/10 text-green-400"
                        : "bg-red-500/10 text-red-400"
                }`}
            >
                {msg.type === "success" ? (
                    <Check className="w-4 h-4 shrink-0" />
                ) : (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                {msg.text}
            </div>
        ) : null;

    // ── Select component ──
    const Select = ({
        value,
        onChange,
        options,
    }: {
        value: string;
        onChange: (v: string) => void;
        options: { value: string; label: string }[];
    }) => (
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

                        {/* Download Directory */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                                <FolderOpen className="w-4 h-4" />
                                저장 경로
                            </label>
                            <input
                                type="text"
                                value={downloadDir}
                                onChange={(e) => setDownloadDir(e.target.value)}
                                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-green-500"
                                placeholder="예: E:\recordings"
                            />
                            <p className="text-xs text-zinc-500">
                                녹화 파일이 저장될 디렉토리 경로입니다.
                            </p>
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

                        <ToastBox msg={genMsg} />
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

                        <ToastBox msg={vodMsg} />
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
                                className={`px-2 py-1 rounded text-xs font-bold ${
                                    settings?.authenticated
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

                        <ToastBox msg={authMsg} />
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
                                <button
                                    type="button"
                                    onClick={() => setKeepParts(!keepParts)}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-zinc-900 ${
                                        keepParts ? "bg-green-600" : "bg-zinc-700"
                                    }`}
                                >
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                            keepParts ? "translate-x-6" : "translate-x-1"
                                        }`}
                                    />
                                </button>
                                <span className="text-sm text-zinc-500">
                                    {keepParts
                                        ? "취소/오류 시 보관"
                                        : "취소 시 삭제"}
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

                        <ToastBox msg={dlMsg} />
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
                                    className={`${
                                        settings?.discord_bot_configured
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
