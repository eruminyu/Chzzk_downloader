import React, { useState } from 'react';
import { Search, Download, FileVideo, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import type { DownloadTask } from '@/types';

interface VODDownloaderProps {
    tasks: DownloadTask[];
    onAddTask: (url: string) => void;
}

export const VODDownloader: React.FC<VODDownloaderProps> = ({ tasks, onAddTask }) => {
    const [url, setUrl] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const handleAnalyze = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!url) return;

        setIsAnalyzing(true);
        try {
            await onAddTask(url);
        } finally {
            setUrl('');
            setIsAnalyzing(false);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-white">VOD Downloader</h2>
                    <p className="text-gray-400 text-sm">
                        Powered by <span className="font-mono text-chzzk">yt-dlp</span> wrap engine
                    </p>
                </div>
            </div>

            {/* URL 입력 */}
            <div className="bg-chzzk-card p-6 rounded-xl border border-gray-800 shadow-lg">
                <form onSubmit={handleAnalyze} className="flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-gray-500" />
                        </div>
                        <input
                            type="text"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            className="block w-full pl-10 bg-gray-900 border border-gray-700 rounded-lg py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:border-chzzk focus:ring-1 focus:ring-chzzk transition-colors"
                            placeholder="VOD 또는 클립 URL 입력 (예: https://chzzk.naver.com/video/...)"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={isAnalyzing || !url}
                        className={`w-full sm:w-auto px-6 py-3 rounded-lg font-bold flex items-center justify-center space-x-2 transition-all ${isAnalyzing
                                ? 'bg-gray-700 cursor-not-allowed text-gray-400'
                                : 'bg-chzzk hover:bg-chzzk-dark text-black'
                            }`}
                    >
                        {isAnalyzing ? (
                            <>
                                <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                                <span>분석 중...</span>
                            </>
                        ) : (
                            <>
                                <Download className="w-5 h-5" />
                                <span>다운로드</span>
                            </>
                        )}
                    </button>
                </form>
                <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-500">
                    <span className="flex items-center"><CheckCircle className="w-3 h-3 mr-1 text-green-500" /> 1080p60 지원</span>
                    <span className="flex items-center"><CheckCircle className="w-3 h-3 mr-1 text-green-500" /> MP4 자동 리먹싱</span>
                    <span className="flex items-center"><CheckCircle className="w-3 h-3 mr-1 text-green-500" /> 성인 인증 쿠키 지원</span>
                </div>
            </div>

            {/* 다운로드 큐 */}
            <div className="space-y-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    다운로드 대기열
                    <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">{tasks.length}</span>
                </h3>

                {tasks.length === 0 ? (
                    <div className="text-center py-20 bg-chzzk-card/30 rounded-xl border border-gray-800 border-dashed">
                        <FileVideo className="w-16 h-16 text-gray-700 mx-auto mb-4" />
                        <p className="text-gray-500 font-medium">활성 다운로드 없음</p>
                        <p className="text-sm text-gray-600">위에 링크를 붙여넣어 시작하세요</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {tasks.map((task) => (
                            <TaskItem key={task.id} task={task} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

// ── 다운로드 태스크 카드 ─────────────────────────────

const TaskItem: React.FC<{ task: DownloadTask }> = ({ task }) => {
    const statusBadgeClass =
        task.status === 'completed' ? 'bg-green-500/10 text-green-500' :
            task.status === 'downloading' ? 'bg-blue-500/10 text-blue-500' :
                task.status === 'analyzing' ? 'bg-yellow-500/10 text-yellow-500' :
                    task.status === 'error' ? 'bg-red-500/10 text-red-500' :
                        'bg-gray-800 text-gray-400';

    const statusLabels: Record<string, string> = {
        queued: '대기',
        analyzing: '분석 중',
        downloading: '다운로드 중',
        completed: '완료',
        error: '오류',
    };

    const barColorClass =
        task.status === 'completed' ? 'bg-chzzk' :
            task.status === 'error' ? 'bg-red-500' :
                'bg-blue-500';

    return (
        <div className="bg-chzzk-card border border-gray-800 p-4 rounded-xl flex flex-col sm:flex-row items-center gap-4 hover:border-gray-700 transition-colors">
            {/* 상태 아이콘 영역 */}
            <div className="w-full sm:w-24 h-20 bg-gray-900 rounded-lg flex items-center justify-center flex-shrink-0">
                {task.status === 'completed' && <CheckCircle className="text-chzzk w-8 h-8" />}
                {task.status === 'downloading' && <div className="text-white font-mono font-bold text-lg">{Math.round(task.progress)}%</div>}
                {task.status === 'analyzing' && <div className="w-6 h-6 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />}
                {task.status === 'error' && <AlertCircle className="text-red-500 w-8 h-8" />}
                {task.status === 'queued' && <Clock className="text-gray-500 w-8 h-8" />}
            </div>

            <div className="flex-1 min-w-0 w-full">
                <div className="flex justify-between items-start mb-1">
                    <h4 className="font-bold text-white truncate text-sm">{task.title}</h4>
                    <span className={`text-xs font-bold px-2 py-1 rounded capitalize ml-2 whitespace-nowrap ${statusBadgeClass}`}>
                        {statusLabels[task.status] || task.status}
                    </span>
                </div>

                <div className="text-xs text-gray-500 font-mono mb-2 flex space-x-4">
                    <span>Size: {task.size}</span>
                    {task.status === 'downloading' && <span>Speed: {task.speed}</span>}
                </div>

                <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                    <div
                        className={`h-full transition-all duration-300 ${barColorClass}`}
                        style={{ width: `${task.progress}%` }}
                    />
                </div>
            </div>
        </div>
    );
};
