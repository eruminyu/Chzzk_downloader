import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/layout/Layout";
import { ToastProvider } from "./components/ui/Toast";
import { ConfirmProvider } from "./components/ui/ConfirmModal";
import Dashboard from "./pages/Dashboard";
import VodDownload from "./pages/VodDownload";
import Settings from "./pages/Settings";

function App() {
    return (
        <ToastProvider>
            <ConfirmProvider>
                <BrowserRouter>
                    <Routes>
                        <Route path="/" element={<Layout />}>
                            <Route index element={<Dashboard />} />
                            <Route path="vod" element={<VodDownload />} />
                            <Route path="settings" element={<Settings />} />
                        </Route>
                    </Routes>
                </BrowserRouter>
            </ConfirmProvider>
        </ToastProvider>
    );
}

export default App;
