import { db } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import nodemailer from "nodemailer";
import { generateOpportunityPdf } from "./pdf.service";

// --- Configuration ---
const BASE_URL = process.env.NEXT_PUBLIC_URL || "http://localhost:3000";

// Gmail SMTP Config
const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;

const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true, // true for 465, false for other ports
    auth: {
        user: GMAIL_USER,
        pass: GMAIL_APP_PASSWORD,
    },
});

/**
 * Sends an Email alert to the client for a specific opportunity using Gmail SMTP.
 * 1. Generates decision token & links.
 * 2. Generates PDF dossier.
 * 3. Sends HTML Email with PDF attachment via Nodemailer.
 */
export async function sendOpportunityAlert(opportunityId: string) {
    console.log(`🔔 [Notifier] Processing Alert for Opportunity: ${opportunityId}`);

    // 1. Fetch Data
    const opportunity = await db.opportunity.findUnique({
        where: { id: opportunityId },
        include: {
            tender: true,
            client: true,
        },
    });

    if (!opportunity || !opportunity.tender || !opportunity.client) {
        console.error("❌ [Notifier] Data missing.");
        return;
    }

    const clientEmail = opportunity.client.email;

    if (!clientEmail) {
        console.error(`❌ [Notifier] No email found for client ${opportunity.client.name}`);
        return;
    }

    // 2. Generate Token & Links (or reuse existing)
    let token = opportunity.decision_token;

    if (!token) {
        token = uuidv4();
        await db.opportunity.update({
            where: { id: opportunityId },
            data: { decision_token: token },
        });
    }

    const acceptLink = `${BASE_URL}/api/decision?id=${opportunity.id}&decision=APPROVED`;
    const rejectLink = `${BASE_URL}/api/decision?id=${opportunity.id}&decision=REJECTED`;

    // 3. Generate PDF Dossier
    let pdfBuffer: Buffer | null = null;
    try {
        pdfBuffer = await generateOpportunityPdf(opportunity);
    } catch (e) {
        console.error("⚠️ [Notifier] PDF Generation failed.", e);
    }

    // Clean analysis for HTML
    const analysisSummary = opportunity.ai_analysis.replace(/\n/g, "<br>");

    // 4. Format HTML Message
    const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h2 style="color: #0ea5e9;">🎯 Nouvelle Opportunité Détectée</h2>
        
        <p><strong>Client :</strong> ${opportunity.client.name}</p>
        <p><strong>Titre :</strong> ${opportunity.tender.title}</p>
        
        <div style="background-color: #f0f9ff; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <h3 style="margin-top:0; color: #0369a1;">🧠 Analyse IA</h3>
            <p style="color: #334155;">${analysisSummary}</p>
        </div>

        <p>Le dossier technique complet est joint à cet email (PDF).</p>

        <h3 style="text-align: center; margin-top: 30px;">Votre Décision :</h3>
        
        <div style="text-align: center; padding: 20px 0;">
          <a href="${acceptLink}" style="display: inline-block; padding: 12px 24px; background-color: #059669; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 5px;">
            ✅ VALIDER L'OFFRE
          </a>
          
          <a href="${rejectLink}" style="display: inline-block; padding: 12px 24px; background-color: #dc2626; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 5px;">
            ❌ REJETER
          </a>
        </div>

        <p style="text-align: center; font-size: 12px; color: #9ca3af; margin-top: 40px;">
            Cet email a été envoyé automatiquement par Tender Sniper AI.
        </p>
    </div>
    `;

    // 5. Send Email via Nodemailer
    if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
        console.warn("⚠️ [Notifier] GMAIL credentials missing. Skipping actual send.");
        return { success: false, error: "Missing Gmail Config" };
    }

    try {
        const attachments: any[] = [];
        if (pdfBuffer) {
            attachments.push({
                filename: `Dossier_Tender_${opportunity.tender.id_boamp}.pdf`,
                content: pdfBuffer,
                contentType: 'application/pdf'
            });
            console.log(`📄 [Notifier] Attaching PDF (${pdfBuffer.length} bytes)`);
        }

        const info = await transporter.sendMail({
            from: `"Antigravity Tender" <${GMAIL_USER}>`, // Sender address
            to: clientEmail, // Dynamic Client Email
            subject: `📢 Opportunité : ${opportunity.tender.title}`, // Subject line
            html: htmlContent, // HTML body
            attachments: attachments
        });

        console.log(`✅ [Notifier] Email sent to ${clientEmail} (MsgID: ${info.messageId})`);
        return { success: true, messageId: info.messageId };

    } catch (error) {
        console.error("❌ [Notifier] Gmail SMTP Error:", error);
        throw error;
    }
}
