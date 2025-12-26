import { db } from "@/lib/db";
import { ClientForm } from "@/components/admin/client-form";
import { ClientActions } from "@/components/admin/client-actions";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function AdminClientsPage() {
    try {
        const clients = await db.client.findMany({
            where: { active: true },
            include: {
                searchConfig: true,
                sniperRules: true,
                keywords: true,
                departments: true,
                _count: {
                    select: { opportunities: true },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        return (
            <div className="p-8 space-y-8">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold">Clients & Configuration</h1>
                    </div>
                    <div className="flex gap-3">
                        <a
                            href="/admin/pending-requests"
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                        >
                            📥 Demandes DCE
                        </a>
                        <ClientForm />
                    </div>
                </div>

                <div className="border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nom</TableHead>
                                <TableHead>Secteur</TableHead>
                                <TableHead>Ciblage</TableHead>
                                <TableHead>Règles IA</TableHead>
                                <TableHead>Opportunités</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {clients.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                                        Aucun client configuré.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                clients.map((client) => (
                                    <TableRow key={client.id}>
                                        <TableCell className="font-medium">
                                            {client.name}
                                            <div className="text-xs text-muted-foreground">{client.email}</div>
                                        </TableCell>
                                        <TableCell>{client.sector}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-2 max-w-[300px]">
                                                <div className="flex flex-wrap gap-1">
                                                    {client.keywords?.slice(0, 3).map((k: any) => (
                                                        <Badge key={k.id} variant="outline" className="text-[10px] px-1 py-0">{k.word}</Badge>
                                                    ))}
                                                    {client.keywords?.length > 3 && <span className="text-[10px] text-muted-foreground">+{client.keywords.length - 3}</span>}
                                                </div>
                                                <div className="flex flex-wrap gap-1">
                                                    {client.departments?.slice(0, 5).map((d: any) => (
                                                        <Badge key={d.id} variant="secondary" className="text-[10px] px-1 py-0">{d.code}</Badge>
                                                    ))}
                                                    {(client.departments?.length === 0 || !client.departments) && <span className="text-[10px] text-muted-foreground">National</span>}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {client.sniperRules ? (
                                                <div className="text-xs">
                                                    {client.sniperRules.forbiddenKeywords && (
                                                        <div className="text-red-500">No: {client.sniperRules.forbiddenKeywords}</div>
                                                    )}
                                                    <div>Min Profit: {client.sniperRules.minProfitability}%</div>
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="secondary">{client._count?.opportunities || 0}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <ClientActions client={client} />
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        );
    } catch (error: any) {
        console.error("❌ Error loading AdminClientsPage:", error);
        return (
            <div className="p-8 max-w-4xl mx-auto">
                <div className="bg-red-50 border border-red-200 rounded-xl p-6 shadow-sm">
                    <h1 className="text-2xl font-bold text-red-700 mb-4 flex items-center gap-2">
                        ⚠️ Erreur Critique au Chargement
                    </h1>
                    <p className="text-red-600 mb-4">
                        Une erreur est survenue lors de la récupération des données de la base.
                        Cela arrive souvent si les migrations Prisma n'ont pas été lancées en production.
                    </p>
                    <div className="bg-slate-900 rounded-lg p-4 font-mono text-sm text-slate-300 overflow-x-auto">
                        <p className="text-indigo-400 mb-2">// Détails techniques :</p>
                        {error.message || "Erreur inconnue"}
                        {error.code && <div className="mt-2 text-slate-500 italic">Code: {error.code}</div>}
                    </div>
                    <div className="mt-6 flex gap-4">
                        <Button onClick={() => window.location.reload()} variant="outline" className="bg-white">
                            Réessayer
                        </Button>
                        <p className="text-xs text-slate-400 flex items-center">
                            Action conseillée : Lancez `npx prisma db push` sur votre base de données de production.
                        </p>
                    </div>
                </div>
            </div>
        );
    }
}
