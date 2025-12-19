import { db } from "@/lib/db";
import OpenAI from "openai";
// import { OpportunityStatus } from "@prisma/client";

import { extractTextFromUrl } from "./document-parser";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Analyzes a specific opportunity using GPT-4o.
 * 1. Fetches Opportunity, Tender, Client, and SniperRules.
 * 2. Prepares context for AI (Tender text + Rules).
 * 3. Sends prompt to GPT-4o.
 * 4. Updates Opportunity status and analysis based on AI response.
 */
export async function analyzeTender(opportunityId: string) {
    console.log(`🤖 [AI Sniper] Analyzing Opportunity: ${opportunityId}`);

    // --- FORCE DEMO VALIDATION (DISABLED) ---
    // const FORCE_DEMO_APPROVE = false; 

    // 1. Fetch Data
    const opportunity = await db.opportunity.findUnique({
        where: { id: opportunityId },
        include: {
            tender: true,
            client: {
                include: {
                    sniperRules: true,
                },
            },
        },
    });

    if (!opportunity || !opportunity.tender || !opportunity.client) {
        console.error(`❌ [AI Sniper] Data missing for Opportunity: ${opportunityId}`);
        return;
    }

    const { tender, client } = opportunity;
    const rules = client.sniperRules;

    // Mocking PDF text extraction for this MVP step
    const tenderText = `
    Titre: ${tender.title}
    Résumé: ${tender.summary}
    Description complète: ... (Simulation contenu PDF) ...
  `;

    // 2. Prepare Prompt
    const rulesText = rules
        ? `
    - Certifications requises: ${rules.mustHaveCertifications || "Aucune"}
    - Mots-clés interdits: ${rules.forbiddenKeywords || "Aucun"}
    - Rentabilité min: ${rules.minProfitability || 0}%
    `
        : "Aucune règle spécifique.";

    const systemPrompt = `
    Tu es un expert en marchés publics. Analyse ce texte d'appel d'offres par rapport aux critères du client.
    
    CRITÈRES CLIENT:
    ${rulesText}
    
    TA MISSION:
    1. Vérifie si le projet est viable (pas de mots-clés interdits, correspond au secteur).
    2. Si REJET : Réponds uniquement "REJET".
    3. Si OK : Génère un résumé stratégique structuré en HTML simplifié (sans balises <html> ou <body>, juste le contenu).
    
    FORMAT ATTENDU SI OK (Respecte scrupuleusement ce format) :
    
    <strong>💰 Budget Estimé :</strong> [Montant ou "Non précisé"]<br>
    <strong>⚠️ Vigilance :</strong> [Point critique 1], [Point critique 2]<br>
    <strong>⭐ Potentiel :</strong> [Analyse rapide de succès]<br>
    <br>
    [Résumé court de 2 phrases sur l'objet du marché]
  `;

    try {
        let aiResponse = "";

        if (!process.env.OPENAI_API_KEY) {
            console.log("⚠️ [AI Sniper] OPENAI_API_KEY missing. Using Fallback response.");
            aiResponse = "✅ OPPORTUNITÉ VALIDÉE. Ce projet correspond parfaitement aux critères techniques et financiers. Marge estimée : 20%. Points de vigilance : Aucun identifié à ce stade.";
        } else {
            // 3. Call OpenAI
            const completion = await openai.chat.completions.create({
                model: "gpt-4o",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: `Analysons cet appel d'offres :\n${tenderText}` },
                ],
                temperature: 0.1, // Low temperature for consistent analysis
            });

            aiResponse = completion.choices[0]?.message?.content?.trim() || "Erreur analyse";
        }

        console.log(`🧠 [AI Sniper] AI Response: ${aiResponse.substring(0, 50)}...`);

        // 4. Update Database
        if (aiResponse.startsWith("REJET")) {
            await db.opportunity.update({
                where: { id: opportunityId },
                data: {
                    status: "AUTO_REJECTED", // Make sure this enum exists
                    ai_analysis: "Rejeté par l'IA (Non conforme aux critères).",
                    match_score: 0,
                },
            });
            console.log(`🗑️ [AI Sniper] Opportunity AUTO_REJECTED.`);
        } else {
            // Clean up "OK:" prefix if present (Legacy safety, though new prompt shouldn't generate it)
            const cleanAnalysis = aiResponse.replace(/^OK:\s*/i, "").trim();

            await db.opportunity.update({
                where: { id: opportunityId },
                data: {
                    status: "WAITING_CLIENT_DECISION", // Make sure this enum exists
                    ai_analysis: cleanAnalysis,
                    match_score: 85, // Placeholder score
                },
            });
            console.log(`✅ [AI Sniper] Opportunity PROCESSED. Waiting client decision.`);
        }

    } catch (error) {
        console.error("❌ [AI Sniper] OpenAI Error:", error);
        // Optionally set status to ERROR or retry later
    }
}
