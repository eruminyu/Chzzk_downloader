import { useState } from "react";
import { NavLink } from "react-router-dom";
import { LayoutDashboard, Download, Settings, Tv, Menu, X, MessageSquare, BarChart2 } from "lucide-react";
import { clsx } from "clsx";
import { useTheme } from "../../context/ThemeContext";

export function Sidebar() {
    const [mobileOpen, setMobileOpen] = useState(false);
    const { pageTitle, iconUrl } = useTheme();

    const navItems = [
        { name: "Live Dashboard", to: "/", icon: LayoutDashboard },
        { name: "VOD Downloader", to: "/vod", icon: Download },
        { name: "Chat Logs", to: "/chat", icon: MessageSquare },
        { name: "Statistics", to: "/stats", icon: BarChart2 },
        { name: "Settings", to: "/settings", icon: Settings },
    ];

    const navContent = (
        <>
            {/* ── 로고 헤더 ─── */}
            <div className="p-5 flex items-center justify-between border-b border-zinc-800">
                <div className="flex items-center gap-3 min-w-0">
                    {/* 아이콘: 커스텀 favicon 있으면 이미지, 없으면 기본 Tv 아이콘 */}
                    <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 overflow-hidden"
                        style={{ background: "var(--primary-dim)", boxShadow: "0 0 0 1.5px var(--primary)" }}
                    >
                        {iconUrl ? (
                            <img
                                src={iconUrl}
                                alt="icon"
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <Tv className="w-5 h-5" style={{ color: "var(--primary)" }} />
                        )}
                    </div>

                    {/* 탭 이름 (pageTitle) */}
                    <h1
                        className="text-base font-bold truncate leading-tight"
                        style={{ color: "var(--primary)" }}
                        title={pageTitle}
                    >
                        {pageTitle}
                    </h1>
                </div>

                {/* 모바일 닫기 버튼 */}
                <button
                    onClick={() => setMobileOpen(false)}
                    className="lg:hidden p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors shrink-0"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* ── 네비게이션 ─── */}
            <nav className="flex-1 p-4 space-y-1.5">
                {navItems.map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.to === "/"}
                        onClick={() => setMobileOpen(false)}
                        className={({ isActive }) =>
                            clsx(
                                "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium",
                                isActive
                                    ? "nav-active"
                                    : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                            )
                        }
                    >
                        {({ isActive }) => (
                            <>
                                <item.icon
                                    className="w-4 h-4 shrink-0"
                                    style={isActive ? { color: "var(--primary)" } : undefined}
                                />
                                <span>{item.name}</span>
                            </>
                        )}
                    </NavLink>
                ))}
            </nav>

            {/* ── 하단 버전 ─── */}
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
