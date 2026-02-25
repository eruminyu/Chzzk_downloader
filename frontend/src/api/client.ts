import axios from "axios";

const API_BASE_URL = "http://localhost:8000/api";

export const client = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        "Content-Type": "application/json",
    },
});

// ── Types ───────────────────────────────────────────────

export interface Channel {
    channel_id: string;
    auto_record: boolean;
    is_live: boolean;
    channel_name?: string;
    title?: string;
    category?: string;
    viewer_count?: number;
    thumbnail_url?: string;
    profile_image_url?: string;
    recording?: {
        is_recording: boolean;
        state: string;
        duration_seconds: number;
        output_path: string | null;
        start_time: string | null;
        // 녹화 통계
        file_size_bytes: number;
        download_speed: number;  // MB/s
        bitrate: number;  // kbps
    };
    chat_archiving?: {
        is_running: boolean;
        message_count: number;
        output_path: string;
    };
}

export interface VodInfo {
    title: string;
    duration: number;
    thumbnail: string;
    uploader: string;
    formatted_duration?: string;
}

export interface VodTask {
    task_id: string;
    url: string;
    title: string;
    state: "idle" | "downloading" | "paused" | "completed" | "error" | "cancelling";
    progress: number;
    quality: string;
    output_path: string | null;
    error_message?: string;
    created_at: string;
    started_at: string | null;
    completed_at: string | null;
    // 다운로드 통계
    download_speed: number;  // MB/s
    downloaded_bytes: number;
    total_bytes: number;
    eta_seconds: number;
}

export interface VodStatusResponse {
    tasks: VodTask[];
    active_count: number;
    queued_count: number;
    total_count: number;
}

export interface Settings {
    app_name: string;
    download_dir: string;
    ffmpeg_path: string;
    monitor_interval: number;
    host: string;
    port: number;
    authenticated: boolean;
    discord_bot_configured: boolean;

    keep_download_parts: boolean;
    max_record_retries: number;

    output_format: string;
    recording_quality: string;

    // VOD 설정
    vod_max_concurrent: number;
    vod_default_quality: string;
    vod_max_speed: number;

    // 채팅 설정
    chat_archive_enabled: boolean;

    // Discord 설정
    discord_notification_channel_id?: string;

    // 분할 저장 경로
    split_download_dirs: boolean;
    vod_chzzk_dir: string;
    vod_external_dir: string;
}

export interface GeneralSettingsUpdate {
    download_dir?: string;
    monitor_interval?: number;
    output_format?: string;
    recording_quality?: string;
    split_download_dirs?: boolean;
    vod_chzzk_dir?: string;
    vod_external_dir?: string;
}

// ── Dir Browser Types ────────────────────────────────
export interface DirEntry {
    name: string;
    path: string;
}

export interface BrowseDirsResponse {
    current: string;
    parent: string | null;
    dirs: DirEntry[];
}

export interface VodSettingsUpdate {
    vod_max_concurrent?: number;
    vod_default_quality?: string;
    vod_max_speed?: number;
}

export interface ChatSettingsUpdate {
    chat_archive_enabled: boolean;
}

export interface DiscordSettingsUpdate {
    discord_bot_token?: string;
    discord_notification_channel_id?: string;
}

// ── Chat Log Types ───────────────────────────────────────

export interface ChatLogFile {
    file_id: string;
    filename: string;
    channel: string;
    size_bytes: number;
    message_count: number;
    created_at: string;
    modified_at: string;
}

export interface ChatMessageItem {
    timestamp: string;
    user_id: string | null;
    nickname: string;
    message: string;
}

export interface MessagesResponse {
    messages: ChatMessageItem[];
    total: number;
    page: number;
    limit: number;
    has_next: boolean;
}

// ── Stats Types ─────────────────────────────────────────

export interface ChannelLiveStat {
    channel_id: string;
    channel_name: string;
    session_count: number;
    total_duration_seconds: number;
    total_size_bytes: number;
    live_detected_count: number;
}

export interface LiveSession {
    channel_id: string;
    channel_name: string;
    started_at: string | null;
    ended_at: string | null;
    duration_seconds: number;
    file_size_bytes: number;
    output_path: string | null;
}

export interface StatsResponse {
    live: {
        total_duration_seconds: number;
        total_size_bytes: number;
        total_sessions: number;
        by_channel: ChannelLiveStat[];
    };
    vod: {
        total_completed: number;
        total_size_bytes: number;
        by_type: { chzzk: number; external: number };
    };
    storage: {
        download_dir: string;
        used_bytes: number;
        total_bytes: number;
        free_bytes: number;
    };
    recent_sessions: LiveSession[];
}

// ── API Functions ───────────────────────────────────────

export const api = {
    // Channels
    getChannels: async () => {
        const res = await client.get<Channel[]>("/stream/channels");
        return res.data;
    },
    addChannel: async (channel_id: string, auto_record: boolean = true) => {
        const res = await client.post("/stream/channels", {
            channel_id,
            auto_record,
        });
        return res.data;
    },
    removeChannel: async (channel_id: string) => {
        const res = await client.delete(`/stream/channels/${channel_id}`);
        return res.data;
    },
    toggleAutoRecord: async (channel_id: string) => {
        const res = await client.patch(`/stream/channels/${channel_id}/auto-record`);
        return res.data;
    },

    // Recording
    startRecording: async (channel_id: string) => {
        const res = await client.post(`/stream/record/${channel_id}/start`);
        return res.data;
    },
    stopRecording: async (channel_id: string) => {
        const res = await client.post(`/stream/record/${channel_id}/stop`);
        return res.data;
    },

    // Monitor
    startMonitor: async () => {
        const res = await client.post("/stream/monitor/start");
        return res.data;
    },
    stopMonitor: async () => {
        const res = await client.post("/stream/monitor/stop");
        return res.data;
    },

    // VOD
    getVodInfo: async (url: string) => {
        const res = await client.post<VodInfo>("/vod/info", { url });
        return res.data;
    },
    downloadVod: async (url: string, quality: string = "best", output_dir?: string) => {
        const res = await client.post<{ task_id: string; message: string }>("/vod/download", {
            url,
            quality,
            output_dir,
        });
        return res.data;
    },
    getAllVodStatus: async () => {
        const res = await client.get<VodStatusResponse>("/vod/status");
        return res.data;
    },
    getVodTaskStatus: async (task_id: string) => {
        const res = await client.get<VodTask>(`/vod/status/${task_id}`);
        return res.data;
    },
    cancelVodDownload: async (task_id: string) => {
        const res = await client.post(`/vod/${task_id}/cancel`);
        return res.data;
    },
    pauseVodDownload: async (task_id: string) => {
        const res = await client.post(`/vod/${task_id}/pause`);
        return res.data;
    },
    resumeVodDownload: async (task_id: string) => {
        const res = await client.post(`/vod/${task_id}/resume`);
        return res.data;
    },
    retryVodDownload: async (task_id: string) => {
        const res = await client.post<{ message: string; old_task_id: string; new_task_id: string }>(`/vod/${task_id}/retry`);
        return res.data;
    },
    reorderVodTasks: async (task_ids: string[]) => {
        const res = await client.post("/vod/reorder", { task_ids });
        return res.data;
    },
    clearCompletedVodTasks: async () => {
        const res = await client.post<{ message: string; deleted_count: number; remaining_count: number }>("/vod/clear-completed");
        return res.data;
    },
    openVodFileLocation: async (task_id: string) => {
        const res = await client.post<{ message: string; path: string }>(`/vod/${task_id}/open-location`);
        return res.data;
    },

    // Settings
    getSettings: async () => {
        const res = await client.get<Settings>("/settings");
        return res.data;
    },
    updateCookies: async (nid_aut: string, nid_ses: string) => {
        const res = await client.put("/settings/cookies", { nid_aut, nid_ses });
        return res.data;
    },
    updateDownloadSettings: async (keep_download_parts: boolean, max_record_retries: number) => {
        const res = await client.put("/settings/download", { keep_download_parts, max_record_retries });
        return res.data;
    },
    updateGeneralSettings: async (data: GeneralSettingsUpdate) => {
        const res = await client.put("/settings/general", data);
        return res.data;
    },
    updateVodSettings: async (data: VodSettingsUpdate) => {
        const res = await client.put("/settings/vod", data);
        return res.data;
    },
    updateChatSettings: async (data: ChatSettingsUpdate) => {
        const res = await client.put("/settings/chat", data);
        return res.data;
    },
    updateDiscordSettings: async (data: DiscordSettingsUpdate) => {
        const res = await client.put("/settings/discord", data);
        return res.data;
    },
    testCookies: async () => {
        const res = await client.post("/settings/cookies/test");
        return res.data;
    },
    browseDirs: async (path?: string): Promise<BrowseDirsResponse> => {
        const res = await client.get<BrowseDirsResponse>("/settings/browse-dirs", {
            params: path !== undefined ? { path } : {},
        });
        return res.data;
    },

    // Stats
    getStats: async (): Promise<StatsResponse> => {
        const res = await client.get<StatsResponse>("/stats/");
        return res.data;
    },

    // Chat Logs
    getChatFiles: async () => {
        const res = await client.get<ChatLogFile[]>("/chat/files");
        return res.data;
    },
    getChatMessages: async (
        file_id: string,
        params: { page?: number; limit?: number; search?: string; nickname?: string }
    ) => {
        const res = await client.get<MessagesResponse>(`/chat/files/${file_id}/messages`, {
            params,
        });
        return res.data;
    },
    getChatDownloadUrl: (file_id: string): string =>
        `${API_BASE_URL}/chat/files/${file_id}/download`,
};
