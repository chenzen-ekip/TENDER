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
    Tu dois valider (VALIDATED) tout marché qui matche les mots-clés métier du client.
    
    ⚠️ MODE DÉMO ACTIVÉ : SEUIL DE VALIDATION AJUSTÉ À 5/10.
    Si la pertinence est MOYENNE ou FORTE (>= 5/10), VALIDE LE MARCHÉ.
    Refuse si c'est faible (< 5/10) ou du bruit total.
    On cherche le juste milieu : pas trop de bruit, mais pas de ratés évidents.
    
    FORMAT JSON STRICT ATTENDU:
    Réponds uniquement avec un objet JSON valide, sans markdown, sans texte autour.
    Structure :
    {
      "decision": "VALIDATED" | "REJECTED",
      "reasoning": "Explication courte en une phrase pour les logs.",
      "client_summary": {
         "title": "Titre orienté Business (ex: 'Contrat Nettoyage 150k€ - 3ans')",
         "key_points": ["Point fort 1 (ex: Critère géo respecté)", "Point fort 2 (ex: Rentabilité estimée haute)"],
         "urgency": "HAUTE" | "MOYENNE" | "FAIBLE"
      }
    }
  `;

    try {
        let aiData: any = {};

        if (!process.env.OPENAI_API_KEY) {
            console.log("⚠️ [AI Sniper] OPENAI_API_KEY missing. Using Fallback response.");
            aiData = {
                decision: "VALIDATED",
                reasoning: "Mode démo (pas de clé API).",
                client_summary: {
                    title: "Marché Démo - Nettoyage Industriel",
                    key_points: ["Rentabilité potentielle > 12%", "Secteur géographique 59/62"],
                    urgency: "HAUTE"
                }
            };
        } else {
            // 3. Call OpenAI
            const completion = await openai.chat.completions.create({
                model: "gpt-4o",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: `Analysons cet appel d'offres :\n${tenderText}` },
                ],
                temperature: 0.1,
                response_format: { type: "json_object" } // Enforce JSON
            });

            const content = completion.choices[0]?.message?.content?.trim() || "{}";
            try {
                aiData = JSON.parse(content);
            } catch (e) {
                console.error("❌ [AI Sniper] Failed to parse JSON:", content);
                aiData = { decision: "REJECTED", reasoning: "Erreur format IA" };
            }
        }

        console.log(`🧠 [AI Sniper] Decision: ${aiData.decision}`);

        // 4. Update Database
        if (aiData.decision === "REJECTED") {
            await db.opportunity.update({
                where: { id: opportunityId },
                data: {
                    status: "AUTO_REJECTED",
                    ai_analysis: aiData.reasoning,
                    match_score: 0,
                    processedAt: new Date(),
                },
            });
            console.log(`🗑️ [AI Sniper] Opportunity AUTO_REJECTED.`);
            return { status: "REJECTED" };
        } else {
            // Updated Validated Logic
            await db.opportunity.update({
                where: { id: opportunityId },
                data: {
                    status: "WAITING_CLIENT_DECISION",
                    // Store the full JSON summary in ai_analysis field (it's a string field)
                    ai_analysis: JSON.stringify(aiData.client_summary),
                    match_score: 85,
                    processedAt: new Date(),
                },
            });
            console.log(`✅ [AI Sniper] Opportunity VALIDATED.`);
            return { status: "VALIDATED", summary: aiData.client_summary };
        }

    } catch (error) {
        console.error("❌ [AI Sniper] OpenAI Error:", error);
        // Return error status so logic can continue or retry
        return { status: "ERROR", error: error };
    }
}

/**
 * Sorts DCE filenames into categories using AI (or heuristic if fails).
 * Categories: Administrative (RC), Technical (CCTP), Financial (DPGF), Other.
 * Priority: "Règlement de la Consultation" is explicitly marked.
 */
export async function sortDCEFiles(filenames: string[]) {
    console.log(`📂 [AI Sniper] Sorting ${filenames.length} files...`);

    const systemPrompt = `
    Tu es un assistant administratif BTP. Ta tâche est de classer des fichiers de marché public.
    
    CATÉGORIES:
    - ADMINISTRATIF: RC (Règlement Consultation), AE (Acte d'Engagement), CCAP...
    - TECHNIQUE: CCTP (Cahier Clauses Techniques), Plans, CCT...
    - FINANCIER: DPGF, BPU, DQE, Prix...
    - AUTRE: Le reste.

    RÈGLE SPÉCIALE:
    Si un fichier contient "RC" ou "Règlement" ou "Consultation", marque-le comme "PRIORITAIRE" (is_priority: true).
    Le CCTP est aussi prioritaire.

    FORMAT JSON STRICT:
    {
      "files": [
        { "name": "nom_fichier.pdf", "category": "ADMINISTRATIF" | "TECHNIQUE" | "FINANCIER" | "AUTRE", "is_priority": boolean }
      ]
    }
    `;

    try {
        if (!process.env.OPENAI_API_KEY) {
            // Fallback: Simple heuristic sorting
            return {
                files: filenames.map(f => {
                    const lower = f.toLowerCase();
                    let cat = "AUTRE";
                    let prio = false;

                    if (lower.includes('rc') || lower.includes('reglement')) { cat = "ADMINISTRATIF"; prio = true; }
                    else if (lower.includes('ccap')) { cat = "ADMINISTRATIF"; }
                    else if (lower.includes('cctp')) { cat = "TECHNIQUE"; prio = true; }
                    else if (lower.includes('dpgf') || lower.includes('bpu') || lower.includes('prix')) { cat = "FINANCIER"; }

                    return { name: f, category: cat, is_priority: prio };
                })
            };
        }

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini", // Optimized for cost/speed
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: `Voici la liste des fichiers : ${JSON.stringify(filenames)}` },
            ],
            temperature: 0,
            response_format: { type: "json_object" }
        });

        const content = completion.choices[0]?.message?.content?.trim() || "{}";
        return JSON.parse(content);

    } catch (e) {
        console.error("❌ [AI Sniper] File Sorting Error:", e);
        // Fallback to empty or heuristic
        return { files: [] };
    }
}
