import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendTelegramAlert } from "@/lib/services/notifier";

/**
 * Handle "GO" click from client email
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");
    const tenderId = searchParams.get("tenderId");

    if (!clientId || !tenderId) {
        return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    try {
        const client = await db.client.findUnique({ where: { id: clientId } });
        const opportunity = await db.opportunity.findFirst({
            where: { clientId, tender: { id_boamp: tenderId } },
            include: { tender: true }
        });

        if (!client || !opportunity) {
            return NextResponse.json({ error: "Record not found" }, { status: 404 });
        }

        // 1. Notify the Expert via Telegram
        await sendTelegramAlert(
            `🔔 **ACTION REQUISE: CLIENT "GO"**\n\n` +
            `Client : ${client.name}\n` +
            `Marché : ${opportunity.tender.title}\n` +
            `L'expert doit maintenant récupérer le DCE ! 🚀`
        );

        // 2. Redirect to the Opportunity page in the SaaS
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.TENDER_BASE_URL || "http://localhost:3000";
        return NextResponse.redirect(`${baseUrl}/opportunities/${opportunity.id}`);

    } catch (error) {
        console.error("❌ [Tender Go] Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
