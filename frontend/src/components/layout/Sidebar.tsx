import { NavLink } from "react-router-dom";
import { LayoutDashboard, Download, Settings, Tv } from "lucide-react";
import { clsx } from "clsx";

export function Sidebar() {
    const navItems = [
        { name: "Live Dashboard", to: "/", icon: LayoutDashboard },
        { name: "VOD Downloader", to: "/vod", icon: Download },
        { name: "Settings", to: "/settings", icon: Settings },
    ];

    return (
        <aside className="w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col h-screen">
            <div className="p-6 flex items-center gap-3 border-b border-zinc-800">
                <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                    <Tv className="w-5 h-5 text-zinc-950 font-bold" />
                </div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-green-400 to-green-600 bg-clip-text text-transparent">
                    Chzzk Pro
                </h1>
            </div>

            <nav className="flex-1 p-4 space-y-2">
                {navItems.map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
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
        </aside>
    );
}
