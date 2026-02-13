import { useState, useEffect } from "react";
import { Download, Play, AlertCircle, CheckCircle, Loader2, Pause, Square, RotateCcw } from "lucide-react";
import { api, VodInfo, VodStatus } from "../api/client";
import { clsx } from "clsx";

export default function VodDownload() {
    const [url, setUrl] = useState("");
    const [info, setInfo] = useState<VodInfo | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState<VodStatus | null>(null);

    // Poll status every 2 seconds
    useEffect(() => {
        const interval = setInterval(async () => {
            try {
                const s = await api.getVodStatus();
                setStatus(s);
                if (s.state === 'downloading' || s.state === 'idle') {
                    // Keep polling
                }
            } catch (e) {
                console.error("Status check failed", e);
            }
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    const handleCheckInfo = async () => {
        if (!url) return;
        setLoading(true);
        setError(null);
        setInfo(null);
        try {
            const data = await api.getVodInfo(url);
            setInfo(data);
        } catch (err: any) {
            setError(err.response?.data?.detail || "Failed to fetch video info");
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async () => {
        if (!url) return;
        try {
            await api.downloadVod(url);
            // Status polling will pick up the change
        } catch (err: any) {
            setError(err.response?.data?.detail || "Failed to start download");
        }
    };

    const handleCancel = async () => {
        if (!confirm("Cancel download?")) return;
        try {
            await api.cancelVodDownload();
        } catch (e) {
            console.error(e);
        }
    };

    const handlePause = async () => {
        try {
            await api.pauseVodDownload();
        } catch (e) {
            console.error(e);
        }
    };

    const handleResume = async () => {
        try {
            await api.resumeVodDownload();
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Download className="w-6 h-6 text-green-500" />
                    VOD Downloader
                </h2>
                <p className="text-zinc-400">Download VODs and Clips from Chzzk.</p>
            </div>

            {/* URL Input Section */}
            <div className="bg-zinc-900/50 p-6 rounded-xl border border-zinc-800 space-y-4">
                <label className="block text-sm font-medium text-zinc-300">
                    Video URL
                </label>
                <div className="flex gap-2">
                    <input
                        type="text"
                        className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-green-500/50"
                        placeholder="https://chzzk.naver.com/video/..."
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                    />
                    <button
                        onClick={handleCheckInfo}
                        disabled={loading || !url}
                        className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Check"}
                    </button>
                </div>
                {error && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-400 text-sm">
                        <AlertCircle className="w-4 h-4" />
                        {error}
                    </div>
                )}
            </div>

            {/* Video Info Card */}
            {info && (
                <div className="bg-zinc-900/50 p-6 rounded-xl border border-zinc-800 flex gap-6 animate-in fade-in slide-in-from-bottom-4">
                    <img
                        src={info.thumbnail}
                        alt={info.title}
                        className="w-64 aspect-video object-cover rounded-lg shadow-lg border border-zinc-700"
                    />
                    <div className="flex-1 space-y-4">
                        <div>
                            <h3 className="text-xl font-bold text-white line-clamp-2">
                                {info.title}
                            </h3>
                            <p className="text-zinc-400 mt-1">{info.uploader}</p>
                        </div>

                        <div className="flex items-center gap-4 text-sm text-zinc-500">
                            <span className="flex items-center gap-1">
                                <Play className="w-4 h-4" />
                                {Math.floor(info.duration / 60)}m {info.duration % 60}s
                            </span>
                        </div>

                        <button
                            onClick={handleDownload}
                            disabled={status?.state === 'downloading'}
                            className="mt-4 bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-lg font-bold shadow-lg shadow-green-900/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {status?.state === 'downloading' ? 'Download in Progress...' : 'Start Download'}
                        </button>
                    </div>
                </div>
            )}

            {/* Progress Status */}
            {status && status.state !== 'idle' && (
                <div className="bg-zinc-900/50 p-6 rounded-xl border border-zinc-800 space-y-3">
                    <div className="flex justify-between items-center">
                        <h4 className="font-medium text-white flex items-center gap-2">
                            {status.state === 'downloading' && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
                            {status.state === 'paused' && <Pause className="w-4 h-4 text-yellow-500" />}
                            {status.state === 'completed' && <CheckCircle className="w-4 h-4 text-green-500" />}
                            {status.state === 'error' && <AlertCircle className="w-4 h-4 text-red-500" />}
                            {status.state === 'cancelling' && <Loader2 className="w-4 h-4 animate-spin text-red-500" />}
                            <span className="capitalize">{status.state}</span>
                        </h4>

                        <div className="flex items-center gap-3">
                            {(status.state === 'downloading' || status.state === 'paused') && (
                                <div className="flex gap-1">
                                    {status.state === 'downloading' ? (
                                        <button
                                            onClick={handlePause}
                                            className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-yellow-400 rounded-lg transition-colors"
                                            title="Pause"
                                        >
                                            <Pause className="w-4 h-4 fill-current" />
                                        </button>
                                    ) : (
                                        <button
                                            onClick={handleResume}
                                            className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-green-400 rounded-lg transition-colors"
                                            title="Resume"
                                        >
                                            <Play className="w-4 h-4 fill-current" />
                                        </button>
                                    )}
                                    <button
                                        onClick={handleCancel}
                                        className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-red-400 rounded-lg transition-colors"
                                        title="Cancel"
                                    >
                                        <Square className="w-4 h-4 fill-current" />
                                    </button>
                                </div>
                            )}
                            <span className="text-zinc-400 text-sm font-mono">{status.progress.toFixed(1)}%</span>
                        </div>
                    </div>

                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                            className={clsx(
                                "h-full transition-all duration-500 ease-out",
                                status.state === 'completed' ? "bg-green-500" :
                                    status.state === 'error' || status.state === 'cancelling' ? "bg-red-500" :
                                        status.state === 'paused' ? "bg-yellow-500" : "bg-blue-500"
                            )}
                            style={{ width: `${status.progress}%` }}
                        />
                    </div>
                    <p className="text-xs text-zinc-500 truncate">{status.title || 'Preparing...'}</p>
                </div>
            )}
        </div>
    );
}
