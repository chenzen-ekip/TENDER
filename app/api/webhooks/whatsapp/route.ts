
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import twilio from "twilio";

// Prevent caching for webhooks
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        // 1. Parse Form Data (Twilio sends application/x-www-form-urlencoded)
        const formData = await request.formData();
        const from = formData.get("From") as string;
        const body = formData.get("Body") as string;

        console.log(`📩 [Webhook WhatsApp] Received message from ${from}: "${body}"`);

        if (!from || !body) {
            return new NextResponse("Missing params", { status: 400 });
        }

        // 2. Identify Client
        // Remove 'whatsapp:' prefix to match DB format
        const cleanPhone = from.replace("whatsapp:", "").trim();

        const client = await db.client.findFirst({
            where: {
                whatsapp_phone: cleanPhone, // Assumes DB stores "+336..." or similar
            }
        });

        const MessagingResponse = twilio.twiml.MessagingResponse;
        const twiml = new MessagingResponse();

        if (!client) {
            console.warn(`⚠️ [Webhook] Unknown client number: ${cleanPhone}`);
            twiml.message("Numéro non reconnu par Tender Sniper.");
            return new NextResponse(twiml.toString(), {
                headers: { "Content-Type": "text/xml" },
            });
        }

        // 3. Find Latest Pending Opportunity
        const opportunity = await db.opportunity.findFirst({
            where: {
                clientId: client.id,
                status: "WAITING_CLIENT_DECISION",
            },
            orderBy: {
                updatedAt: "desc", // Get the most recently notified one
            },
        });

        if (!opportunity) {
            console.log(`ℹ️ [Webhook] No pending opportunity for client ${client.name}.`);
            twiml.message("Aucune opportunité en attente de validation pour le moment.");
            return new NextResponse(twiml.toString(), {
                headers: { "Content-Type": "text/xml" },
            });
        }

        // 4. Analyze Response
        const normalizedBody = body.trim().toLowerCase();
        let replyMessage = "";

        // Positive keywords
        if (["👍", "oui", "yes", "ok", "go", "valide"].some(k => normalizedBody.includes(k))) {

            await db.opportunity.update({
                where: { id: opportunity.id },
                data: { status: "APPROVED" }
            });
            console.log(`✅ [Webhook] Opportunity ${opportunity.id} APPROVED by user.`);
            replyMessage = "✅ Offre validée ! Je prépare le dossier.";

        }
        // Negative keywords
        else if (["👎", "non", "no", "stop", "rejet"].some(k => normalizedBody.includes(k))) {

            await db.opportunity.update({
                where: { id: opportunity.id },
                data: { status: "REJECTED" }
            });
            console.log(`❌ [Webhook] Opportunity ${opportunity.id} REJECTED by user.`);
            replyMessage = "❌ Offre rejetée. Je passe à la suite.";

        } else {
            // Unclear response
            replyMessage = "Je n'ai pas compris. Répondez par 👍 pour valider ou 👎 pour refuser.";
        }

        // 5. Reply
        twiml.message(replyMessage);

        return new NextResponse(twiml.toString(), {
            headers: { "Content-Type": "text/xml" },
        });

    } catch (error) {
        console.error("❌ [Webhook] Error processing message:", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
