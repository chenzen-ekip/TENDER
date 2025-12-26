import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { sendAdminDceRequestAlert } from "@/lib/services/notification.service";

interface PageProps {
    params: Promise<{
        token: string;
        choice: string;
    }>;
}

export default async function DecisionPage({ params }: PageProps) {
    const { token, choice } = await params;

    // 1. Validate Token
    const opportunity = await db.opportunity.findUnique({
        where: { decision_token: token },
        include: { tender: true, client: true },
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

    // 4. Special Demo Logic for "Apoem Nettoyage"
    // If client is "Apoem Nettoyage" AND choice is "accept", we bypass the admin loop for the video demo.
    if (choice === "accept" && (opportunity.client.name === "Apoem Nettoyage" || opportunity.client.name.includes("Apoem"))) {

        // Auto-upgrade status to DCE_READY immediately
        await db.opportunity.update({
            where: { id: opportunity.id },
            data: { status: "DCE_READY" }
        });

        // Redirect to the Opportunity Page (where files are visible)
        // We use 'redirect' from next/navigation which throws an error, so it must be last.
        const { redirect } = await import("next/navigation");
        redirect(`/opportunities/${opportunity.id}`);
    }

    // 5. Normal Flow: If client ACCEPTED, notify admin for DCE request
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
