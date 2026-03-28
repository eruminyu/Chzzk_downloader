import { useEffect, useState } from "react";
import { Command } from "cmdk";
import { useNavigate } from "react-router-dom";
import { LayoutDashboard, Download, Settings, MessageSquare, Radio, BarChart2 } from "lucide-react";

export function CommandPalette() {
    const [open, setOpen] = useState(false);
    const navigate = useNavigate();

    // 토글 단축키: Ctrl+K 또는 Cmd+K
    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((open) => !open);
            }
        };

        document.addEventListener("keydown", down);
        return () => document.removeEventListener("keydown", down);
    }, []);

    const runCommand = (command: () => void) => {
        setOpen(false);
        command();
    };

    if (!open) return null;

    return (
        <Command.Dialog
            open={open}
            onOpenChange={setOpen}
            className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh] bg-black/60 backdrop-blur-sm"
            label="Global Command Palette"
        >
            <div className="w-full max-w-lg bg-zinc-900 border border-zinc-700 shadow-2xl rounded-xl overflow-hidden pointer-events-auto shadow-black/50">
                <Command.Input
                    placeholder="검색하거나 명령어를 입력하세요..."
                    className="w-full px-4 py-4 bg-transparent text-white placeholder:text-zinc-500 border-b border-zinc-800 focus:outline-none focus:ring-0"
                />
                
                <Command.List className="max-h-[300px] overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-zinc-700">
                    <Command.Empty className="py-6 text-center text-sm text-zinc-500">
                        검색 결과가 없습니다.
                    </Command.Empty>
                    
                    <Command.Group heading="이동 (Navigation)" className="px-2 py-1.5 text-xs font-semibold text-zinc-500">
                        <Command.Item
                            onSelect={() => runCommand(() => navigate("/"))}
                            className="flex items-center gap-2 px-2 py-2 mt-1 text-sm text-zinc-300 rounded-lg cursor-pointer hover:bg-zinc-800 aria-selected:bg-zinc-800 aria-selected:text-white transition-colors"
                        >
                            <LayoutDashboard className="w-4 h-4" /> Live Dashboard
                        </Command.Item>
                        <Command.Item
                            onSelect={() => runCommand(() => navigate("/vod"))}
                            className="flex items-center gap-2 px-2 py-2 mt-1 text-sm text-zinc-300 rounded-lg cursor-pointer hover:bg-zinc-800 aria-selected:bg-zinc-800 aria-selected:text-white transition-colors"
                        >
                            <Download className="w-4 h-4" /> VOD Download
                        </Command.Item>
                        <Command.Item
                            onSelect={() => runCommand(() => navigate("/archive"))}
                            className="flex items-center gap-2 px-2 py-2 mt-1 text-sm text-zinc-300 rounded-lg cursor-pointer hover:bg-zinc-800 aria-selected:bg-zinc-800 aria-selected:text-white transition-colors"
                        >
                            <Radio className="w-4 h-4" /> X Spaces
                        </Command.Item>
                        <Command.Item
                            onSelect={() => runCommand(() => navigate("/chat"))}
                            className="flex items-center gap-2 px-2 py-2 mt-1 text-sm text-zinc-300 rounded-lg cursor-pointer hover:bg-zinc-800 aria-selected:bg-zinc-800 aria-selected:text-white transition-colors"
                        >
                            <MessageSquare className="w-4 h-4" /> Chat Logs
                        </Command.Item>
                        <Command.Item
                            onSelect={() => runCommand(() => navigate("/stats"))}
                            className="flex items-center gap-2 px-2 py-2 mt-1 text-sm text-zinc-300 rounded-lg cursor-pointer hover:bg-zinc-800 aria-selected:bg-zinc-800 aria-selected:text-white transition-colors"
                        >
                            <BarChart2 className="w-4 h-4" /> Stats
                        </Command.Item>
                        <Command.Item
                            onSelect={() => runCommand(() => navigate("/settings"))}
                            className="flex items-center gap-2 px-2 py-2 mt-1 text-sm text-zinc-300 rounded-lg cursor-pointer hover:bg-zinc-800 aria-selected:bg-zinc-800 aria-selected:text-white transition-colors"
                        >
                            <Settings className="w-4 h-4" /> Settings
                        </Command.Item>
                    </Command.Group>
                </Command.List>
            </div>
        </Command.Dialog>
    );
}
