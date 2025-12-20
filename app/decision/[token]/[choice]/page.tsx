import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { sendAdminDceRequestAlert } from "@/lib/services/notification.service";

interface PageProps {
    params: {
        token: string;
        choice: string;
    };
}

export default async function DecisionPage({ params }: PageProps) {
    const { token, choice } = params;

    // 1. Validate Token
    const opportunity = await db.opportunity.findUnique({
        where: { decision_token: token },
        include: { tender: true },
    });

    if (!opportunity) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50">
                <Card className="w-[350px] border-red-200">
                    <CardHeader>
                        <CardTitle className="text-red-500">Lien Invalide</CardTitle>
                        <CardDescription>Ce lien a expiré ou n'existe pas.</CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    // 2. Process Decision
    let newStatus: "APPROVED_BY_CLIENT" | "REJECTED" | null = null;
    let title = "";
    let description = "";
    let Icon = null;

    if (choice === "accept") {
        newStatus = "APPROVED_BY_CLIENT";
        title = "C'est noté ! ✅";
        description = "Nous préparons le dossier pour ce marché.";
        Icon = CheckCircle2;
    } else if (choice === "reject") {
        newStatus = "REJECTED";
        title = "Rejeté ❌";
        description = "Nous ne vous relancerons plus sur cette offre.";
        Icon = XCircle;
    } else {
        return notFound();
    }


    // 3. Update DB & Invalidate Token
    await db.opportunity.update({
        where: { id: opportunity.id },
        data: {
            status: newStatus,
            decision_token: null, // Magic link one-time use
        },
    });

    // 4. If client ACCEPTED, notify admin for DCE request (Concierge Mode)
    if (choice === "accept") {
        // Fire and forget - don't block user experience if notification fails
        sendAdminDceRequestAlert(opportunity.id).catch((error) => {
            console.error(`❌ [Decision] Failed to notify admin:`, error);
        });
    }


    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50 p-4">
            <Card className="w-full max-w-md text-center shadow-lg">
                <CardHeader>
                    <div className="mx-auto mb-4">
                        {Icon && <Icon className="h-16 w-16 text-primary" />}
                    </div>
                    <CardTitle className="text-2xl">{title}</CardTitle>
                    <CardDescription className="text-lg mt-2">{description}</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="bg-slate-100 p-4 rounded-md text-sm text-left mb-6">
                        <span className="font-semibold block mb-1">Rappel du marché :</span>
                        {opportunity.tender.title}
                    </div>
                    <Link href="/">
                        <Button variant="outline">Fermer</Button>
                    </Link>
                </CardContent>
            </Card>
        </div>
    );
}
