import { useState } from "react";
import {
    Archive,
    Download,
    Search,
    ChevronLeft,
    ChevronRight,
    Clock,
    Eye,
    Loader2,
    ExternalLink,
    Radio,
} from "lucide-react";
import { client } from "../api/client";
import { useVod } from "../contexts/VodContext";
import { useToast } from "../components/ui/Toast";
import { clsx } from "clsx";
import { getErrorMessage } from "../utils/error";

// ── Types ────────────────────────────────────────────────

interface TwitcastingMovie {
    id: string;
    title: string;
    duration: number;         // 초
    created_at: number;       // Unix timestamp
    thumbnail_url: string;
    view_count: number;
    channel_name: string;
    archive_url: string;
}

interface TwitcastingArchiveResponse {
    total_count: number;
    movies: TwitcastingMovie[];
}

// ── Helpers ──────────────────────────────────────────────

function formatDurationSec(sec: number): string {
    if (!sec) return "0:00";
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${m}:${String(s).padStart(2, "0")}`;
}

function formatUnixDate(ts: number): string {
    if (!ts) return "";
    const d = new Date(ts * 1000);
    return d.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" });
}

// ── TwitCasting 탭 ───────────────────────────────────────

function TwitcastingTab() {
    const [channelId, setChannelId] = useState("");
    const [inputValue, setInputValue] = useState("");
    const [movies, setMovies] = useState<TwitcastingMovie[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [offset, setOffset] = useState(0);
    const [loading, setLoading] = useState(false);
    const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set());
    const { addTask } = useVod();
    const toast = useToast();

    const LIMIT = 20;

    const fetchMovies = async (id: string, newOffset: number) => {
        setLoading(true);
        try {
            const res = await client.get<TwitcastingArchiveResponse>(
                `/archive/twitcasting/${encodeURIComponent(id)}`,
                { params: { offset: newOffset, limit: LIMIT } }
            );
            setMovies(res.data.movies);
            setTotalCount(res.data.total_count);
            setOffset(newOffset);
            setChannelId(id);
        } catch (err: unknown) {
            toast.error(getErrorMessage(err, "아카이브 목록을 불러오지 못했습니다."));
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputValue.trim()) return;
        await fetchMovies(inputValue.trim(), 0);
    };

    const handleDownload = async (movie: TwitcastingMovie) => {
        setDownloadingIds((prev) => new Set(prev).add(movie.id));
        try {
            await addTask(movie.archive_url);
            toast.success(`'${movie.title || movie.id}' 다운로드가 시작되었습니다.`);
        } catch (err: unknown) {
            toast.error(getErrorMessage(err, "다운로드 시작에 실패했습니다."));
        } finally {
            setDownloadingIds((prev) => {
                const next = new Set(prev);
                next.delete(movie.id);
                return next;
            });
        }
    };

    const totalPages = Math.ceil(totalCount / LIMIT);
    const currentPage = Math.floor(offset / LIMIT) + 1;

    return (
        <div className="space-y-6">
            {/* 검색 폼 */}
            <form
                onSubmit={handleSearch}
                className="bg-zinc-900/50 p-6 rounded-xl border border-zinc-800 space-y-4"
            >
                <label className="block text-sm font-medium text-zinc-300">
                    TwitCasting 채널 ID
                    <span className="ml-2 text-xs text-zinc-500">
                        (예: twitcasting.tv/<span className="text-orange-400">someuser</span> → <span className="text-orange-400">someuser</span>)
                    </span>
                </label>
                <div className="flex gap-2">
                    <input
                        type="text"
                        className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                        placeholder="채널 ID 입력..."
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                    />
                    <button
                        type="submit"
                        disabled={loading || !inputValue.trim()}
                        className="bg-orange-600 hover:bg-orange-500 text-white px-5 py-2 rounded-lg font-bold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {loading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Search className="w-4 h-4" />
                        )}
                        목록 불러오기
                    </button>
                </div>
                <p className="text-xs text-zinc-500">
                    Settings &gt; TwitCasting에서 Client ID / Client Secret을 먼저 설정하세요.
                </p>
            </form>

            {/* 결과 목록 */}
            {movies.length > 0 && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-zinc-400">
                            <span className="text-white font-bold">{channelId}</span>의 방송 아카이브&nbsp;
                            <span className="text-orange-400 font-bold">{totalCount.toLocaleString()}</span>개
                        </p>
                        {/* 페이지네이션 */}
                        {totalPages > 1 && (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => fetchMovies(channelId, offset - LIMIT)}
                                    disabled={offset === 0 || loading}
                                    className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronLeft className="w-4 h-4 text-white" />
                                </button>
                                <span className="text-xs text-zinc-400">
                                    {currentPage} / {totalPages}
                                </span>
                                <button
                                    onClick={() => fetchMovies(channelId, offset + LIMIT)}
                                    disabled={offset + LIMIT >= totalCount || loading}
                                    className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronRight className="w-4 h-4 text-white" />
                                </button>
                            </div>
                        )}
                    </div>

                    {movies.map((movie) => (
                        <div
                            key={movie.id}
                            className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-4 flex gap-4 items-start hover:border-zinc-700 transition-colors"
                        >
                            {/* 썸네일 */}
                            <div className="w-32 h-20 shrink-0 rounded-lg overflow-hidden bg-zinc-800">
                                {movie.thumbnail_url ? (
                                    <img
                                        src={movie.thumbnail_url}
                                        alt={movie.title}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <Radio className="w-6 h-6 text-zinc-600" />
                                    </div>
                                )}
                            </div>

                            {/* 메타데이터 */}
                            <div className="flex-1 min-w-0 space-y-1">
                                <p className="text-sm font-semibold text-white truncate">
                                    {movie.title || `방송 ${movie.id}`}
                                </p>
                                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-400">
                                    <span className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {formatDurationSec(movie.duration)}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Eye className="w-3 h-3" />
                                        {movie.view_count.toLocaleString()}
                                    </span>
                                    <span>{formatUnixDate(movie.created_at)}</span>
                                </div>
                            </div>

                            {/* 버튼 */}
                            <div className="flex gap-2 shrink-0">
                                <a
                                    href={movie.archive_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
                                    title="브라우저에서 열기"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                </a>
                                <button
                                    onClick={() => handleDownload(movie)}
                                    disabled={downloadingIds.has(movie.id)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-bold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {downloadingIds.has(movie.id) ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                        <Download className="w-3.5 h-3.5" />
                                    )}
                                    다운로드
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* 결과 없음 */}
            {!loading && channelId && movies.length === 0 && (
                <div className="text-center py-12 text-zinc-500">
                    <Archive className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p>아카이브된 방송이 없습니다.</p>
                </div>
            )}
        </div>
    );
}

// ── Twitter Spaces 탭 ────────────────────────────────────

function TwitterSpacesTab() {
    const [url, setUrl] = useState("");
    const [loading, setLoading] = useState(false);
    const { addTask } = useVod();
    const toast = useToast();

    const handleDownload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!url.trim()) return;
        setLoading(true);
        try {
            await addTask(url.trim());
            setUrl("");
            toast.success("Twitter Spaces 아카이브 다운로드가 시작되었습니다.");
        } catch (err: unknown) {
            toast.error(getErrorMessage(err, "다운로드 시작에 실패했습니다."));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-zinc-900/50 p-6 rounded-xl border border-zinc-800 space-y-4">
                <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-1">
                        Twitter Spaces URL
                    </label>
                    <p className="text-xs text-zinc-500 mb-3">
                        Twitter API 한계로 목록 조회는 지원되지 않습니다. Space URL을 직접 입력하세요.
                    </p>
                </div>

                <form onSubmit={handleDownload} className="flex gap-2">
                    <input
                        type="text"
                        className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                        placeholder="https://twitter.com/i/spaces/{space_id}"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                    />
                    <button
                        type="submit"
                        disabled={loading || !url.trim()}
                        className="bg-cyan-600 hover:bg-cyan-500 text-white px-5 py-2 rounded-lg font-bold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {loading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Download className="w-4 h-4" />
                        )}
                        다운로드
                    </button>
                </form>

                <div className="bg-zinc-950/50 rounded-lg p-4 space-y-2 text-xs text-zinc-400 border border-zinc-800/50">
                    <p className="font-semibold text-zinc-300">안내</p>
                    <ul className="space-y-1 list-disc list-inside">
                        <li>출력 형식: <span className="text-cyan-400">m4a (오디오 전용)</span></li>
                        <li>yt-dlp가 서버에 설치되어 있어야 합니다.</li>
                        <li>비공개 Space는 Settings에서 쿠키 파일 경로를 설정하세요.</li>
                        <li>다운로드 진행 상황은 <span className="text-white">VOD Downloader</span> 탭에서 확인하세요.</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}

// ── 메인 Archive 페이지 ──────────────────────────────────

type TabKey = "twitcasting" | "twitter_spaces";

const TABS: { key: TabKey; label: string; color: string }[] = [
    { key: "twitcasting", label: "TwitCasting", color: "orange" },
    { key: "twitter_spaces", label: "Twitter Spaces", color: "cyan" },
];

export default function ArchivePage() {
    const [activeTab, setActiveTab] = useState<TabKey>("twitcasting");

    return (
        <div className="space-y-6">
            {/* 헤더 */}
            <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Archive className="w-6 h-6 text-purple-400" />
                    Archive Downloader
                </h2>
                <p className="text-zinc-400 text-sm mt-1">
                    TwitCasting 과거 방송 및 Twitter Spaces 아카이브를 다운로드합니다.
                </p>
            </div>

            {/* 탭 */}
            <div className="flex gap-2 border-b border-zinc-800 pb-0">
                {TABS.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={clsx(
                            "px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors border-b-2",
                            activeTab === tab.key
                                ? tab.color === "orange"
                                    ? "text-orange-400 border-orange-400 bg-orange-400/5"
                                    : "text-cyan-400 border-cyan-400 bg-cyan-400/5"
                                : "text-zinc-400 border-transparent hover:text-zinc-200 hover:bg-zinc-800/50"
                        )}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* 탭 콘텐츠 */}
            {activeTab === "twitcasting" && <TwitcastingTab />}
            {activeTab === "twitter_spaces" && <TwitterSpacesTab />}
        </div>
    );
}
