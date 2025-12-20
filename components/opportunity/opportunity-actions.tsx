"use client";

import { useState } from "react";
import { captureDCE } from "@/app/actions/dce";
import { generateDocsAction, runDeepDiveAction } from "@/app/actions/copilot";
import { Loader2, Download, FileText, CheckCircle, Play, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";

interface OpportunityActionsProps {
    opportunityId: string;
    hasDce: boolean;
    hasAnalysis: boolean;
    analysis?: any;
}

export function OpportunityActions({ opportunityId, hasDce, hasAnalysis, analysis }: OpportunityActionsProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState<string>("");
    const [progress, setProgress] = useState(0);
    const [draftLinks, setDraftLinks] = useState<{ letter?: string, memory?: string } | null>(null);

    // Handler for "Magic Button" (Start/Capture)
    const handleCapture = async () => {
        setIsLoading(true);
        setStatus("Initialisation...");
        setProgress(10);

        try {
            setStatus("Téléchargement du DCE...");
            const result = await captureDCE(opportunityId);

            if (result.success) {
                setProgress(50);
                setStatus("Analyse IA en cours (Deep Dive)...");

                await runDeepDiveAction(opportunityId);

                router.refresh();
            } else {
                setStatus(`Erreur: ${result.message}`);
            }
        } catch (e: any) {
            setStatus("Erreur critique: " + e.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerate = async () => {
        setIsLoading(true);
        setStatus("Rédaction des documents...");

        try {
            const result = await generateDocsAction(opportunityId);
            if (result.success && result.paths) {
                setDraftLinks(result.paths);
                setStatus("Documents prêts !");
            }
        } catch (e) {
            console.error(e);
            setStatus("Erreur génération");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6">

            {/* ACTION CARD */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="font-semibold text-slate-900 mb-4">Actions Copilot</h3>

                <div className="space-y-3">
                    {!hasDce ? (
                        <button
                            onClick={handleCapture}
                            disabled={isLoading}
                            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 rounded-lg font-semibold shadow-sm transition-all disabled:opacity-70"
                        >
                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                            {isLoading ? status : "Récupérer & Analyser DCE"}
                        </button>
                    ) : (
                        <div className="p-3 bg-emerald-50 text-emerald-700 rounded-lg flex items-center gap-2 text-sm">
                            <CheckCircle className="h-4 w-4" />
                            DCE Récupéré & Trié
                        </div>
                    )}

                    {/* Progress Bar */}
                    {isLoading && (
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div
                                className="bg-indigo-600 h-2 rounded-full transition-all duration-500 ease-out"
                                style={{ width: `${progress}%` }}
                            ></div>
                        </div>
                    )}

                    {hasDce && !draftLinks && (
                        <button
                            onClick={handleGenerate}
                            disabled={isLoading}
                            className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-3 rounded-lg font-semibold shadow-sm transition-all disabled:opacity-70"
                        >
                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                            {isLoading ? "Rédaction..." : "Générer mes Brouillons"}
                        </button>
                    )}

                    {draftLinks && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                            <a href={draftLinks.letter} target="_blank" className="block w-full p-3 bg-white border border-slate-200 hover:border-indigo-500 rounded-lg flex items-center gap-3 transition-colors group">
                                <div className="p-2 bg-indigo-50 text-indigo-600 rounded">
                                    <FileText className="h-4 w-4" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-900 group-hover:text-indigo-600">Lettre de Candidature.docx</p>
                                    <p className="text-xs text-slate-500">Prêt à signer</p>
                                </div>
                                <Download className="h-4 w-4 ml-auto text-slate-400 group-hover:text-indigo-600" />
                            </a>
                            <a href={draftLinks.memory} target="_blank" className="block w-full p-3 bg-white border border-slate-200 hover:border-indigo-500 rounded-lg flex items-center gap-3 transition-colors group">
                                <div className="p-2 bg-indigo-50 text-indigo-600 rounded">
                                    <FileText className="h-4 w-4" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-900 group-hover:text-indigo-600">Mémoire Technique.docx</p>
                                    <p className="text-xs text-slate-500">Trame structurée par IA</p>
                                </div>
                                <Download className="h-4 w-4 ml-auto text-slate-400 group-hover:text-indigo-600" />
                            </a>
                        </div>
                    )}
                </div>
            </div>

            {/* ANALYSIS CARD (SHOWN IF READY) */}
            {hasAnalysis && analysis && (
                <div className="bg-gradient-to-br from-indigo-50 to-white p-6 rounded-xl border border-indigo-100 shadow-sm animate-in zoom-in-95 duration-300">
                    <h3 className="text-indigo-900 font-bold flex items-center gap-2 mb-4">
                        <span className="text-xl">🧠</span>
                        Analyse "Deep Dive"
                    </h3>

                    <div className="space-y-4">
                        <div>
                            <p className="text-xs font-bold text-indigo-400 uppercase mb-1">Critères de Notation</p>
                            <div className="bg-white p-3 rounded-lg border border-indigo-50 text-sm text-slate-700 flex gap-4">
                                <div className="flex flex-col items-center p-2 bg-indigo-50 rounded min-w-[60px]">
                                    <span className="text-lg font-bold text-indigo-700">{analysis.selection_criteria?.price_weight || "?"}%</span>
                                    <span className="text-[10px] uppercase text-indigo-500">Prix</span>
                                </div>
                                <div className="flex flex-col items-center p-2 bg-indigo-50 rounded min-w-[60px]">
                                    <span className="text-lg font-bold text-indigo-700">{analysis.selection_criteria?.technical_weight || "?"}%</span>
                                    <span className="text-[10px] uppercase text-indigo-500">Technique</span>
                                </div>
                            </div>
                        </div>

                        {analysis.critical_notes && (
                            <div>
                                <p className="text-xs font-bold text-indigo-400 uppercase mb-1">Attention</p>
                                <div className="flex items-start gap-2 bg-white p-3 rounded-lg border border-indigo-50">
                                    <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                                    <p className="text-sm text-slate-700">{analysis.critical_notes}</p>
                                </div>
                            </div>
                        )}

                        <div>
                            <p className="text-xs font-bold text-indigo-400 uppercase mb-1">Pièces Requises</p>
                            <div className="flex flex-wrap gap-2">
                                {analysis.required_documents?.map((doc: string, i: number) => (
                                    <span key={i} className="px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-600 font-medium">
                                        {doc}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
