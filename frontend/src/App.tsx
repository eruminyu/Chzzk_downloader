import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/layout/Layout";
import { ToastProvider } from "./components/ui/Toast";
import { ConfirmProvider } from "./components/ui/ConfirmModal";
import { SetupWizard } from "./components/SetupWizard";
import { ThemeProvider } from "./context/ThemeContext";
import Dashboard from "./pages/Dashboard";
import VodDownload from "./pages/VodDownload";
import Settings from "./pages/Settings";
import ChatLogs from "./pages/ChatLogs";
import Stats from "./pages/Stats";

function App() {
    const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);

    useEffect(() => {
        fetch("/api/setup/status")
            .then((r) => r.json())
            .then((data) => setNeedsSetup(data.needs_setup))
            .catch(() => setNeedsSetup(false)); // 오류 시 마법사 미표시
    }, []);

    // 로딩 중
    if (needsSetup === null) {
        return (
            <div className="fixed inset-0 flex items-center justify-center bg-[#0F1014]">
                <div className="w-8 h-8 border-2 border-[#00FFA3] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <ThemeProvider>
            <ToastProvider>
                <ConfirmProvider>
                    {/* 초기 설정 마법사: 완료 전까지 모든 화면 위에 표시 */}
                    {needsSetup && (
                        <SetupWizard onComplete={() => setNeedsSetup(false)} />
                    )}
                    <BrowserRouter>
                        <Routes>
                            <Route path="/" element={<Layout />}>
                                <Route index element={<Dashboard />} />
                                <Route path="vod" element={<VodDownload />} />
                                <Route path="chat" element={<ChatLogs />} />
                                <Route path="stats" element={<Stats />} />
                                <Route path="settings" element={<Settings />} />
                            </Route>
                        </Routes>
                    </BrowserRouter>
                </ConfirmProvider>
            </ToastProvider>
        </ThemeProvider>
    );
}

export default App;
