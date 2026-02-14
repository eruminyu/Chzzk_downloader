import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { api, VodTask } from "../api/client";

export interface VodContextType {
    tasks: VodTask[];
    activeCount: number;
    queuedCount: number;
    totalCount: number;
    addTask: (url: string, quality?: string) => Promise<string>;
    cancelTask: (taskId: string) => Promise<void>;
    pauseTask: (taskId: string) => Promise<void>;
    resumeTask: (taskId: string) => Promise<void>;
    retryTask: (taskId: string) => Promise<string>;
    clearCompleted: () => Promise<void>;
    openFileLocation: (taskId: string) => Promise<void>;
    refreshTasks: () => Promise<void>;
}

const VodContext = createContext<VodContextType | null>(null);

export function VodProvider({ children }: { children: ReactNode }) {
    const [tasks, setTasks] = useState<VodTask[]>([]);
    const [activeCount, setActiveCount] = useState(0);
    const [queuedCount, setQueuedCount] = useState(0);
    const [totalCount, setTotalCount] = useState(0);

    // 전역 폴링 (컴포넌트 언마운트와 무관하게 지속)
    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const data = await api.getAllVodStatus();
                setTasks(data.tasks);
                setActiveCount(data.active_count);
                setQueuedCount(data.queued_count);
                setTotalCount(data.total_count);
            } catch (e) {
                console.error("VOD 상태 조회 실패:", e);
            }
        };

        // 초기 로드
        fetchStatus();

        // 2초마다 폴링
        const interval = setInterval(fetchStatus, 2000);

        return () => clearInterval(interval);
    }, []);

    const addTask = async (url: string, quality = "best") => {
        const { task_id } = await api.downloadVod(url, quality);
        // 즉시 상태 갱신
        await refreshTasks();
        return task_id;
    };

    const cancelTask = async (taskId: string) => {
        await api.cancelVodDownload(taskId);
        await refreshTasks();
    };

    const pauseTask = async (taskId: string) => {
        await api.pauseVodDownload(taskId);
        await refreshTasks();
    };

    const resumeTask = async (taskId: string) => {
        await api.resumeVodDownload(taskId);
        await refreshTasks();
    };

    const retryTask = async (taskId: string) => {
        const { new_task_id } = await api.retryVodDownload(taskId);
        await refreshTasks();
        return new_task_id;
    };

    const refreshTasks = async () => {
        try {
            const data = await api.getAllVodStatus();
            setTasks(data.tasks);
            setActiveCount(data.active_count);
            setQueuedCount(data.queued_count);
            setTotalCount(data.total_count);
        } catch (e) {
            console.error("VOD 상태 갱신 실패:", e);
        }
    };

    const clearCompleted = async () => {
        await api.clearCompletedVodTasks();
        await refreshTasks();
    };

    const openFileLocation = async (taskId: string) => {
        try {
            await api.openVodFileLocation(taskId);
        } catch (e: any) {
            alert(e.response?.data?.detail || "파일 위치를 열 수 없습니다.");
        }
    };

    return (
        <VodContext.Provider
            value={{
                tasks,
                activeCount,
                queuedCount,
                totalCount,
                addTask,
                cancelTask,
                pauseTask,
                resumeTask,
                retryTask,
                clearCompleted,
                openFileLocation,
                refreshTasks,
            }}
        >
            {children}
        </VodContext.Provider>
    );
}

export function useVod() {
    const context = useContext(VodContext);
    if (!context) {
        throw new Error("useVod는 VodProvider 내부에서만 사용할 수 있습니다.");
    }
    return context;
}
