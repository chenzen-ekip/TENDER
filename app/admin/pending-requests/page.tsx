"use client";

import { useState, useEffect } from "react";
// Since we don't have a real file upload action yet, we'll mock the upload
// In a real app, this would use the processManualDce action
import { processManualDceAction } from "@/app/actions/admin";
import { Loader2, Upload, FileText, CheckCircle, ExternalLink } from "lucide-react";

// Mock Data Type
interface PendingRequest {
    id: string;
    tender: {
        title: string;
        id_boamp: string;
        pdf_url: string | null;
    };
    client: {
        name: string;
    };
    status: string;
    createdAt: string;
}

export default function PendingRequestsPage() {
    const [requests, setRequests] = useState<PendingRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploadingId, setUploadingId] = useState<string | null>(null);

    // 1. Fetch Requests (Client-side for simplicity MVP, normally Server Component + Poll)
    useEffect(() => {
        // Mock fetch - In real implementation we would have an API route or Server Action
        // For MVP, lets assume we fetch from an API route we are about to create?
        // OR we can make this a Server Component. 
        // Let's make it simple: We need a way to see the requests.
        // I will use a simple client-side fetch to a new API route /api/admin/requests
        // But to avoid creating too many files, I'll stick to a server component pattern if possible?
        // Actually, "Process Manual DCE" implies uploading a file. 
        // File Uploads in Server Actions are tricky in Next.js 13/14 without FormData.

        // Let's assume for this MVP step we just "Confirm" the action for now, 
        // or actually implement the file upload.

        // For now, let's just fetch the data.
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        try {
            const res = await fetch("/api/admin/requests"); // We need to create this
            const data = await res.json();
            setRequests(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async (id: string, file: File) => {
        setUploadingId(id);

        try {
            const formData = new FormData();
            formData.append("opportunityId", id);
            formData.append("file", file);

            // Import dynamically to avoid Server Action issues in client components if not set up perfectly
            // But standard import works for Server Actions in Client Components.
            // We need to import processManualDceAction at top.
            // I will add the import in a separate edit or assume I can't add it here comfortably without context.
            // Actually, I'll add the logic here and import in next step.

            // Call Server Action
            const result = await processManualDceAction(formData);

            if (result.success) {
                alert(`✅ Succès ! ${result.count} fichiers traités. Analyse lancée.`);
                // Refresh list
                fetchRequests();
            } else {
                alert(`❌ Erreur: ${result.error}`);
            }

        } catch (e: any) {
            console.error("Upload Error:", e);
            alert("Erreur technique lors de l'upload.");
        } finally {
            setUploadingId(null);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-8">
            <header className="mb-8">
                <h1 className="text-2xl font-bold text-slate-900">Admin Concierge 🎩</h1>
                <p className="text-slate-500">Gérez les demandes de DCE manuelles ici.</p>
            </header>

            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                </div>
            ) : requests.length === 0 ? (
                <div className="bg-white p-12 rounded-xl border border-dotted border-slate-300 text-center">
                    <p className="text-slate-500">Aucune demande en attente. Tout est calme. ☕</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {requests.map((req) => (
                        <div key={req.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">
                                        {req.client.name}
                                    </span>
                                    <span className="text-xs text-slate-400">
                                        {new Date(req.createdAt).toLocaleDateString()}
                                    </span>
                                </div>
                                <h3 className="font-semibold text-slate-900 text-lg mb-1">
                                    {req.tender.title}
                                </h3>
                                <a
                                    href={req.tender.pdf_url || `https://www.boamp.fr/pages/avis/?q=idweb:${req.tender.id_boamp}`}
                                    target="_blank"
                                    className="text-indigo-600 text-sm hover:underline flex items-center gap-1"
                                >
                                    <ExternalLink className="h-3 w-3" />
                                    Source BOAMP ({req.tender.id_boamp})
                                </a>
                            </div>

                            <div className="w-full md:w-auto bg-slate-50 p-4 rounded-lg border border-slate-200">
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Uploader le ZIP
                                </label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="file"
                                        accept=".zip"
                                        className="block w-full text-sm text-slate-500
                                          file:mr-4 file:py-2 file:px-4
                                          file:rounded-full file:border-0
                                          file:text-sm file:font-semibold
                                          file:bg-indigo-50 file:text-indigo-700
                                          hover:file:bg-indigo-100
                                        "
                                        onChange={(e) => {
                                            if (e.target.files?.[0]) {
                                                handleUpload(req.id, e.target.files[0]);
                                            }
                                        }}
                                        disabled={!!uploadingId}
                                    />
                                    {uploadingId === req.id && <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
