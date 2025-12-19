import { db } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

import { generateOpportunityPdf } from "./pdf.service";
import nodemailer from "nodemailer";
import path from "path";

// --- Configuration ---
const BASE_URL = process.env.NEXT_PUBLIC_URL || "http://localhost:3000";

// Email Config
const SMTP_HOST = process.env.SMTP_HOST || "smtp.gmail.com";
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "587");
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;

const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: false, // true for 465, false for other ports
    auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
    },
});

/**
 * Sends an Email alert to the client for a specific opportunity.
 * 1. Generates decision token & links.
 * 2. Generates PDF dossier.
 * 3. Sends HTML Email with PDF attachment.
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

    // 2. Generate Token & Links (or reuse existing)
    let token = opportunity.decision_token;

    if (!token) {
        token = uuidv4();
        await db.opportunity.update({
            where: { id: opportunityId },
            data: { decision_token: token },
        });
    } else {
        console.log(`ℹ️ [Notifier] Opportunity ${opportunityId} already has a token. Re-sending/Simulating alert.`);
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

    // 5. Send Email
    if (EMAIL_USER && EMAIL_PASS) {
        try {
            // Check if email is configured
            // DEMO MODE: Send to self (EMAIL_USER) to ensure receipt
            const toEmail = process.env.EMAIL_USER;

            const attachments: any[] = [];
            if (pdfBuffer) {
                attachments.push({
                    filename: `Dossier_Tender_${opportunity.tender.id_boamp}.pdf`,
                    content: pdfBuffer,
                    contentType: 'application/pdf'
                });
                console.log(`📄 [Notifier] Attaching PDF (Buffer size: ${pdfBuffer.length} bytes)`);
            }

            const mailOptions: any = {
                from: `"TENDER - IA" <${EMAIL_USER}>`,
                to: toEmail,
                subject: `📢 Opportunité : ${opportunity.tender.title}`,
                html: htmlContent,
                attachments: attachments
            };

            await transporter.sendMail(mailOptions);
            console.log(`✅ [Notifier] Email sent to ${toEmail}`);
        } catch (error) {
            console.error("❌ [Notifier] Email Error:", error);
            console.error("Make sure EMAIL_USER/EMAIL_PASS are set in .env");
        }
    } else {
        // Dev Mode Fallback
        console.log("📨 [MOCK EMAIL] Nodemailer not configured. Logging details:");
        console.log("---------------------------------------------------");
        console.log(`Subject: 📢 Opportunité : ${opportunity.tender.title}`);
        console.log("PDF Generated:", pdfBuffer ? `YES (${pdfBuffer.length} bytes)` : "NO");
        console.log("Valid Link:", acceptLink);
        console.log("Reject Link:", rejectLink);
        console.log("---------------------------------------------------");
        return { success: true, mock: true };
    }
}
