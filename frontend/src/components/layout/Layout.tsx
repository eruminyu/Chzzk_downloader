import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { VodProvider } from "../../contexts/VodContext";

export function Layout() {
    return (
        <VodProvider>
            <div className="flex h-screen bg-zinc-950 text-zinc-100 font-sans overflow-hidden">
                <Sidebar />
                <main className="flex-1 overflow-auto bg-zinc-950 p-8">
                    <div className="max-w-6xl mx-auto space-y-8">
                        <Outlet />
                    </div>
                </main>
            </div>
        </VodProvider>
    );
}
