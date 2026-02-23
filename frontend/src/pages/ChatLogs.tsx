import { useState, useEffect, useCallback } from "react";
import {
    MessageSquare,
    ArrowLeft,
    Search,
    Download,
    FileText,
    Loader2,
    X,
    ChevronLeft,
    ChevronRight,
    FolderOpen,
} from "lucide-react";
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
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <MessageSquare className="w-6 h-6 text-cyan-500" />
                    Chat Logs
                </h2>
                <p className="text-zinc-400">녹화 중 수집된 채팅 아카이브를 조회합니다.</p>
            </div>

            {selectedFile === null ? (
                <FileListView onSelect={setSelectedFile} toast={toast} />
            ) : (
                <MessageViewer
                    file={selectedFile}
                    onBack={() => setSelectedFile(null)}
                    toast={toast}
                />
            )}
        </div>
    );
}

// ── 파일 목록 뷰 ────────────────────────────────────────

interface FileListViewProps {
    onSelect: (file: ChatLogFile) => void;
    toast: ReturnType<typeof useToast>;
}

function FileListView({ onSelect, toast }: FileListViewProps) {
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

    // 채널별 그룹화
    const grouped = files.reduce<Record<string, ChatLogFile[]>>((acc, f) => {
        if (!acc[f.channel]) acc[f.channel] = [];
        acc[f.channel].push(f);
        return acc;
    }, {});

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20 text-zinc-500">
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                파일 목록 불러오는 중...
            </div>
        );
    }

    if (files.length === 0) {
        return (
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-12 text-center">
                <MessageSquare className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                <p className="text-zinc-400 font-medium mb-1">채팅 로그가 없습니다.</p>
                <p className="text-zinc-600 text-sm">
                    Settings에서 채팅 아카이빙을 활성화하면 녹화 시 채팅이 자동 저장됩니다.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {Object.entries(grouped).map(([channel, channelFiles]) => (
                <div key={channel} className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
                    {/* 채널 헤더 */}
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800 bg-zinc-900/80">
                        <FolderOpen className="w-4 h-4 text-cyan-400" />
                        <span className="text-sm font-semibold text-zinc-200">{channel}</span>
                        <span className="text-xs text-zinc-500 ml-1">
                            ({channelFiles.length}개 파일)
                        </span>
                    </div>

                    {/* 파일 목록 */}
                    <div className="divide-y divide-zinc-800/50">
                        {channelFiles.map((file) => (
                            <div
                                key={file.file_id}
                                onClick={() => onSelect(file)}
                                className="flex items-center gap-4 px-4 py-3 hover:bg-zinc-800/50 cursor-pointer transition-colors group"
                            >
                                <FileText className="w-4 h-4 text-cyan-400 shrink-0" />

                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-zinc-200 truncate group-hover:text-white transition-colors">
                                        {file.filename}
                                    </p>
                                    <p className="text-xs text-zinc-500 mt-0.5">
                                        {formatDate(file.created_at)}
                                    </p>
                                </div>

                                <div className="text-xs text-zinc-400 font-mono shrink-0 text-right">
                                    <div>{file.message_count.toLocaleString()}개</div>
                                    <div className="text-zinc-600">{formatBytes(file.size_bytes)}</div>
                                </div>

                                {/* 다운로드 버튼 — 클릭 전파 차단으로 뷰어 전환 방지 */}
                                <a
                                    href={api.getChatDownloadUrl(file.file_id)}
                                    download={file.filename}
                                    onClick={(e) => e.stopPropagation()}
                                    className="p-2 rounded-lg text-zinc-600 hover:text-cyan-400 hover:bg-zinc-700 transition-colors shrink-0"
                                    title="JSONL 파일 다운로드"
                                >
                                    <Download className="w-4 h-4" />
                                </a>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

// ── 메시지 뷰어 ─────────────────────────────────────────

interface MessageViewerProps {
    file: ChatLogFile;
    onBack: () => void;
    toast: ReturnType<typeof useToast>;
}

function MessageViewer({ file, onBack, toast }: MessageViewerProps) {
    const [data, setData] = useState<MessagesResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);

    // 검색 입력 (Enter/버튼 트리거 전까지 미적용)
    const [pendingSearch, setPendingSearch] = useState("");
    const [pendingNickname, setPendingNickname] = useState("");

    // 실제 적용된 필터
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
        <div className="space-y-4">
            {/* 헤더 */}
            <div className="flex items-center gap-3">
                <button
                    onClick={onBack}
                    className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                    title="파일 목록으로 돌아가기"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="min-w-0 flex-1">
                    <h3 className="text-base font-semibold text-white truncate">{file.filename}</h3>
                    <p className="text-xs text-zinc-500">{file.channel} · {file.message_count.toLocaleString()}개 메시지</p>
                </div>
                <a
                    href={api.getChatDownloadUrl(file.file_id)}
                    download={file.filename}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-zinc-400 hover:text-cyan-400 hover:bg-zinc-800 border border-zinc-700 hover:border-cyan-700 transition-colors shrink-0"
                    title="JSONL 파일 다운로드"
                >
                    <Download className="w-4 h-4" />
                    다운로드
                </a>
            </div>

            {/* 검색 영역 */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
                <div className="flex flex-wrap gap-3 items-end">
                    <div className="flex-1 min-w-[160px] space-y-1">
                        <label className="text-xs text-zinc-500">키워드</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                            <input
                                type="text"
                                value={pendingSearch}
                                onChange={(e) => setPendingSearch(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="메시지 내용 검색..."
                                className="w-full pl-8 pr-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500"
                            />
                        </div>
                    </div>

                    <div className="flex-1 min-w-[160px] space-y-1">
                        <label className="text-xs text-zinc-500">닉네임</label>
                        <input
                            type="text"
                            value={pendingNickname}
                            onChange={(e) => setPendingNickname(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="닉네임 필터..."
                            className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500"
                        />
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={handleSearch}
                            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-sm rounded-lg font-medium transition-colors flex items-center gap-1.5"
                        >
                            <Search className="w-3.5 h-3.5" />
                            검색
                        </button>
                        {hasFilter && (
                            <button
                                onClick={handleClearSearch}
                                className="px-3 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-sm rounded-lg transition-colors"
                                title="검색 초기화"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>

                {hasFilter && (
                    <p className="mt-2 text-xs text-cyan-400">
                        필터 적용 중:
                        {appliedSearch && <span className="ml-1 font-mono">키워드="{appliedSearch}"</span>}
                        {appliedNickname && <span className="ml-1 font-mono">닉네임="{appliedNickname}"</span>}
                    </p>
                )}
            </div>

            {/* 메시지 영역 */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-16 text-zinc-500">
                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                        메시지 불러오는 중...
                    </div>
                ) : !data || data.messages.length === 0 ? (
                    <div className="py-16 text-center text-zinc-500">
                        <MessageSquare className="w-8 h-8 mx-auto mb-3 opacity-30" />
                        <p>{hasFilter ? "검색 결과가 없습니다." : "메시지가 없습니다."}</p>
                    </div>
                ) : (
                    <>
                        {/* 메시지 목록 */}
                        <div className="divide-y divide-zinc-800/40 max-h-[600px] overflow-y-auto">
                            {data.messages.map((msg, idx) => (
                                <MessageRow key={idx} msg={msg} />
                            ))}
                        </div>

                        {/* 페이지네이션 */}
                        <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-800">
                            <span className="text-xs text-zinc-500">
                                총 <span className="text-zinc-300 font-medium">{data.total.toLocaleString()}</span>개 메시지
                                {hasFilter && " (필터 적용)"}
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    disabled={page <= 1}
                                    onClick={() => setPage((p) => p - 1)}
                                    className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <span className="text-xs text-zinc-400 min-w-[60px] text-center">
                                    {page} / {Math.ceil(data.total / LIMIT) || 1}
                                </span>
                                <button
                                    disabled={!data.has_next}
                                    onClick={() => setPage((p) => p + 1)}
                                    className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

// ── 메시지 행 ────────────────────────────────────────────

function MessageRow({ msg }: { msg: ChatMessageItem }) {
    return (
        <div className="flex items-start gap-3 px-4 py-2.5 hover:bg-zinc-800/30 transition-colors">
            {/* 타임스탬프 */}
            <span className="text-[11px] text-zinc-600 font-mono shrink-0 pt-0.5 w-[72px]">
                {formatTime(msg.timestamp)}
            </span>

            {/* 내용 */}
            <div className="flex-1 min-w-0 flex flex-wrap items-baseline gap-1.5">
                <span className="text-xs font-semibold text-cyan-300 shrink-0">{msg.nickname}</span>
                <span className="text-sm text-zinc-200 break-words">{msg.message}</span>
            </div>
        </div>
    );
}
