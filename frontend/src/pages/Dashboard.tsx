import { useState, useEffect } from "react";
import { Plus, Trash2, Video, Radio, Play, Square, AlertCircle, Users, Eye } from "lucide-react";
import { api, Channel } from "../api/client";

export default function Dashboard() {
    const [channels, setChannels] = useState<Channel[]>([]);
    const [newChannelId, setNewChannelId] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchChannels();
        const interval = setInterval(fetchChannels, 5000);
        return () => clearInterval(interval);
    }, []);

    const fetchChannels = async () => {
        try {
            const data = await api.getChannels();
            setChannels(data);
        } catch (e) {
            console.error(e);
        }
    };

    const handleAddChannel = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newChannelId) return;
        setLoading(true);
        try {
            await api.addChannel(newChannelId);
            setNewChannelId("");
            fetchChannels();
        } catch (e) {
            console.error(e);
            alert("Failed to add channel");
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveChannel = async (id: string) => {
        if (!confirm(`Remove channel ${id}?`)) return;
        try {
            await api.removeChannel(id);
            fetchChannels();
        } catch (e) {
            console.error(e);
        }
    };

    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const handleStartRecord = async (id: string) => {
        if (actionLoading) return;
        setActionLoading(id);
        try {
            await api.startRecording(id);
            fetchChannels();
        } catch (e: any) {
            console.error(e);
            alert(e.response?.data?.detail || "녹화 시작 실패");
        } finally {
            setActionLoading(null);
        }
    };

    const handleStopRecord = async (id: string) => {
        if (actionLoading) return;
        if (!confirm("녹화를 중지할까요?")) return;
        setActionLoading(id);
        try {
            await api.stopRecording(id);
            fetchChannels();
        } catch (e: any) {
            console.error(e);
            alert(e.response?.data?.detail || "녹화 중지 실패");
        } finally {
            setActionLoading(null);
        }
    };

    const handleToggleAutoRecord = async (id: string) => {
        try {
            await api.toggleAutoRecord(id);
            fetchChannels();
        } catch (e) {
            console.error(e);
        }
    };

    const liveCount = channels.filter(ch => ch.is_live).length;
    const recCount = channels.filter(ch => ch.recording?.is_recording).length;

    return (
        <div className="space-y-6">
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
                {channels?.map((channel) => (
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

                {channels.length === 0 && (
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
    onRemove: (id: string) => void;
    onToggleAutoRecord: (id: string) => void;
    isActionLoading: boolean;
}

function ChannelCard({ channel, onStartRecord, onStopRecord, onRemove, onToggleAutoRecord, isActionLoading }: ChannelCardProps) {
    const displayName = channel.channel_name || channel.channel_id;

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
                    onClick={() => onRemove(channel.channel_id)}
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
                        <div className="flex items-center gap-2">
                            <div className="flex-1 bg-red-500/10 border border-red-500/20 rounded-lg p-2 flex items-center gap-2 text-xs text-red-400 animate-pulse">
                                <Video className="w-3 h-3" />
                                녹화 중... ({Math.floor(channel.recording.duration_seconds)}s)
                            </div>
                            <button
                                onClick={() => onStopRecord(channel.channel_id)}
                                disabled={isActionLoading}
                                className="p-2 bg-zinc-800 hover:bg-red-600 text-red-400 hover:text-white rounded-lg border border-zinc-700 hover:border-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title="녹화 중단"
                            >
                                <Square className="w-4 h-4 fill-current" />
                            </button>
                        </div>
                    ) : channel.is_live ? (
                        <button
                            onClick={() => onStartRecord(channel.channel_id)}
                            disabled={isActionLoading}
                            className="w-full bg-zinc-800 hover:bg-zinc-700 text-green-400 border border-zinc-700 rounded-lg p-2 flex items-center justify-center gap-2 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Play className="w-3 h-3 fill-current" />
                            {isActionLoading ? '처리 중...' : '수동 녹화 시작'}
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

