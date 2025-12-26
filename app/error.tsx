"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("🏁 Global Error Boundary Catch:", error);
    }, [error]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
            <div className="max-w-md w-full bg-white rounded-xl shadow-xl p-8 border border-red-100">
                <div className="flex items-center gap-3 mb-6">
                    <div className="h-10 w-10 bg-red-100 rounded-full flex items-center justify-center">
                        <span className="text-red-600 text-xl">⚠️</span>
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900">Application Error</h1>
                        <p className="text-sm text-slate-500">Unhandled runtime exception</p>
                    </div>
                </div>

                <div className="bg-slate-900 rounded-lg p-4 mb-6 font-mono text-xs text-red-400 overflow-auto max-h-40">
                    <p className="font-bold text-indigo-400 mb-2">Error Details:</p>
                    {error.message || "Unknown error"}
                    {error.digest && (
                        <div className="mt-2 pt-2 border-t border-slate-700 text-slate-400">
                            Digest: <span className="text-white selection:bg-indigo-500">{error.digest}</span>
                        </div>
                    )}
                </div>

                <div className="flex flex-col gap-3">
                    <Button onClick={() => reset()} className="w-full bg-indigo-600 hover:bg-indigo-700">
                        Try Again
                    </Button>
                    <Button
                        onClick={() => window.location.href = "/"}
                        variant="outline"
                        className="w-full"
                    >
                        Back to Home
                    </Button>
                </div>

                <p className="mt-6 text-[10px] text-slate-400 text-center">
                    Note: If this persists, please verify your environment variables and database migrations.
                </p>
            </div>
        </div>
    );
}
