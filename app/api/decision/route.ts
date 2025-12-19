
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const decision = searchParams.get("decision");

    // Basic Validation
    if (!id || !decision || !["APPROVED", "REJECTED"].includes(decision)) {
        return new NextResponse("Paramètres invalides. Lien corrompu ?", { status: 400 });
    }

    try {
        // Find Opportunity
        const opportunity = await db.opportunity.findUnique({
            where: { id: id },
            include: { tender: true, client: true }
        });

        if (!opportunity) {
            return new NextResponse("Opportunité non trouvée.", { status: 404 });
        }

        // Update Status
        await db.opportunity.update({
            where: { id: id },
            data: {
                status: decision as "APPROVED" | "REJECTED"
            }
        });

        console.log(`✅ [Decision API] Opportunity ${id} updated to ${decision}`);

        // Styles for the response page
        const isApproved = decision === "APPROVED";
        const color = isApproved ? "#22c55e" : "#ef4444";
        const icon = isApproved ? "✅" : "❌";
        const title = isApproved ? "Offre Validée !" : "Offre Rejetée.";
        const message = isApproved
            ? "Merci ! Nous préparons le dossier technique pour cet appel d'offres."
            : "C'est noté. Nous passons à l'analyse des prochaines opportunités.";

        const html = `
        <!DOCTYPE html>
        <html lang="fr">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Confirmation TENDER SNIPER</title>
            <style>
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    background-color: #f3f4f6;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                    margin: 0;
                }
                .card {
                    background: white;
                    padding: 2rem;
                    border-radius: 12px;
                    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
                    text-align: center;
                    max-width: 400px;
                    width: 90%;
                }
                .icon {
                    font-size: 4rem;
                    margin-bottom: 1rem;
                    display: block;
                }
                h1 {
                    color: #1f2937;
                    margin-bottom: 0.5rem;
                }
                p {
                    color: #6b7280;
                    margin-bottom: 1.5rem;
                }
                .btn {
                    display: inline-block;
                    background-color: ${color};
                    color: white;
                    padding: 0.75rem 1.5rem;
                    text-decoration: none;
                    border-radius: 6px;
                    font-weight: bold;
                }
            </style>
        </head>
        <body>
            <div class="card">
                <span class="icon">${icon}</span>
                <h1>${title}</h1>
                <p>Opportunité : <strong>${opportunity.tender.title}</strong></p>
                <p>${message}</p>
                <a href="/" class="btn">Retour au Dashboard</a>
            </div>
        </body>
        </html>
        `;

        return new NextResponse(html, {
            headers: { "Content-Type": "text/html" }
        });

    } catch (error) {
        console.error("❌ [Decision API] Error:", error);
        return new NextResponse("Erreur interne.", { status: 500 });
    }
}
