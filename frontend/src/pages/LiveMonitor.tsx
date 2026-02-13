import React, { useState } from 'react';
import { Play, Trash2, Plus, Users, Clock, AlertCircle, Signal } from 'lucide-react';
import type { Channel } from '@/types';

interface LiveMonitorProps {
    channels: Channel[];
    onToggleRecord: (id: string) => void;
    onRemoveChannel: (id: string) => void;
    onAddChannel: (channelId: string) => void;
}

export const LiveMonitor: React.FC<LiveMonitorProps> = ({
    channels,
    onToggleRecord,
    onRemoveChannel,
    onAddChannel,
}) => {
    const [newChannelInput, setNewChannelInput] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    const handleAddSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const value = newChannelInput.trim();
        if (value) {
            onAddChannel(value);
            setNewChannelInput('');
            setIsAdding(false);
        }
    };

    const liveCount = channels.filter(ch => ch.isLive).length;
    const recCount = channels.filter(ch => ch.isRecording).length;

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white">Live Monitor</h2>
                    <p className="text-gray-400 text-sm">
                        채널 {channels.length}개 감시 중 ·{' '}
                        <span className="text-chzzk font-mono">{liveCount} LIVE</span> ·{' '}
                        <span className="text-red-400 font-mono">{recCount} REC</span>
                    </p>
                </div>
                <button
                    onClick={() => setIsAdding(!isAdding)}
                    className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-chzzk hover:bg-chzzk-dark text-black px-4 py-2 rounded-lg font-bold transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    <span>채널 추가</span>
                </button>
            </div>

            {isAdding && (
                <div className="bg-chzzk-card border border-chzzk/30 p-4 rounded-xl animate-slide-in-top">
                    <form onSubmit={handleAddSubmit} className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
                        <input
                            type="text"
                            value={newChannelInput}
                            onChange={(e) => setNewChannelInput(e.target.value)}
                            placeholder="치지직 채널 ID 입력..."
                            className="flex-1 bg-gray-900 border border-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:border-chzzk"
                            autoFocus
                        />
                        <div className="flex gap-2">
                            <button type="submit" className="flex-1 sm:flex-none text-sm bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg">
                                감시 시작
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsAdding(false)}
                                className="flex-1 sm:flex-none text-sm text-gray-400 hover:text-white px-2"
                            >
                                취소
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {channels.map((channel) => (
                    <ChannelCard
                        key={channel.id}
                        channel={channel}
                        onToggleRecord={onToggleRecord}
                        onRemove={onRemoveChannel}
                    />
                ))}

                {/* 빈 채널 추가 카드 */}
                <button
                    onClick={() => setIsAdding(true)}
                    className="bg-chzzk-card/50 border border-gray-800 border-dashed rounded-xl flex flex-col items-center justify-center p-8 hover:bg-chzzk-card hover:border-chzzk/50 transition-all group min-h-[300px]"
                >
                    <div className="w-16 h-16 rounded-full bg-gray-800 group-hover:bg-chzzk/20 flex items-center justify-center mb-4 transition-colors">
                        <Plus className="w-8 h-8 text-gray-500 group-hover:text-chzzk" />
                    </div>
                    <h3 className="text-gray-400 font-bold group-hover:text-white">채널 추가</h3>
                </button>
            </div>
        </div>
    );
};

// ── 채널 카드 서브 컴포넌트 ──────────────────────────

interface ChannelCardProps {
    channel: Channel;
    onToggleRecord: (id: string) => void;
    onRemove: (id: string) => void;
}

const ChannelCard: React.FC<ChannelCardProps> = ({ channel, onToggleRecord, onRemove }) => {
    const durationStr = channel.recordingDuration
        ? formatDuration(channel.recordingDuration)
        : '';

    return (
        <div className="group bg-chzzk-card border border-gray-800 rounded-xl overflow-hidden hover:border-gray-600 transition-all duration-300 flex flex-col">
            {/* 상태 헤더 */}
            <div className="relative h-40 bg-gray-900 overflow-hidden">
                {channel.isLive ? (
                    <>
                        <div className="w-full h-full bg-gradient-to-br from-chzzk/10 to-purple-500/10 flex items-center justify-center">
                            <Signal className="w-12 h-12 text-chzzk/30" />
                        </div>
                        <div className="absolute top-2 left-2 flex gap-2">
                            <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 animate-pulse">
                                <Signal className="w-3 h-3" /> LIVE
                            </span>
                            {channel.isRecording && (
                                <span className="bg-chzzk text-black text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                                    REC {durationStr && `· ${durationStr}`}
                                </span>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-600 bg-gray-900/50">
                        <AlertCircle className="w-10 h-10 mb-2 opacity-50" />
                        <span className="text-sm font-semibold">OFFLINE</span>
                    </div>
                )}
            </div>

            {/* 정보 */}
            <div className="p-4 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                    <div className="min-w-0">
                        <h3 className="font-bold text-white text-lg truncate pr-2">{channel.displayName}</h3>
                        <p className="text-xs text-gray-400 font-mono truncate">{channel.category}</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-4 mb-6">
                    <div className="bg-gray-900/50 p-2 rounded flex items-center space-x-2">
                        <Users className="w-4 h-4 text-blue-400" />
                        <span className="text-sm text-gray-300 font-mono">
                            {channel.isLive ? channel.viewers.toLocaleString() : '-'}
                        </span>
                    </div>
                    <div className="bg-gray-900/50 p-2 rounded flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-orange-400" />
                        <span className="text-sm text-gray-300 font-mono">
                            {channel.isLive && channel.uptime ? channel.uptime : '-'}
                        </span>
                    </div>
                </div>

                {/* 액션 버튼 */}
                <div className="mt-auto flex space-x-2">
                    <button
                        onClick={() => onToggleRecord(channel.id)}
                        className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-lg text-sm font-bold transition-all ${channel.isRecording
                                ? 'bg-red-500/20 text-red-500 border border-red-500/50 hover:bg-red-500 hover:text-white'
                                : 'bg-chzzk/10 text-chzzk border border-chzzk/20 hover:bg-chzzk hover:text-black'
                            }`}
                        disabled={!channel.isLive}
                    >
                        {channel.isRecording ? (
                            <>
                                <div className="w-2 h-2 bg-current rounded-full animate-pulse mr-1" />
                                <span>녹화 중지</span>
                            </>
                        ) : (
                            <>
                                <Play className="w-3 h-3" />
                                <span>녹화 시작</span>
                            </>
                        )}
                    </button>
                    <button
                        onClick={() => onRemove(channel.id)}
                        className="px-3 py-2 rounded-lg bg-gray-800 text-gray-400 hover:bg-red-500/10 hover:text-red-500 border border-transparent hover:border-red-500/50 transition-colors"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};

/** 초를 HH:MM:SS 형태로 포맷 */
function formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}
