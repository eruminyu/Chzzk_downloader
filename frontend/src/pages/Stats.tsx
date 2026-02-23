import { useState, useEffect } from "react";
import {
    BarChart2,
    Video,
    HardDrive,
    Download,
    Loader2,
    Clock,
    Database,
    Radio,
    Calendar,
} from "lucide-react";
import { api, StatsResponse, ChannelLiveStat, LiveSession } from "../api/client";
import { useToast } from "../components/ui/Toast";
import { formatDuration as _formatDuration, formatBytes, formatDate } from "../utils/format";

function formatDuration(seconds: number): string {
    return _formatDuration(seconds, "korean");
}

// ── 요약 카드 ────────────────────────────────────────────

interface SummaryCardProps {
    icon: React.ReactNode;
    label: string;
    value: string;
    sub?: string;
    color: string;
}

function SummaryCard({ icon, label, value, sub, color }: SummaryCardProps) {
    return (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 space-y-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
                {icon}
            </div>
            <div>
                <p className="text-xs text-zinc-500 font-medium">{label}</p>
                <p className="text-2xl font-bold text-white mt-0.5">{value}</p>
                {sub && <p className="text-xs text-zinc-500 mt-0.5">{sub}</p>}
            </div>
        </div>
    );
}

// ── 저장소 사용률 카드 ───────────────────────────────────

interface StorageCardProps {
    used: number;
    total: number;
    free: number;
    dir: string;
}

function StorageCard({ used, total, free, dir }: StorageCardProps) {
    const pct = total > 0 ? Math.round((used / total) * 100) : 0;
    const barColor =
        pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-yellow-500" : "bg-green-500";

    return (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 space-y-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-blue-500/15">
                <HardDrive className="w-5 h-5 text-blue-400" />
            </div>
            <div className="space-y-2">
                <div className="flex items-end justify-between">
                    <div>
                        <p className="text-xs text-zinc-500 font-medium">저장소 사용률</p>
                        <p className="text-2xl font-bold text-white mt-0.5">{pct}%</p>
                    </div>
                    <p className="text-xs text-zinc-500 font-mono pb-1">
                        {formatBytes(used)} / {formatBytes(total)}
                    </p>
                </div>
                <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all ${barColor}`}
                        style={{ width: `${pct}%` }}
                    />
                </div>
                <p className="text-xs text-zinc-600 font-mono truncate" title={dir}>
                    여유 공간: {formatBytes(free)}
                </p>
            </div>
        </div>
    );
}

// ── 메인 페이지 ──────────────────────────────────────────

export default function Stats() {
    const [data, setData] = useState<StatsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const toast = useToast();

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        setLoading(true);
        try {
            const res = await api.getStats();
            setData(res);
        } catch {
            toast.error("통계 데이터를 불러오는 데 실패했습니다.");
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-24 text-zinc-500">
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                통계 불러오는 중...
            </div>
        );
    }

    if (!data) return null;

    const { live, vod, storage, recent_sessions } = data;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <BarChart2 className="w-6 h-6 text-green-500" />
                    Statistics
                </h2>
                <p className="text-zinc-400">라이브 녹화 및 VOD 다운로드 통계를 확인합니다.</p>
            </div>

            {/* 요약 카드 4개 */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <SummaryCard
                    icon={<Clock className="w-5 h-5 text-green-400" />}
                    label="총 라이브 녹화 시간"
                    value={formatDuration(live.total_duration_seconds)}
                    sub={`${live.total_sessions}개 세션`}
                    color="bg-green-500/15"
                />
                <SummaryCard
                    icon={<Video className="w-5 h-5 text-red-400" />}
                    label="총 녹화 용량"
                    value={formatBytes(live.total_size_bytes)}
                    sub="라이브 녹화 합계"
                    color="bg-red-500/15"
                />
                <SummaryCard
                    icon={<Download className="w-5 h-5 text-purple-400" />}
                    label="VOD 다운로드"
                    value={`${vod.total_completed}개`}
                    sub={`치지직 ${vod.by_type.chzzk} / 외부 ${vod.by_type.external}`}
                    color="bg-purple-500/15"
                />
                <StorageCard
                    used={storage.used_bytes}
                    total={storage.total_bytes}
                    free={storage.free_bytes}
                    dir={storage.download_dir}
                />
            </div>

            {/* 채널별 통계 */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
                <div className="flex items-center gap-2 px-5 py-4 border-b border-zinc-800">
                    <Radio className="w-4 h-4 text-green-500" />
                    <h3 className="text-base font-semibold text-white">채널별 통계</h3>
                    <span className="text-xs text-zinc-500 ml-1">
                        (라이브 감지: 최근 30일 기준)
                    </span>
                </div>

                {live.by_channel.length === 0 ? (
                    <div className="py-12 text-center text-zinc-500 text-sm">
                        아직 라이브 녹화 이력이 없습니다.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-zinc-800 bg-zinc-900/30">
                                    <th className="text-left px-5 py-3 text-xs font-medium text-zinc-500">채널</th>
                                    <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500">녹화 횟수</th>
                                    <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500">라이브 감지</th>
                                    <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500">총 녹화 시간</th>
                                    <th className="text-right px-5 py-3 text-xs font-medium text-zinc-500">총 용량</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/50">
                                {live.by_channel.map((ch: ChannelLiveStat) => (
                                    <tr key={ch.channel_id} className="hover:bg-zinc-800/30 transition-colors">
                                        <td className="px-5 py-3">
                                            <p className="font-medium text-zinc-200">{ch.channel_name}</p>
                                            <p className="text-xs text-zinc-600 font-mono">{ch.channel_id}</p>
                                        </td>
                                        <td className="px-4 py-3 text-right text-zinc-300 font-mono">
                                            {ch.session_count}회
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <span className="text-cyan-400 font-mono font-medium">
                                                {ch.live_detected_count}일
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right text-zinc-300 font-mono">
                                            {formatDuration(ch.total_duration_seconds)}
                                        </td>
                                        <td className="px-5 py-3 text-right text-zinc-300 font-mono">
                                            {formatBytes(ch.total_size_bytes)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* 최근 녹화 세션 */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
                <div className="flex items-center gap-2 px-5 py-4 border-b border-zinc-800">
                    <Calendar className="w-4 h-4 text-zinc-400" />
                    <h3 className="text-base font-semibold text-white">최근 녹화 세션</h3>
                    <span className="text-xs text-zinc-500 ml-1">(최근 10개)</span>
                </div>

                {recent_sessions.length === 0 ? (
                    <div className="py-12 text-center text-zinc-500 text-sm">
                        녹화 이력이 없습니다.
                    </div>
                ) : (
                    <div className="divide-y divide-zinc-800/50">
                        {recent_sessions.map((s: LiveSession, idx: number) => (
                            <div
                                key={idx}
                                className="flex items-center gap-4 px-5 py-3 hover:bg-zinc-800/30 transition-colors"
                            >
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-zinc-200 truncate">
                                        {s.channel_name}
                                    </p>
                                    <p className="text-xs text-zinc-500 mt-0.5">
                                        {formatDate(s.ended_at)}
                                    </p>
                                </div>
                                <div className="text-right shrink-0 space-y-0.5">
                                    <p className="text-xs font-mono text-zinc-300">
                                        {formatDuration(s.duration_seconds)}
                                    </p>
                                    <p className="text-xs font-mono text-zinc-500">
                                        {formatBytes(s.file_size_bytes)}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
