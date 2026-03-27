import { useState, useEffect, useCallback } from "react";
import {
    MessageSquare,
    Search,
    Download,
    FileText,
    Loader2,
    X,
    ChevronLeft,
    ChevronRight,
    FolderOpen,
} from "lucide-react";
import { clsx } from "clsx";
import { api, ChatLogFile, ChatMessageItem, MessagesResponse } from "../api/client";
import { useToast } from "../components/ui/Toast";
import { formatBytes, formatDate as _formatDate, formatTime } from "../utils/format";

function formatDate(iso: string): string {
    return _formatDate(iso, true);
}

// ── 메인 페이지 ──────────────────────────────────────────

export default function ChatLogs() {
    const [selectedFile, setSelectedFile] = useState<ChatLogFile | null>(null);
    const toast = useToast();

    return (
        <div className="flex flex-col h-[calc(100vh-6rem)]">
            <div className="mb-6 shrink-0">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <MessageSquare className="w-6 h-6 text-cyan-500" />
                    Chat Logs
                </h2>
                <p className="text-zinc-400">녹화 중 수집된 채팅 아카이브를 좌우 분할 화면에서 조회합니다.</p>
            </div>

            <div className="flex flex-1 gap-6 min-h-0">
                {/* 왼쪽 패널: 채널 및 파일 목록 */}
                <div className="w-1/3 flex flex-col bg-zinc-900/30 border border-zinc-800 rounded-xl overflow-hidden shadow-sm">
                    <FileListView 
                        selectedFile={selectedFile} 
                        onSelect={setSelectedFile} 
                        toast={toast} 
                    />
                </div>

                {/* 오른쪽 패널: 메시지 뷰어 */}
                <div className="w-2/3 flex flex-col bg-zinc-900/30 border border-zinc-800 rounded-xl overflow-hidden shadow-sm">
                    {selectedFile === null ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-zinc-500">
                            <MessageSquare className="w-12 h-12 mb-4 opacity-30" />
                            <p className="text-sm">왼쪽 목록에서 채팅 로그 파일을 선택하세요.</p>
                        </div>
                    ) : (
                        <MessageViewer
                            file={selectedFile}
                            toast={toast}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}

// ── 파일 목록 뷰 ────────────────────────────────────────

interface FileListViewProps {
    selectedFile: ChatLogFile | null;
    onSelect: (file: ChatLogFile) => void;
    toast: ReturnType<typeof useToast>;
}

function FileListView({ selectedFile, onSelect, toast }: FileListViewProps) {
    const [files, setFiles] = useState<ChatLogFile[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadFiles();
    }, []);

    const loadFiles = async () => {
        setLoading(true);
        try {
            const data = await api.getChatFiles();
            setFiles(data);
        } catch {
            toast.error("채팅 로그 파일 목록을 불러오는 데 실패했습니다.");
        } finally {
            setLoading(false);
        }
    };

    const grouped = files.reduce<Record<string, ChatLogFile[]>>((acc, f) => {
        if (!acc[f.channel]) acc[f.channel] = [];
        acc[f.channel].push(f);
        return acc;
    }, {});

    if (loading) {
        return (
            <div className="flex flex-1 items-center justify-center text-zinc-500">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                <span className="text-sm">목록 불러오는 중...</span>
            </div>
        );
    }

    if (files.length === 0) {
        return (
            <div className="flex flex-col flex-1 items-center justify-center p-8 text-center">
                <MessageSquare className="w-8 h-8 text-zinc-700 mb-3" />
                <p className="text-zinc-400 font-medium text-sm mb-1">채팅 로그가 없습니다.</p>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700">
            {Object.entries(grouped).map(([channel, channelFiles]) => (
                <div key={channel} className="border-b border-zinc-800/50 last:border-0">
                    <div className="sticky top-0 z-10 flex items-center gap-2 px-4 py-2.5 bg-zinc-900/95 backdrop-blur-md border-b border-zinc-800">
                        <FolderOpen className="w-4 h-4 text-cyan-400" />
                        <span className="text-xs font-bold text-zinc-300 truncate">{channel}</span>
                        <span className="text-[10px] text-zinc-500 ml-auto">
                            {channelFiles.length}
                        </span>
                    </div>

                    <div className="divide-y divide-zinc-800/30">
                        {channelFiles.map((file) => {
                            const isSelected = selectedFile?.file_id === file.file_id;
                            return (
                                <div
                                    key={file.file_id}
                                    onClick={() => onSelect(file)}
                                    className={clsx(
                                        "flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors group",
                                        isSelected ? "bg-cyan-500/10 hover:bg-cyan-500/20" : "hover:bg-zinc-800/50"
                                    )}
                                >
                                    <FileText className={clsx(
                                        "w-4 h-4 shrink-0", 
                                        isSelected ? "text-cyan-400" : "text-zinc-500 group-hover:text-cyan-400/70"
                                    )} />

                                    <div className="flex-1 min-w-0">
                                        <p className={clsx(
                                            "text-xs font-medium truncate transition-colors",
                                            isSelected ? "text-white" : "text-zinc-300 group-hover:text-white"
                                        )}>
                                            {file.filename}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <p className="text-[10px] text-zinc-500">
                                                {formatDate(file.created_at)}
                                            </p>
                                            <span className="text-[10px] text-zinc-600 font-mono">
                                                {formatBytes(file.size_bytes)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
}

// ── 메시지 뷰어 ─────────────────────────────────────────

interface MessageViewerProps {
    file: ChatLogFile;
    toast: ReturnType<typeof useToast>;
}

function MessageViewer({ file, toast }: MessageViewerProps) {
    const [data, setData] = useState<MessagesResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);

    const [pendingSearch, setPendingSearch] = useState("");
    const [pendingNickname, setPendingNickname] = useState("");
    const [appliedSearch, setAppliedSearch] = useState("");
    const [appliedNickname, setAppliedNickname] = useState("");

    const LIMIT = 100;

    const loadMessages = useCallback(async (
        targetPage: number,
        search: string,
        nickname: string,
    ) => {
        setLoading(true);
        try {
            const res = await api.getChatMessages(file.file_id, {
                page: targetPage,
                limit: LIMIT,
                search: search || undefined,
                nickname: nickname || undefined,
            });
            setData(res);
        } catch {
            toast.error("메시지를 불러오는 데 실패했습니다.");
        } finally {
            setLoading(false);
        }
    }, [file.file_id, toast]);

    useEffect(() => {
        loadMessages(page, appliedSearch, appliedNickname);
    }, [page, appliedSearch, appliedNickname, loadMessages]);

    // 파일이 변경되면 필터와 페이지 초기화
    useEffect(() => {
        setPage(1);
        setPendingSearch("");
        setPendingNickname("");
        setAppliedSearch("");
        setAppliedNickname("");
    }, [file.file_id]);

    const handleSearch = () => {
        setAppliedSearch(pendingSearch);
        setAppliedNickname(pendingNickname);
        setPage(1);
    };

    const handleClearSearch = () => {
        setPendingSearch("");
        setPendingNickname("");
        setAppliedSearch("");
        setAppliedNickname("");
        setPage(1);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") handleSearch();
    };

    const hasFilter = appliedSearch || appliedNickname;

    return (
        <div className="flex flex-col h-full bg-zinc-950/20">
            {/* 뷰어 헤더 */}
            <div className="flex items-center gap-3 p-4 border-b border-zinc-800 bg-zinc-900/50 shrink-0">
                <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-white truncate">{file.filename}</h3>
                    <p className="text-[11px] text-zinc-500 mt-0.5">{file.message_count.toLocaleString()}개 메시지</p>
                </div>
                <a
                    href={api.getChatDownloadUrl(file.file_id)}
                    download={file.filename}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-cyan-400 hover:bg-zinc-800 border border-zinc-800 hover:border-cyan-700 transition-colors shrink-0"
                    title="JSONL 파일 다운로드"
                >
                    <Download className="w-3.5 h-3.5" />
                    다운로드
                </a>
            </div>

            {/* 검색 툴바 */}
            <div className="p-3 border-b border-zinc-800 bg-zinc-900/30 shrink-0 flex flex-wrap gap-2">
                <div className="flex items-center gap-2 w-full sm:w-auto flex-1">
                    <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                        <input
                            type="text"
                            value={pendingSearch}
                            onChange={(e) => setPendingSearch(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="내용 검색..."
                            className="w-full pl-8 pr-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-md text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500"
                        />
                    </div>
                    <div className="w-1/3 min-w-[100px]">
                        <input
                            type="text"
                            value={pendingNickname}
                            onChange={(e) => setPendingNickname(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="닉네임..."
                            className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-md text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500"
                        />
                    </div>
                    <button
                        onClick={handleSearch}
                        className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs rounded-md font-medium transition-colors shrink-0"
                    >
                        적용
                    </button>
                    {hasFilter && (
                        <button
                            onClick={handleClearSearch}
                            className="p-1.5 text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-md transition-colors shrink-0"
                            title="검색 초기화"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            </div>

            {/* 본문 메시지 리스트 */}
            <div className="flex-1 overflow-y-auto bg-zinc-950/40 relative min-h-0">
                {loading && (
                    <div className="absolute inset-0 z-10 bg-zinc-950/60 backdrop-blur-[1px] flex items-center justify-center text-zinc-400">
                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                        <span className="text-sm">불러오는 중...</span>
                    </div>
                )}
                
                {!data || data.messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-zinc-600">
                        <MessageSquare className="w-8 h-8 mb-3 opacity-20" />
                        <p className="text-sm">{hasFilter ? "검색 결과가 없습니다." : "메시지가 없습니다."}</p>
                    </div>
                ) : (
                    <div className="divide-y divide-zinc-800/40 py-2">
                        {data.messages.map((msg, idx) => (
                            <MessageRow key={idx} msg={msg} />
                        ))}
                    </div>
                )}
            </div>

            {/* 꼬리 (페이지네이션) */}
            {data && data.total > 0 && (
                <div className="flex items-center justify-between px-4 py-2 border-t border-zinc-800 bg-zinc-900/50 shrink-0">
                    <span className="text-[10px] text-zinc-500">
                        총 <span className="text-zinc-300">{data.total.toLocaleString()}</span>개
                    </span>
                    <div className="flex items-center gap-1.5">
                        <button
                            disabled={page <= 1}
                            onClick={() => setPage((p) => p - 1)}
                            className="p-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-400 disabled:opacity-30 transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-[10px] text-zinc-400 min-w-[50px] text-center font-mono">
                            {page} / {Math.ceil(data.total / LIMIT) || 1}
                        </span>
                        <button
                            disabled={!data.has_next}
                            onClick={() => setPage((p) => p + 1)}
                            className="p-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-400 disabled:opacity-30 transition-colors"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── 메시지 행 ────────────────────────────────────────────

function MessageRow({ msg }: { msg: ChatMessageItem }) {
    return (
        <div className="flex items-start gap-3 px-4 py-1.5 hover:bg-white/[0.02] transition-colors">
            {/* 타임스탬프 */}
            <span className="text-[10px] text-zinc-600 font-mono shrink-0 pt-[3px] w-[64px]">
                {formatTime(msg.timestamp)}
            </span>

            {/* 내용 */}
            <div className="flex-1 min-w-0 flex flex-wrap items-baseline gap-1.5 leading-snug">
                <span className="text-[11px] font-semibold text-cyan-300 shrink-0">{msg.nickname}</span>
                <span className="text-[13px] text-zinc-300 break-words">{msg.message}</span>
            </div>
        </div>
    );
}
