import { useState } from "react";
import {
    Download,
    Play,
    AlertCircle,
    CheckCircle,
    Loader2,
    Pause,
    Square,
    FileVideo,
    Clock,
    RotateCw,
    GripVertical,
    FolderOpen,
    Trash2,
} from "lucide-react";
import { useVod } from "../contexts/VodContext";
import { api, VodTask } from "../api/client";
import { useToast } from "../components/ui/Toast";
import { useConfirm } from "../components/ui/ConfirmModal";
import { clsx } from "clsx";
import { formatDuration } from "../utils/format";
import { getErrorMessage } from "../utils/error";

export default function VodDownload() {
    const { tasks, activeCount, addTask, cancelTask, pauseTask, resumeTask, retryTask, clearCompleted, openFileLocation } = useVod();
    const [url, setUrl] = useState("");
    const [loading, setLoading] = useState(false);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const toast = useToast();
    const confirm = useConfirm();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!url) return;

        setLoading(true);

        try {
            await addTask(url);
            setUrl("");
            toast.success("다운로드가 시작되었습니다.");
        } catch (err: unknown) {
            toast.error(getErrorMessage(err, "다운로드 시작에 실패했습니다."));
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = async (taskId: string, title: string) => {
        const ok = await confirm({
            title: "다운로드 취소",
            message: `'${title}' 다운로드를 취소할까요?`,
            confirmText: "중단",
            variant: "danger",
        });
        if (ok) cancelTask(taskId);
    };

    const handleRetry = async (taskId: string, title: string) => {
        const ok = await confirm({
            title: "재다운로드",
            message: `'${title}'을(를) 다시 다운로드할까요?`,
            confirmText: "재다운로드",
        });
        if (ok) retryTask(taskId);
    };

    const handleClearCompleted = async () => {
        const ok = await confirm({
            title: "완료된 작업 정리",
            message: "완료 및 오류 상태의 작업을 모두 삭제할까요?",
            confirmText: "정리",
            variant: "danger",
        });
        if (ok) clearCompleted();
    };

    const handleDragStart = (index: number) => {
        setDraggedIndex(index);
    };

    const handleDragOver = (e: React.DragEvent, _index: number) => {
        e.preventDefault();
    };

    const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === dropIndex) {
            setDraggedIndex(null);
            return;
        }

        const newTasks = [...tasks];
        const [draggedTask] = newTasks.splice(draggedIndex, 1);
        newTasks.splice(dropIndex, 0, draggedTask);

        try {
            const taskIds = newTasks.map((t) => t.task_id);
            await api.reorderVodTasks(taskIds);
        } catch {
            toast.error("작업 순서 변경에 실패했습니다.");
        }

        setDraggedIndex(null);
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Download className="w-6 h-6 text-green-500" />
                    VOD Downloader
                </h2>
                <p className="text-zinc-400">
                    활성 다운로드: <span className="text-green-500 font-bold">{activeCount}</span>
                </p>
            </div>

            {/* URL 입력 폼 */}
            <form
                onSubmit={handleSubmit}
                className="bg-zinc-900/50 p-6 rounded-xl border border-zinc-800 space-y-4"
            >
                <label className="block text-sm font-medium text-zinc-300">
                    영상 URL
                </label>
                <div className="flex gap-2">
                    <input
                        type="text"
                        className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-green-500/50"
                        placeholder="치지직 VOD/클립 또는 유튜브 등 (https://...)"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                    />
                    <button
                        type="submit"
                        disabled={loading || !url}
                        className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-lg font-bold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                추가 중...
                            </>
                        ) : (
                            <>
                                <Download className="w-5 h-5" />
                                다운로드 시작
                            </>
                        )}
                    </button>
                </div>

                <div className="flex flex-wrap gap-3 text-xs text-zinc-500">
                    <span className="flex items-center">
                        <CheckCircle className="w-3 h-3 mr-1 text-green-500" /> 1080p60 지원
                    </span>
                    <span className="flex items-center">
                        <CheckCircle className="w-3 h-3 mr-1 text-green-500" /> MP4 자동 리먹싱
                    </span>
                    <span className="flex items-center">
                        <CheckCircle className="w-3 h-3 mr-1 text-green-500" /> 클립 다운로드 지원
                    </span>
                    <span className="flex items-center">
                        <CheckCircle className="w-3 h-3 mr-1 text-green-500" /> 다중 다운로드 지원
                    </span>
                </div>
            </form>

            {/* 다운로드 목록 */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        다운로드 목록
                        <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">
                            {tasks.length}
                        </span>
                    </h3>
                    {tasks.some(t => t.state === "completed" || t.state === "error") && (
                        <button
                            onClick={handleClearCompleted}
                            className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-lg text-sm border border-zinc-700 transition-colors"
                        >
                            <Trash2 className="w-4 h-4" />
                            완료된 작업 정리
                        </button>
                    )}
                </div>

                {tasks.length === 0 ? (
                    <div className="text-center py-20 bg-zinc-900/30 rounded-xl border border-zinc-800 border-dashed">
                        <FileVideo className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
                        <p className="text-zinc-500 font-medium">활성 다운로드 없음</p>
                        <p className="text-sm text-zinc-600">위에 URL을 입력하여 시작하세요</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {tasks.map((task, index) => (
                            <div
                                key={task.task_id}
                                draggable
                                onDragStart={() => handleDragStart(index)}
                                onDragOver={(e) => handleDragOver(e, index)}
                                onDrop={(e) => handleDrop(e, index)}
                                className={clsx(
                                    "transition-opacity",
                                    draggedIndex === index && "opacity-50"
                                )}
                            >
                                <TaskCard
                                    task={task}
                                    onCancel={() => handleCancel(task.task_id, task.title)}
                                    onPause={() => pauseTask(task.task_id)}
                                    onResume={() => resumeTask(task.task_id)}
                                    onRetry={() => handleRetry(task.task_id, task.title)}
                                    onOpenLocation={() => openFileLocation(task.task_id)}
                                />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// ── 다운로드 태스크 카드 ─────────────────────────────

interface TaskCardProps {
    task: VodTask;
    onCancel: () => void;
    onPause: () => void;
    onResume: () => void;
    onRetry: () => void;
    onOpenLocation: () => void;
}

function TaskCard({ task, onCancel, onPause, onResume, onRetry, onOpenLocation }: TaskCardProps) {
    const statusBadgeClass =
        task.state === "completed"
            ? "bg-green-500/10 text-green-500"
            : task.state === "downloading"
                ? "bg-blue-500/10 text-blue-500"
                : task.state === "paused"
                    ? "bg-yellow-500/10 text-yellow-500"
                    : task.state === "error"
                        ? "bg-red-500/10 text-red-500"
                        : "bg-zinc-800 text-zinc-400";

    const statusLabels: Record<string, string> = {
        idle: "대기",
        downloading: "다운로드 중",
        paused: "일시정지",
        completed: "완료",
        error: "오류",
        cancelling: "취소 중",
    };

    const barColorClass =
        task.state === "completed"
            ? "bg-green-500"
            : task.state === "error"
                ? "bg-red-500"
                : task.state === "paused"
                    ? "bg-yellow-500"
                    : "bg-blue-500";

    return (
        <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl flex items-start gap-4 hover:border-zinc-700 transition-colors cursor-move">
            {/* 드래그 핸들 */}
            <div className="flex items-center justify-center text-zinc-600 hover:text-zinc-400 cursor-grab active:cursor-grabbing pt-8">
                <GripVertical className="w-5 h-5" />
            </div>

            {/* 상태 아이콘 영역 */}
            <div className="w-24 h-20 bg-zinc-950 rounded-lg flex items-center justify-center flex-shrink-0">
                {task.state === "completed" && <CheckCircle className="text-green-500 w-8 h-8" />}
                {task.state === "downloading" && (
                    <div className="text-white font-mono font-bold text-lg">
                        {Math.round(task.progress)}%
                    </div>
                )}
                {task.state === "paused" && <Pause className="text-yellow-500 w-8 h-8" />}
                {task.state === "error" && <AlertCircle className="text-red-500 w-8 h-8" />}
                {task.state === "idle" && <Clock className="text-zinc-500 w-8 h-8" />}
                {task.state === "cancelling" && (
                    <Loader2 className="text-red-500 w-6 h-6 animate-spin" />
                )}
            </div>

            <div className="flex-1 min-w-0 w-full space-y-2">
                <div className="flex justify-between items-start gap-2">
                    <h4 className="font-bold text-white truncate text-sm flex-1">
                        {task.title}
                    </h4>
                    <span
                        className={clsx(
                            "text-xs font-bold px-2 py-1 rounded capitalize whitespace-nowrap",
                            statusBadgeClass
                        )}
                    >
                        {statusLabels[task.state] || task.state}
                    </span>
                </div>

                <div className="text-xs text-zinc-500 font-mono flex flex-wrap gap-x-4">
                    <span>화질: {task.quality}</span>
                    {task.error_message && (
                        <span className="text-red-400">오류: {task.error_message}</span>
                    )}
                </div>

                {/* 진행률 바 */}
                <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                    <div
                        className={clsx("h-full transition-all duration-300", barColorClass)}
                        style={{ width: `${task.progress}%` }}
                    />
                </div>

                {/* 다운로드 통계 (다운로드 중일 때만 표시) */}
                {task.state === "downloading" && task.total_bytes > 0 && (
                    <div className="text-xs text-zinc-400 font-mono flex flex-wrap gap-x-4 gap-y-1">
                        <span>
                            속도: <span className="text-green-400">{task.download_speed.toFixed(2)} MB/s</span>
                        </span>
                        <span>
                            용량: {(task.downloaded_bytes / (1024 * 1024)).toFixed(1)} MB / {(task.total_bytes / (1024 * 1024)).toFixed(1)} MB
                        </span>
                        {task.eta_seconds > 0 && (
                            <span>
                                남은 시간: {formatDuration(task.eta_seconds, "eta")}
                            </span>
                        )}
                    </div>
                )}

                {/* 제어 버튼 */}
                {(task.state === "downloading" || task.state === "paused") && (
                    <div className="flex gap-2">
                        {task.state === "downloading" ? (
                            <button
                                onClick={onPause}
                                className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-yellow-400 rounded-lg transition-colors flex items-center gap-1 text-xs"
                                title="일시정지"
                            >
                                <Pause className="w-3 h-3" />
                                <span>일시정지</span>
                            </button>
                        ) : (
                            <button
                                onClick={onResume}
                                className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-green-400 rounded-lg transition-colors flex items-center gap-1 text-xs"
                                title="재개"
                            >
                                <Play className="w-3 h-3" />
                                <span>재개</span>
                            </button>
                        )}
                        <button
                            onClick={onCancel}
                            className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-red-400 rounded-lg transition-colors flex items-center gap-1 text-xs"
                            title="취소"
                        >
                            <Square className="w-3 h-3" />
                            <span>취소</span>
                        </button>
                    </div>
                )}

                {/* 재다운로드 버튼 (완료/에러 상태일 때만 표시) */}
                {(task.state === "completed" || task.state === "error") && (
                    <div className="flex gap-2">
                        <button
                            onClick={onRetry}
                            className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-blue-400 rounded-lg transition-colors flex items-center gap-1 text-xs"
                            title="재다운로드"
                        >
                            <RotateCw className="w-3 h-3" />
                            <span>재다운로드</span>
                        </button>
                        {task.state === "completed" && task.output_path && (
                            <button
                                onClick={onOpenLocation}
                                className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-green-400 rounded-lg transition-colors flex items-center gap-1 text-xs"
                                title="파일 위치 열기"
                            >
                                <FolderOpen className="w-3 h-3" />
                                <span>폴더 열기</span>
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
