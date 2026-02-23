import { useState, useEffect, useRef } from "react";
import { Plus, Trash2, Video, Radio, Play, Square, AlertCircle, Users, Eye, Loader2, WifiOff, MessageSquare } from "lucide-react";
import { api, Channel } from "../api/client";
import { useToast } from "../components/ui/Toast";
import { useConfirm } from "../components/ui/ConfirmModal";
import { formatDuration, formatBytes } from "../utils/format";
import { getErrorMessage } from "../utils/error";

export default function Dashboard() {
    const [channels, setChannels] = useState<Channel[]>([]);
    const [newChannelId, setNewChannelId] = useState("");
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [connectionError, setConnectionError] = useState(false);
    const toast = useToast();
    const confirm = useConfirm();

    useEffect(() => {
        fetchChannels().finally(() => setInitialLoading(false));
        const interval = setInterval(fetchChannels, 5000);
        return () => clearInterval(interval);
    }, []);

    const fetchChannels = async () => {
        try {
            const data = await api.getChannels();
            setChannels(data);
            setConnectionError(false);
        } catch {
            setConnectionError(true);
        }
    };

    const handleAddChannel = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newChannelId) return;
        setLoading(true);
        try {
            await api.addChannel(newChannelId);
            setNewChannelId("");
            toast.success("채널이 추가되었습니다.");
            fetchChannels();
        } catch (e: unknown) {
            toast.error(getErrorMessage(e, "채널 추가에 실패했습니다."));
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveChannel = async (id: string, name?: string) => {
        const ok = await confirm({
            title: "채널 제거",
            message: `'${name || id}' 채널을 감시 목록에서 제거할까요?`,
            confirmText: "제거",
            variant: "danger",
        });
        if (!ok) return;
        try {
            await api.removeChannel(id);
            toast.success("채널이 제거되었습니다.");
            fetchChannels();
        } catch {
            toast.error("채널 제거에 실패했습니다.");
        }
    };

    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const handleStartRecord = async (id: string) => {
        if (actionLoading) return;
        setActionLoading(id);
        try {
            await api.startRecording(id);
            toast.success("녹화를 시작합니다.");
            fetchChannels();
        } catch (e: unknown) {
            toast.error(getErrorMessage(e, "녹화 시작에 실패했습니다."));
        } finally {
            setActionLoading(null);
        }
    };

    const handleStopRecord = async (id: string) => {
        if (actionLoading) return;
        const ok = await confirm({
            title: "녹화 중지",
            message: "현재 진행 중인 녹화를 중지할까요?",
            confirmText: "중지",
            variant: "danger",
        });
        if (!ok) return;
        setActionLoading(id);
        try {
            await api.stopRecording(id);
            toast.success("녹화가 중지되었습니다.");
            fetchChannels();
        } catch (e: unknown) {
            toast.error(getErrorMessage(e, "녹화 중지에 실패했습니다."));
        } finally {
            setActionLoading(null);
        }
    };

    const handleToggleAutoRecord = async (id: string) => {
        try {
            await api.toggleAutoRecord(id);
            fetchChannels();
        } catch {
            toast.error("자동 녹화 설정 변경에 실패했습니다.");
        }
    };

    const liveCount = channels.filter(ch => ch.is_live).length;
    const recCount = channels.filter(ch => ch.recording?.is_recording).length;

    return (
        <div className="space-y-6">
            {/* 연결 끊김 배너 */}
            {connectionError && !initialLoading && (
                <div className="flex items-center gap-3 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                    <WifiOff className="w-5 h-5 shrink-0" />
                    <span>서버와 연결이 끊어졌습니다. 자동으로 재연결을 시도합니다...</span>
                </div>
            )}

            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Radio className="w-6 h-6 text-green-500" />
                        Live Dashboard
                    </h2>
                    <p className="text-zinc-400">
                        채널 {channels.length}개 감시 중 ·{" "}
                        <span className="text-red-400 font-mono">{liveCount} LIVE</span> ·{" "}
                        <span className="text-green-400 font-mono">{recCount} REC</span>
                    </p>
                </div>

                <form onSubmit={handleAddChannel} className="flex gap-2">
                    <input
                        type="text"
                        value={newChannelId}
                        onChange={(e) => setNewChannelId(e.target.value)}
                        placeholder="채널 ID 또는 URL..."
                        className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-green-500"
                    />
                    <button
                        type="submit"
                        disabled={loading}
                        className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                        <Plus className="w-4 h-4" /> 추가
                    </button>
                </form>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* 초기 로딩 스켈레톤 */}
                {initialLoading && (
                    <>
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden animate-pulse">
                                <div className="w-full aspect-video bg-zinc-800" />
                                <div className="p-4 space-y-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-full bg-zinc-800" />
                                        <div className="flex-1 space-y-2">
                                            <div className="h-4 bg-zinc-800 rounded w-3/4" />
                                            <div className="h-3 bg-zinc-800 rounded w-1/2" />
                                        </div>
                                    </div>
                                    <div className="h-8 bg-zinc-800 rounded" />
                                </div>
                            </div>
                        ))}
                    </>
                )}

                {!initialLoading && channels?.map((channel) => (
                    <ChannelCard
                        key={channel.channel_id}
                        channel={channel}
                        onStartRecord={handleStartRecord}
                        onStopRecord={handleStopRecord}
                        onRemove={handleRemoveChannel}
                        onToggleAutoRecord={handleToggleAutoRecord}
                        isActionLoading={actionLoading === channel.channel_id}
                    />
                ))}

                {!initialLoading && channels.length === 0 && (
                    <div className="col-span-full py-12 text-center text-zinc-500">
                        감시 중인 채널이 없습니다. 채널 ID를 입력하여 모니터링을 시작하세요.
                    </div>
                )}
            </div>
        </div>
    );
}

// ── 채널 카드 서브 컴포넌트 ──────────────────────────

interface ChannelCardProps {
    channel: Channel;
    onStartRecord: (id: string) => void;
    onStopRecord: (id: string) => void;
    onRemove: (id: string, name?: string) => void;
    onToggleAutoRecord: (id: string) => void;
    isActionLoading: boolean;
}

function ChannelCard({ channel, onStartRecord, onStopRecord, onRemove, onToggleAutoRecord, isActionLoading }: ChannelCardProps) {
    const displayName = channel.channel_name || channel.channel_id;

    // ── 로컬 1초 타이머: start_time 기준으로 경과 시간 직접 계산 ──
    const [localDuration, setLocalDuration] = useState(channel.recording?.duration_seconds ?? 0);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }

        const startTimeStr = channel.recording?.start_time;
        if (channel.recording?.is_recording && startTimeStr) {
            // 백엔드에서 받은 start_time 기준으로 현재 경과 시간 즉시 계산
            const startMs = new Date(startTimeStr).getTime();
            const tick = () => setLocalDuration(Math.floor((Date.now() - startMs) / 1000));
            tick(); // 즉시 1회 실행
            timerRef.current = setInterval(tick, 1000);
        } else {
            setLocalDuration(channel.recording?.duration_seconds ?? 0);
        }

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        };
    }, [channel.recording?.is_recording, channel.recording?.start_time]);

    return (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden hover:border-zinc-700 transition-all group flex flex-col">
            {/* 썸네일 영역 */}
            <div className="relative w-full aspect-video bg-zinc-950 overflow-hidden">
                {channel.is_live && channel.thumbnail_url ? (
                    <img
                        src={channel.thumbnail_url}
                        alt={`${displayName} 방송 썸네일`}
                        className="w-full h-full object-cover transition-opacity duration-300"
                        loading="lazy"
                    />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-zinc-700 bg-gradient-to-br from-zinc-900 to-zinc-950">
                        <AlertCircle className="w-10 h-10 mb-2 opacity-40" />
                        <span className="text-xs font-semibold tracking-wider opacity-60">OFFLINE</span>
                    </div>
                )}

                {/* LIVE / REC 배지 */}
                {channel.is_live && (
                    <div className="absolute top-2 left-2 flex gap-1.5">
                        <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-sm flex items-center gap-1 shadow-lg shadow-red-500/30 animate-pulse">
                            ● LIVE
                        </span>
                        {channel.recording?.is_recording && (
                            <span className="bg-green-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-sm flex items-center gap-1 shadow-lg shadow-green-500/30">
                                REC
                            </span>
                        )}
                    </div>
                )}

                {/* 시청자 수 */}
                {channel.is_live && channel.viewer_count != null && channel.viewer_count > 0 && (
                    <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-sm text-white text-[11px] font-medium px-2 py-0.5 rounded flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {channel.viewer_count.toLocaleString()}
                    </div>
                )}

                {/* 삭제 버튼 (hover) */}
                <button
                    onClick={() => onRemove(channel.channel_id, displayName)}
                    className="absolute top-2 right-2 p-1.5 bg-black/50 backdrop-blur-sm hover:bg-red-500/80 text-zinc-400 hover:text-white rounded-lg transition-all opacity-0 group-hover:opacity-100"
                    title="채널 제거"
                >
                    <Trash2 className="w-3.5 h-3.5" />
                </button>
            </div>

            {/* 채널 정보 */}
            <div className="p-4 flex-1 flex flex-col">
                <div className="flex items-center gap-3 mb-2">
                    {/* 프로필 이미지 */}
                    {channel.profile_image_url ? (
                        <img
                            src={channel.profile_image_url}
                            alt={displayName}
                            className="w-9 h-9 rounded-full object-cover flex-shrink-0 border-2 border-zinc-700"
                        />
                    ) : (
                        <div className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0 border-2 border-zinc-700">
                            <Users className="w-4 h-4 text-zinc-500" />
                        </div>
                    )}
                    <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-white text-sm truncate" title={displayName}>
                            {displayName}
                        </h3>
                        {channel.title && channel.is_live ? (
                            <p className="text-xs text-zinc-400 truncate" title={channel.title}>
                                {channel.title}
                            </p>
                        ) : (
                            <p className="text-xs text-zinc-600 font-mono truncate">
                                {channel.channel_id}
                            </p>
                        )}
                    </div>
                </div>

                {/* 카테고리 */}
                {channel.category && channel.is_live && (
                    <div className="mb-3">
                        <span className="text-[11px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">
                            {channel.category}
                        </span>
                    </div>
                )}

                {/* 상태 정보 */}
                <div className="flex items-center justify-between text-xs mb-3">
                    <span className="text-zinc-500">상태</span>
                    <span className={`font-medium ${channel.is_live ? 'text-red-400' : 'text-zinc-500'}`}>
                        {channel.is_live ? 'LIVE' : 'OFFLINE'}
                    </span>
                </div>
                <div className="flex items-center justify-between text-xs mb-3">
                    <span className="text-zinc-500">자동 녹화</span>
                    <button
                        onClick={() => onToggleAutoRecord(channel.channel_id)}
                        className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${channel.auto_record ? 'bg-green-500' : 'bg-zinc-700'
                            }`}
                        title={channel.auto_record ? '자동 녹화 끄기' : '자동 녹화 켜기'}
                    >
                        <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${channel.auto_record ? 'translate-x-4' : 'translate-x-0'
                            }`} />
                    </button>
                </div>

                {/* 녹화 컨트롤 */}
                <div className="mt-auto">
                    {channel.recording?.is_recording ? (
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <div className="flex-1 bg-red-500/10 border border-red-500/20 rounded-lg p-2 flex items-center gap-2 text-xs text-red-400 animate-pulse">
                                    <Video className="w-3 h-3" />
                                    녹화 중... ({formatDuration(localDuration)})
                                </div>
                                <button
                                    onClick={() => onStopRecord(channel.channel_id)}
                                    disabled={isActionLoading}
                                    className="p-2 bg-zinc-800 hover:bg-red-600 text-red-400 hover:text-white rounded-lg border border-zinc-700 hover:border-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="녹화 중단"
                                >
                                    {isActionLoading ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Square className="w-4 h-4 fill-current" />
                                    )}
                                </button>
                            </div>
                            {/* 녹화 통계 */}
                            <div className="grid grid-cols-3 gap-2 text-xs">
                                <div className="bg-zinc-900/50 border border-zinc-800 rounded px-2 py-1">
                                    <div className="text-zinc-500">용량</div>
                                    <div className="text-zinc-300 font-mono">
                                        {formatBytes(channel.recording.file_size_bytes || 0)}
                                    </div>
                                </div>
                                <div className="bg-zinc-900/50 border border-zinc-800 rounded px-2 py-1">
                                    <div className="text-zinc-500">속도</div>
                                    <div className="text-zinc-300 font-mono">
                                        {(channel.recording.download_speed || 0).toFixed(2)} MB/s
                                    </div>
                                </div>
                                <div className="bg-zinc-900/50 border border-zinc-800 rounded px-2 py-1">
                                    <div className="text-zinc-500">비트레이트</div>
                                    <div className="text-zinc-300 font-mono">
                                        {(channel.recording.bitrate || 0).toFixed(0)} kbps
                                    </div>
                                </div>
                            </div>

                            {/* 채팅 아카이빙 상태 */}
                            {channel.chat_archiving?.is_running && (
                                <div className="flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-2 text-xs text-cyan-400">
                                    <MessageSquare className="w-3 h-3" />
                                    채팅 수집 중 ({channel.chat_archiving.message_count.toLocaleString()}개)
                                </div>
                            )}
                        </div>
                    ) : channel.is_live ? (
                        <button
                            onClick={() => onStartRecord(channel.channel_id)}
                            disabled={isActionLoading}
                            className="w-full bg-zinc-800 hover:bg-zinc-700 text-green-400 border border-zinc-700 rounded-lg p-2 flex items-center justify-center gap-2 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isActionLoading ? (
                                <>
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    처리 중...
                                </>
                            ) : (
                                <>
                                    <Play className="w-3 h-3 fill-current" />
                                    수동 녹화 시작
                                </>
                            )}
                        </button>
                    ) : (
                        <div className="bg-zinc-800/50 border border-zinc-800 rounded-lg p-2 flex items-center gap-2 text-xs text-zinc-500">
                            <AlertCircle className="w-3 h-3" />
                            방송 대기 중...
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
