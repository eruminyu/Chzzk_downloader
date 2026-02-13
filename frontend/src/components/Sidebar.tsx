import React from 'react';
import { LayoutDashboard, Radio, Download, Settings, Activity } from 'lucide-react';
import type { ViewType } from '@/types';

interface SidebarProps {
    currentView: ViewType;
    onViewChange: (view: ViewType) => void;
    engineOnline: boolean;
}

const menuItems = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'live' as const, label: 'Live', icon: Radio },
    { id: 'vod' as const, label: 'VOD', icon: Download },
    { id: 'settings' as const, label: 'Settings', icon: Settings },
];

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange, engineOnline }) => {
    return (
        <>
            {/* Desktop Sidebar */}
            <div className="hidden md:flex w-64 h-screen bg-chzzk-card border-r border-gray-800 flex-col flex-shrink-0 sticky top-0">
                <div className="p-6 flex items-center space-x-3 border-b border-gray-800">
                    <div className="w-8 h-8 bg-chzzk rounded flex items-center justify-center">
                        <Activity className="text-black w-5 h-5" />
                    </div>
                    <h1 className="text-xl font-bold text-white tracking-tight">
                        Chzzk<span className="text-chzzk">DL</span>
                    </h1>
                </div>

                <nav className="flex-1 px-4 py-6 space-y-2">
                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = currentView === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => onViewChange(item.id)}
                                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 group ${isActive
                                        ? 'bg-chzzk/10 text-chzzk border border-chzzk/20 shadow-[0_0_15px_rgba(0,255,163,0.1)]'
                                        : 'text-gray-400 hover:bg-chzzk-hover hover:text-white'
                                    }`}
                            >
                                <Icon className={`w-5 h-5 ${isActive ? 'text-chzzk' : 'text-gray-500 group-hover:text-white'}`} />
                                <span className="font-medium">
                                    {item.id === 'live' ? 'Live Monitor' :
                                        item.id === 'vod' ? 'VOD Downloader' :
                                            item.label}
                                </span>
                            </button>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-gray-800">
                    <div className="bg-gray-900/50 rounded-lg p-3">
                        <div className="flex items-center space-x-2 mb-2">
                            <div className={`w-2 h-2 rounded-full ${engineOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                            <span className={`text-xs font-semibold ${engineOnline ? 'text-green-400' : 'text-red-400'}`}>
                                {engineOnline ? 'Engine Online' : 'Engine Offline'}
                            </span>
                        </div>
                        <p className="text-xs text-gray-500">v0.1.0-beta</p>
                    </div>
                </div>
            </div>

            {/* Mobile Bottom Navigation */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-chzzk-card border-t border-gray-800 z-50 px-2 pb-[env(safe-area-inset-bottom)]">
                <div className="flex justify-around items-center h-16">
                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = currentView === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => onViewChange(item.id)}
                                className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors duration-200 ${isActive ? 'text-chzzk' : 'text-gray-500'
                                    }`}
                            >
                                <Icon className={`w-6 h-6 ${isActive ? 'scale-110' : ''} transition-transform`} />
                                <span className="text-[10px] font-medium">{item.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </>
    );
};
