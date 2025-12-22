"use client";

import { useState, useEffect } from "react";
import { adminUploadDCE } from "@/app/actions/admin-dce"; // Real action
import { Loader2, Upload, FileText, CheckCircle, ExternalLink } from "lucide-react";

// Data Type
interface PendingRequest {
    id: string; // Request ID
    opportunityId: string;
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

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        try {
            const res = await fetch("/api/admin/requests");
            if (!res.ok) throw new Error("Failed to fetch");
            const data = await res.json();
            setRequests(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async (request: PendingRequest, file: File) => {
        setUploadingId(request.id);

        try {
            // 1. Upload to Vercel Blob (Client Side)
            // This avoids the 4.5MB Server Action limit
            const { upload } = await import("@vercel/blob/client");

            const newBlob = await upload(`dce-zips/${request.opportunityId}.zip`, file, {
                access: 'public',
                handleUploadUrl: '/api/admin/upload',
            });

            console.log("Blob Uploaded:", newBlob.url);

            // 2. Call Server Action with the URL (not the file)
            const formData = new FormData();
            formData.append("opportunityId", request.opportunityId);
            formData.append("requestId", request.id);
            formData.append("blobUrl", newBlob.url); // Send URL instead of File

            const result = await adminUploadDCE(formData);

            if (result.success) {
                alert(`✅ Succès ! ${result.message}`);
                setRequests(prev => prev.filter(r => r.id !== request.id));
                fetchRequests();
            } else {
                alert(`❌ Erreur Traitement: ${result.message}`);
            }

        } catch (e: any) {
            console.error("Upload Error:", e);
            alert("Erreur technique lors de l'upload: " + e.message);
        } finally {
            setUploadingId(null);
        }
    };

    return (
        <div className="p-8">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-900">Demandes DCE en Attente</h1>
                <p className="text-slate-500 mt-1">
                    Gérez les demandes. Téléchargez le ZIP sur BOAMP, puis uploadez-le ici.
                    Le système s'occupe du reste (Unzip, AI Sort, Email User).
                </p>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                </div>
            ) : requests.length === 0 ? (
                <div className="bg-white p-12 rounded-xl border border-dotted border-slate-300 text-center">
                    <div className="flex justify-center mb-4">
                        <CheckCircle className="h-12 w-12 text-green-500 bg-green-50 p-2 rounded-full" />
                    </div>
                    <h3 className="text-lg font-medium text-slate-900">Tout est à jour !</h3>
                    <p className="text-slate-500">Aucune demande en attente. Bon travail. ☕</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {requests.map((req) => (
                        <div key={req.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6 transition-all hover:shadow-md">
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
                                <div className="flex items-center gap-4 mt-2">
                                    <a
                                        href={req.tender.pdf_url || `https://www.boamp.fr/pages/avis/?q=idweb:${req.tender.id_boamp}`}
                                        target="_blank"
                                        className="text-indigo-600 text-sm hover:underline flex items-center gap-1 font-medium bg-indigo-50 px-3 py-1.5 rounded-md"
                                    >
                                        <ExternalLink className="h-3 w-3" />
                                        1. Télécharger sur BOAMP
                                    </a>
                                </div>
                            </div>

                            <div className="w-full md:w-auto bg-slate-50 p-4 rounded-lg border border-slate-200">
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    2. Uploader le ZIP ici
                                </label>
                                <div className="flex items-center gap-2 relative">
                                    <input
                                        type="file"
                                        accept=".zip"
                                        className="block w-full text-sm text-slate-500
                                          file:mr-4 file:py-2 file:px-4
                                          file:rounded-full file:border-0
                                          file:text-sm file:font-semibold
                                          file:bg-indigo-600 file:text-white
                                          hover:file:bg-indigo-700
                                          cursor-pointer file:cursor-pointer
                                        "
                                        onChange={(e) => {
                                            if (e.target.files?.[0]) {
                                                if (confirm(`Confirmer l'upload pour ${req.client.name} ?`)) {
                                                    handleUpload(req, e.target.files[0]);
                                                }
                                            }
                                        }}
                                        disabled={!!uploadingId}
                                    />
                                    {uploadingId === req.id && (
                                        <div className="absolute inset-0 bg-white/80 flex items-center justify-center backdrop-blur-sm rounded">
                                            <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
                                            <span className="ml-2 text-xs font-medium text-indigo-600">Traitement IA...</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
