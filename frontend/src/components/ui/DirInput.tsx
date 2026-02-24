import { useState, useEffect, useCallback } from "react";
import { Folder, FolderOpen, HardDrive, ArrowLeft, ChevronRight, X, Loader2 } from "lucide-react";
import { api, BrowseDirsResponse, DirEntry } from "../../api/client";

// ── DirBrowserModal ──────────────────────────────────────

interface DirBrowserModalProps {
    initialPath?: string;
    onSelect: (path: string) => void;
    onClose: () => void;
}

export function DirBrowserModal({ initialPath, onSelect, onClose }: DirBrowserModalProps) {
    const [data, setData] = useState<BrowseDirsResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const navigate = useCallback(async (path?: string) => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.browseDirs(path);
            setData(res);
        } catch {
            setError("디렉토리를 불러올 수 없습니다.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        navigate(initialPath || undefined);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [onClose]);

    const isDrive = (path: string) => /^[A-Z]:\\$/.test(path);

    return (
        <div
            className="fixed inset-0 z-[9998] flex items-center justify-center"
            onClick={onClose}
        >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

            <div
                className="relative bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl
                           w-full max-w-lg mx-4 flex flex-col"
                style={{ maxHeight: "70vh" }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
                    <h3 className="text-white font-semibold text-base flex items-center gap-2">
                        <Folder className="w-4 h-4 text-[#00FFA3]" />
                        폴더 선택
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Current Path */}
                <div className="px-5 py-2 bg-zinc-950 border-b border-zinc-800">
                    <p className="text-xs text-zinc-400 font-mono truncate">
                        {data?.current || "드라이브 선택"}
                    </p>
                </div>

                {/* Dir List */}
                <div className="flex-1 overflow-y-auto py-1 min-h-0">
                    {loading && (
                        <div className="flex items-center justify-center py-10">
                            <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
                        </div>
                    )}

                    {error && (
                        <p className="text-red-400 text-sm text-center py-8">{error}</p>
                    )}

                    {!loading && !error && data && (
                        <>
                            {/* 상위 폴더로 */}
                            {data.parent !== null && (
                                <button
                                    onClick={() => navigate(data.parent ?? undefined)}
                                    className="w-full flex items-center gap-3 px-5 py-2.5 text-left
                                               text-zinc-400 hover:bg-zinc-800 hover:text-white
                                               transition-colors text-sm"
                                >
                                    <ArrowLeft className="w-4 h-4 shrink-0" />
                                    <span className="font-mono">..</span>
                                </button>
                            )}

                            {data.dirs.length === 0 && (
                                <p className="text-zinc-600 text-sm text-center py-8">
                                    하위 폴더 없음
                                </p>
                            )}

                            {data.dirs.map((dir: DirEntry) => (
                                <button
                                    key={dir.path}
                                    onClick={() => navigate(dir.path)}
                                    className="w-full flex items-center gap-3 px-5 py-2.5 text-left
                                               text-zinc-300 hover:bg-zinc-800 hover:text-white
                                               transition-colors text-sm group"
                                >
                                    {isDrive(dir.path) ? (
                                        <HardDrive className="w-4 h-4 shrink-0 text-zinc-500 group-hover:text-[#00FFA3] transition-colors" />
                                    ) : (
                                        <Folder className="w-4 h-4 shrink-0 text-zinc-500 group-hover:text-[#00FFA3] transition-colors" />
                                    )}
                                    <span className="flex-1 truncate">{dir.name}</span>
                                    <ChevronRight className="w-3 h-3 text-zinc-600 group-hover:text-zinc-400 shrink-0" />
                                </button>
                            ))}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="px-5 py-4 border-t border-zinc-800 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2 rounded-lg text-sm font-medium text-zinc-300
                                   bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 transition-colors"
                    >
                        취소
                    </button>
                    <button
                        onClick={() => {
                            if (data?.current) {
                                onSelect(data.current);
                                onClose();
                            }
                        }}
                        disabled={!data?.current}
                        className="flex-1 py-2 rounded-lg text-sm font-bold text-black
                                   bg-[#00FFA3] hover:bg-[#00D689] disabled:bg-zinc-700
                                   disabled:text-zinc-500 transition-colors"
                    >
                        이 폴더 선택
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── DirInput ─────────────────────────────────────────────

interface DirInputProps {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    focusBorderColor?: string;
}

export function DirInput({
    value,
    onChange,
    placeholder = "경로 입력...",
    focusBorderColor = "focus:border-[#00FFA3]",
}: DirInputProps) {
    const [showBrowser, setShowBrowser] = useState(false);

    return (
        <>
            <div className="flex gap-2">
                <input
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className={`flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2
                                text-white font-mono text-sm focus:outline-none ${focusBorderColor}`}
                    placeholder={placeholder}
                />
                <button
                    type="button"
                    onClick={() => setShowBrowser(true)}
                    className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700
                               rounded-lg text-zinc-400 hover:text-white transition-colors
                               flex items-center gap-1.5 text-sm shrink-0"
                    title="폴더 찾아보기"
                >
                    <FolderOpen className="w-4 h-4" />
                    <span className="hidden sm:inline">찾아보기</span>
                </button>
            </div>

            {showBrowser && (
                <DirBrowserModal
                    initialPath={value || undefined}
                    onSelect={onChange}
                    onClose={() => setShowBrowser(false)}
                />
            )}
        </>
    );
}
