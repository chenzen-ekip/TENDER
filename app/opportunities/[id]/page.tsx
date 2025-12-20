
import { db } from "@/lib/db";
import { OpportunityActions } from "@/components/opportunity/opportunity-actions";
import { notFound } from "next/navigation";
import { Calendar, MapPin, Download, FileText, CheckCircle, AlertTriangle, Briefcase } from "lucide-react";

// Helper to format date and days remaining
function getDeadlineInfo(date: Date | null) {
    if (!date) return { text: "Date inconnue", color: "text-gray-500", bg: "bg-gray-100" };

    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { text: "Expiré", color: "text-red-600", bg: "bg-red-100" };
    if (diffDays <= 3) return { text: `${diffDays} Jours restants (Urgent)`, color: "text-red-600", bg: "bg-red-50" };
    return { text: `${diffDays} Jours restants`, color: "text-emerald-600", bg: "bg-emerald-50" };
}

export default async function OpportunityPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    const opportunity = await db.opportunity.findUnique({
        where: { id },
        include: {
            tender: true,
            client: true
        }
    });

    if (!opportunity) return notFound();

    const { tender, client } = opportunity as any; // Cast to any to bypass stale Prisma types (Windows EPERM)

    // Parse dceFiles (Mock if empty until scraper runs)
    const dceFiles = (opportunity as any).dceFiles?.files || [
        { name: "RC_Reglement_Consultation.pdf", category: "ADMINISTRATIF", is_priority: true },
        { name: "CCTP_Lot01.pdf", category: "TECHNIQUE", is_priority: true },
        { name: "DPGF_Cadre_Prix.xls", category: "FINANCIER", is_priority: false },
        { name: "CCAP.pdf", category: "ADMINISTRATIF", is_priority: false },
        { name: "Plans_RDC.pdf", category: "TECHNIQUE", is_priority: false },
    ]; // Fallback to mock for UI dev

    const deadlineInfo = getDeadlineInfo((tender as any).deadline);

    // Group files
    const groupedFiles = {
        ADMINISTRATIF: dceFiles.filter((f: any) => f.category === "ADMINISTRATIF"),
        TECHNIQUE: dceFiles.filter((f: any) => f.category === "TECHNIQUE"),
        FINANCIER: dceFiles.filter((f: any) => f.category === "FINANCIER"),
        AUTRE: dceFiles.filter((f: any) => f.category === "AUTRE"),
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
            {/* Navbar */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Briefcase className="h-6 w-6 text-indigo-600" />
                        <span className="font-bold text-xl tracking-tight text-slate-900">TENDER <span className="text-indigo-600">COPILOT</span></span>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-sm text-slate-500">Client: <span className="font-semibold text-slate-700">{client.name}</span></div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

                {/* 1. Opportunity Header */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700 border border-indigo-200">
                                    Marché Public
                                </span>
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${deadlineInfo.bg} ${deadlineInfo.color} border-opacity-20`}>
                                    {deadlineInfo.text}
                                </span>
                            </div>
                            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2 leading-tight">
                                {tender.title}
                            </h1>
                            <div className="flex items-center gap-4 text-slate-500 text-sm">
                                <div className="flex items-center gap-1">
                                    <MapPin className="h-4 w-4" />
                                    <span>Lieu non spécifié (Boamp)</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Calendar className="h-4 w-4" />
                                    <span>Date limite : {tender.deadline ? new Date(tender.deadline).toLocaleDateString() : 'Non définie'}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2 w-full md:w-auto">
                            {/* Actions moved to Right Column */}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* 2. Left Column: Files (The "Pack") */}
                    <div className="lg:col-span-2 space-y-6">
                        <section>
                            <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                                <div className="w-1 h-6 bg-indigo-500 rounded-full"></div>
                                Dossier de Consultation (DCE)
                            </h2>

                            {/* Categories */}
                            <div className="space-y-4">
                                {Object.entries(groupedFiles).map(([category, files]: [string, any[]]) => (
                                    files.length > 0 && (
                                        <div key={category} className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                                            <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex justify-between items-center">
                                                <h3 className="font-semibold text-sm text-slate-600 uppercase tracking-wide">{category}</h3>
                                                <span className="text-xs font-medium text-slate-400">{files.length} fichiers</span>
                                            </div>
                                            <div className="divide-y divide-slate-100">
                                                {files.map((file, idx) => (
                                                    <div key={idx} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                                                        <div className="flex items-center gap-3 overflow-hidden">
                                                            <div className={`p-2 rounded-lg ${file.is_priority ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500'}`}>
                                                                <FileText className="h-5 w-5" />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className={`text-sm font-medium truncate ${file.is_priority ? 'text-amber-900' : 'text-slate-700'}`}>
                                                                    {file.name}
                                                                </p>
                                                                {file.is_priority && <span className="text-[10px] uppercase font-bold text-amber-600 tracking-wider">Prioritaire</span>}
                                                            </div>
                                                        </div>
                                                        <button className="text-slate-400 hover:text-indigo-600 p-2 rounded-full hover:bg-indigo-50 transition-all">
                                                            <Download className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )
                                ))}
                            </div>
                        </section>
                    </div>

                    {/* 3. Right Column: AI Deep Dive + Actions */}
                    <div className="lg:col-span-1 space-y-6">

                        {/* Status Card */}
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                            <h3 className="font-semibold text-slate-900 mb-4">État de la réponse</h3>
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 text-sm">
                                    <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                                        <CheckCircle className="h-4 w-4" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-medium text-slate-900">Opportunité Validée</p>
                                        <p className="text-slate-500 text-xs">Dates confirmées</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Smart Actions & AI Analysis */}
                        <OpportunityActions
                            opportunityId={opportunity.id}
                            hasDce={!!(opportunity as any).dceFiles}
                            hasAnalysis={!!(opportunity as any).analysis_summary}
                            analysis={(opportunity as any).analysis_summary}
                            status={opportunity.status}
                        />

                    </div>
                </div>
            </main>
        </div>
    );
}
