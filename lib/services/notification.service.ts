import { db } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import nodemailer from "nodemailer";

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

    // Link to the "Response Copilot" Landing Page
    const acceptLink = `${BASE_URL}/opportunities/${opportunity.id}`;
    // Reject link keeps using the API for quick action
    const rejectLink = `${BASE_URL}/api/decision?id=${opportunity.id}&decision=REJECTED`;

    // 3. (Pivot) PDF Generation Removed
    // The email body is now the "Product". Direct link to BOAMP is provided.
    const pdfBuffer = null;

    // 4. Format HTML Message (Premium Design)
    const boampUrl = opportunity.tender.pdf_url || `https://www.boamp.fr/pages/avis/?q=idweb:${opportunity.tender.id_boamp}`;

    // Parse AI Analysis (JSON)
    let aiData: any = {
        title: opportunity.tender.title,
        key_points: ["Analyse non disponible"],
        urgency: "MOYENNE"
    };

    try {
        // Handle if it's already an object or a string
        if (typeof opportunity.ai_analysis === 'string') {
            // Clean potential markdown code blocks if any (though prompt says strict JSON)
            const cleanJson = opportunity.ai_analysis.replace(/```json/g, '').replace(/```/g, '').trim();
            aiData = JSON.parse(cleanJson);
        } else {
            aiData = opportunity.ai_analysis;
        }
    } catch (e) {
        console.warn("⚠️ [Notifier] Failed to parse AI JSON for email. Using fallback.");
    }

    // Urgency Color Logic
    const urgencyColor = aiData.urgency === "HAUTE" ? "#dc2626" : (aiData.urgency === "MOYENNE" ? "#d97706" : "#059669");
    const urgencyBg = aiData.urgency === "HAUTE" ? "#fef2f2" : (aiData.urgency === "MOYENNE" ? "#fffbeb" : "#ecfdf5");

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Nouvelle Opportunité TENDER</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 20px;">
            <tr>
                <td align="center">
                    <!-- Main Card -->
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); overflow: hidden;">
                        
                        <!-- Header -->
                        <tr>
                            <td bgcolor="#0f172a" style="padding: 20px 40px; text-align: center;">
                                <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: 1px;">TENDER SNIPER</h1>
                                <p style="margin: 5px 0 0; color: #94a3b8; font-size: 14px;">Votre veille stratégique augmentée par IA</p>
                            </td>
                        </tr>

                        <!-- Content -->
                        <tr>
                            <td style="padding: 40px;">
                                <div style="margin-bottom: 25px;">
                                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
                                        <span style="background-color: #dbeafe; color: #1e40af; border-radius: 9999px; padding: 4px 12px; font-size: 12px; font-weight: 600; text-transform: uppercase;">Nouvelle Détection</span>
                                        <span style="background-color: ${urgencyBg}; color: ${urgencyColor}; border-radius: 9999px; padding: 4px 12px; font-size: 12px; font-weight: 600; text-transform: uppercase; border: 1px solid ${urgencyColor};">Urgence : ${aiData.urgency}</span>
                                    </div>
                                    <h2 style="margin-top: 15px; margin-bottom: 10px; color: #1e293b; font-size: 22px; line-height: 1.4; font-weight: 800;">${aiData.title || opportunity.tender.title}</h2>
                                    <p style="color: #64748b; font-size: 14px; margin: 0;">Client Cible : <strong style="color: #0f172a;">${opportunity.client.name}</strong></p>
                                </div>

                                <!-- AI Analysis Box -->
                                <div style="background-color: #f8fafc; border-left: 4px solid #3b82f6; border-radius: 4px; padding: 20px; margin-bottom: 30px;">
                                    <h3 style="margin-top: 0; color: #3b82f6; font-size: 14px; text-transform: uppercase; font-weight: 700; margin-bottom: 15px;">🧠 Points Clés Stratégiques</h3>
                                    <ul style="padding-left: 20px; color: #334155; font-size: 15px; line-height: 1.6; margin: 0;">
                                        ${aiData.key_points ? aiData.key_points.map((pt: string) => `<li style="margin-bottom: 5px;">${pt}</li>`).join('') : '<li>Analyse détaillée dans le PDF joint.</li>'}
                                    </ul>
                                </div>

                                <!-- Action Buttons -->
                                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 20px;">
                                    <tr>
                                        <td align="center" style="padding-bottom: 15px;">
                                            <a href="${boampUrl}" target="_blank" style="display: inline-block; background-color: #ffffff; color: #0f172a; border: 2px solid #e2e8f0; padding: 12px 24px; border-radius: 8px; font-weight: 600; text-decoration: none; font-size: 14px; transition: all 0.2s;">
                                                🔗 Voir l'offre officielle
                                            </a>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td align="center">
                                            <p style="color: #64748b; font-size: 12px; margin-bottom: 10px;">Positionnez-vous maintenant :</p>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td align="center">
                                            <a href="${acceptLink}" style="display: inline-block; background-color: #10b981; color: #ffffff; padding: 12px 30px; border-radius: 8px; font-weight: 700; text-decoration: none; font-size: 16px; margin: 0 5px; box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.2);">
                                                ✅ GO
                                            </a>
                                            <a href="${rejectLink}" style="display: inline-block; background-color: #ef4444; color: #ffffff; padding: 12px 30px; border-radius: 8px; font-weight: 700; text-decoration: none; font-size: 16px; margin: 0 5px; box-shadow: 0 4px 6px -1px rgba(239, 68, 68, 0.2);">
                                                ❌ NO GO
                                            </a>
                                        </td>
                                    </tr>
                                </table>
                                </table>
                                
                                <p style="text-align: center; color: #94a3b8; font-size: 13px; margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 20px;">
                                    Tender Sniper AI - Assistant de Veille Stratégique.
                                </p>
                            </td>
                        </tr>
                        
                        <!-- Footer -->
                        <tr>
                            <td bgcolor="#f8fafc" style="padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
                                <p style="color: #cbd5e1; font-size: 12px; margin: 0;">© 2025 Tender Sniper AI. Tous droits réservés.</p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    `;

    // 5. Send Email via Nodemailer
    if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
        console.warn("⚠️ [Notifier] GMAIL credentials missing. Skipping actual send.");
        return { success: false, error: "Missing Gmail Config" };
    }

    try {
        const info = await transporter.sendMail({
            from: `"Antigravity Tender" < ${GMAIL_USER}> `, // Sender address
            to: clientEmail, // Dynamic Client Email
            subject: `📢 Opportunité: ${opportunity.tender.title} `, // Subject line
            html: htmlContent, // HTML body
        });

        console.log(`✅[Notifier] Email sent to ${clientEmail} (MsgID: ${info.messageId})`);
        return { success: true, messageId: info.messageId };

    } catch (error) {
        console.error("❌ [Notifier] Gmail SMTP Error:", error);
        throw error;
    }
}
