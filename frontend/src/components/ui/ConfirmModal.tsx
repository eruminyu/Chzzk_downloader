import { useEffect, useRef, createContext, useContext, useState, useCallback } from "react";
import { AlertTriangle } from "lucide-react";
import { clsx } from "clsx";

// ── Types ────────────────────────────────────────────

interface ConfirmOptions {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: "danger" | "default";
}

interface ConfirmContextValue {
    confirm: (options: ConfirmOptions) => Promise<boolean>;
}

// ── Context ──────────────────────────────────────────

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function useConfirm(): (options: ConfirmOptions) => Promise<boolean> {
    const ctx = useContext(ConfirmContext);
    if (!ctx) throw new Error("useConfirm must be used within ConfirmProvider");
    return ctx.confirm;
}

// ── Provider ─────────────────────────────────────────

interface PendingConfirm {
    options: ConfirmOptions;
    resolve: (value: boolean) => void;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
    const [pending, setPending] = useState<PendingConfirm | null>(null);

    const handleConfirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
        return new Promise<boolean>((resolve) => {
            setPending({ options, resolve });
        });
    }, []);

    const handleResult = useCallback(
        (result: boolean) => {
            pending?.resolve(result);
            setPending(null);
        },
        [pending],
    );

    return (
        <ConfirmContext.Provider value={{ confirm: handleConfirm }}>
            {children}
            {pending && (
                <ConfirmModal
                    {...pending.options}
                    onConfirm={() => handleResult(true)}
                    onCancel={() => handleResult(false)}
                />
            )}
        </ConfirmContext.Provider>
    );
}

// ── Modal Component ──────────────────────────────────

interface ConfirmModalProps extends ConfirmOptions {
    onConfirm: () => void;
    onCancel: () => void;
}

function ConfirmModal({
    title,
    message,
    confirmText = "확인",
    cancelText = "취소",
    variant = "default",
    onConfirm,
    onCancel,
}: ConfirmModalProps) {
    const confirmBtnRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        confirmBtnRef.current?.focus();

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onCancel();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [onCancel]);

    const isDanger = variant === "danger";

    return (
        <div
            className="fixed inset-0 z-[9998] flex items-center justify-center animate-backdrop"
            onClick={onCancel}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

            {/* Modal */}
            <div
                className="relative bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4 animate-modal-in"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-start gap-4 mb-5">
                    {isDanger && (
                        <div className="shrink-0 w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                            <AlertTriangle className="w-5 h-5 text-red-400" />
                        </div>
                    )}
                    <div>
                        <h3 className="text-white font-bold text-lg">{title}</h3>
                        <p className="text-zinc-400 text-sm mt-1">{message}</p>
                    </div>
                </div>

                <div className="flex gap-3 justify-end">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 transition-colors"
                    >
                        {cancelText}
                    </button>
                    <button
                        ref={confirmBtnRef}
                        onClick={onConfirm}
                        className={clsx(
                            "px-4 py-2 rounded-lg text-sm font-bold transition-colors",
                            isDanger
                                ? "bg-red-600 hover:bg-red-500 text-white"
                                : "bg-green-600 hover:bg-green-500 text-white",
                        )}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
