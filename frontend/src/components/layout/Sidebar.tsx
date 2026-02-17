import { useState } from "react";
import { NavLink } from "react-router-dom";
import { LayoutDashboard, Download, Settings, Tv, Menu, X } from "lucide-react";
import { clsx } from "clsx";

export function Sidebar() {
    const [mobileOpen, setMobileOpen] = useState(false);

    const navItems = [
        { name: "Live Dashboard", to: "/", icon: LayoutDashboard },
        { name: "VOD Downloader", to: "/vod", icon: Download },
        { name: "Settings", to: "/settings", icon: Settings },
    ];

    const navContent = (
        <>
            <div className="p-6 flex items-center justify-between border-b border-zinc-800">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                        <Tv className="w-5 h-5 text-zinc-950 font-bold" />
                    </div>
                    <h1 className="text-xl font-bold bg-gradient-to-r from-green-400 to-green-600 bg-clip-text text-transparent">
                        Chzzk Pro
                    </h1>
                </div>
                {/* 모바일 닫기 버튼 */}
                <button
                    onClick={() => setMobileOpen(false)}
                    className="lg:hidden p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            <nav className="flex-1 p-4 space-y-2">
                {navItems.map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        onClick={() => setMobileOpen(false)}
                        className={({ isActive }) =>
                            clsx(
                                "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200",
                                isActive
                                    ? "bg-green-500/10 text-green-400 font-medium"
                                    : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                            )
                        }
                    >
                        <item.icon className="w-5 h-5" />
                        <span>{item.name}</span>
                    </NavLink>
                ))}
            </nav>

            <div className="p-4 border-t border-zinc-800">
                <div className="text-xs text-zinc-600 text-center">
                    v0.1.0 • Chzzk Recorder Pro
                </div>
            </div>
        </>
    );

    return (
        <>
            {/* 모바일 햄버거 버튼 */}
            <button
                onClick={() => setMobileOpen(true)}
                className="fixed top-4 left-4 z-[100] lg:hidden p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
                <Menu className="w-5 h-5" />
            </button>

            {/* 데스크톱 사이드바 */}
            <aside className="hidden lg:flex w-64 bg-zinc-900 border-r border-zinc-800 flex-col h-screen shrink-0">
                {navContent}
            </aside>

            {/* 모바일 오버레이 */}
            {mobileOpen && (
                <div className="fixed inset-0 z-[99] lg:hidden">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-backdrop"
                        onClick={() => setMobileOpen(false)}
                    />
                    <aside className="relative w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col h-screen animate-slide-in-sidebar">
                        {navContent}
                    </aside>
                </div>
            )}
        </>
    );
}
