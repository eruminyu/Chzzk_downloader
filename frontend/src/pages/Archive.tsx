import { useState } from "react";
import { Download, Loader2, Radio } from "lucide-react";
import { useVod } from "../contexts/VodContext";
import { useToast } from "../components/ui/Toast";
import { getErrorMessage } from "../utils/error";

export default function ArchivePage() {
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
            toast.success("X Spaces 다운로드가 시작되었습니다.");
        } catch (err: unknown) {
            toast.error(getErrorMessage(err, "다운로드 시작에 실패했습니다."));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* 헤더 */}
            <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Radio className="w-6 h-6 text-cyan-400" />
                    X Spaces Downloader
                </h2>
                <p className="text-zinc-400 text-sm mt-1">
                    캡처된 X Spaces master URL로 오디오를 다운로드합니다.
                </p>
            </div>

            {/* 입력 폼 */}
            <div className="bg-zinc-900/50 p-6 rounded-xl border border-zinc-800 space-y-4">
                <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-1">
                        X Spaces URL
                    </label>
                    <p className="text-xs text-zinc-500 mb-3">
                        Live Dashboard에서 자동 캡처된 master_playlist.m3u8 URL 또는 x.com/i/spaces 링크를 입력하세요.
                    </p>
                </div>

                <form onSubmit={handleDownload} className="flex gap-2">
                    <input
                        type="text"
                        className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 text-sm"
                        placeholder="https://.../master_playlist.m3u8  또는  https://x.com/i/spaces/..."
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                    />
                    <button
                        type="submit"
                        disabled={loading || !url.trim()}
                        className="bg-cyan-600 hover:bg-cyan-500 text-white px-5 py-2 rounded-lg font-bold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shrink-0"
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
                        <li>master_playlist.m3u8 URL은 Space 종료 후 약 30일간 유효합니다.</li>
                        <li>비공개 Space는 Settings에서 X 쿠키 파일을 설정하세요.</li>
                        <li>다운로드 진행 상황은 <span className="text-white">VOD Downloader</span> 탭에서 확인하세요.</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
