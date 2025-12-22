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

    // ENRICHED: Extract full context from raw BOAMP data
    let enrichedContext = `
    Titre: ${tender.title}
    Résumé: ${tender.summary}
  `;

    // Extract detailed information from raw_data if available
    if (tender.raw_data && typeof tender.raw_data === 'object') {
        const rawData: any = tender.raw_data;

        enrichedContext += `\n    ID BOAMP: ${rawData.idweb || ''}`;
        enrichedContext += `\n    Type d'avis: ${rawData.typeavis || ''}`;
        enrichedContext += `\n    Département(s): ${Array.isArray(rawData.code_departement) ? rawData.code_departement.join(', ') : rawData.code_departement || ''}`;
        enrichedContext += `\n    Ville: ${rawData.ville || ''}`;
        enrichedContext += `\n    Famille: ${rawData.famille || ''}`;

        // Parse donnees JSON for detailed info
        if (rawData.donnees) {
            try {
                const donnees = typeof rawData.donnees === 'string' ? JSON.parse(rawData.donnees) : rawData.donnees;

                // Description complète
                if (donnees.OBJET?.OBJET_COMPLET) {
                    enrichedContext += `\n\n    DESCRIPTION COMPLÈTE:\n    ${donnees.OBJET.OBJET_COMPLET}`;
                }

                // ⚡ DONNÉES BOAMP COMPLÈTES (JSON) - L'AI va parser elle-même
                enrichedContext += `\n\n    📦 DONNÉES BOAMP COMPLÈTES (format eForms européen):\n`;
                enrichedContext += `\n${JSON.stringify(donnees, null, 2)}`;
                enrichedContext += `\n\n    ⚠️ IMPORTANT POUR L'IA:\n`;
                enrichedContext += `    Les données ci-dessus contiennent le montant, la durée, les dates et toutes les infos.\n`;
                enrichedContext += `    Cherche dans le JSON pour 'EstimatedOverallContractAmount', 'DurationMeasure', 'StartDate', etc.\n`;
                enrichedContext += `    NE METS JAMAIS 'Non précisé' si l'info est dans le JSON !`;

            } catch (e) {
                console.warn("⚠️ Could not parse donnees:", e);
            }
        }
    }

    const tenderText = enrichedContext;

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

    ⚠️ RÈGLE ABSOLUE - DÉTECTION NETTOYAGE:
    Si le tender contient les mots "nettoyage", "entretien", "propreté", "prestations de nettoyage" ou variantes,
    tu DOIS OBLIGATOIREMENT:
    1. Lire TOUTE l'annonce en détail (titre, description, tous les champs)
    2. Comprendre le contexte complet du marché
    3. Ne JAMAIS rejeter automatiquement sans analyse approfondie
    
    SEULEMENT après avoir lu et compris TOUTE l'annonce, tu peux décider VALIDATED ou REJECTED.
    
    🎯 CRITÈRES DE VALIDATION:
    - Seuil: >= 3/10 → VALIDER
    - Si c'est clairement du nettoyage de locaux/espaces/bâtiments → VALIDER (même si faible montant)
    - Si c'est hors-sujet évident (ex: nettoyage informatique, nettoyage de plage) → REJETER
    - En cas de doute → VALIDER (mieux vaut un faux positif qu'une opportunité manquée)
    
    📋 EXTRACTION DES DONNÉES OBLIGATOIRE:
    Le contexte contient un JSON BOAMP complet (format eForms européen).
    Tu DOIS parser ce JSON pour extraire:
    - Budget: cherche 'EstimatedOverallContractAmount' avec son '#text' et '@currencyID'
    - Durée: cherche 'DurationMeasure' avec '#text' (nombre) et '@unitCode' (MONTH/DAY/YEAR)
    - Date début: cherche 'StartDate'
    - Lieu: cherche 'CityName', 'PostalZone' dans les addresses
    - Deadline: cherche dates limites de réponse
    
    ❌ INTERDIT: Mettre 'Non précisé' si l'info existe dans le JSON !
    ✅ REQUIS: Parser le JSON et extraire toutes les valeurs disponibles
    
    📋 RÉSUMÉ DÉTAILLÉ OBLIGATOIRE:
    Le client DOIT pouvoir comprendre EXACTEMENT le marché avant d'accepter.
    Ton résumé ("summary") doit être SUBSTANTIEL et DÉTAILLÉ (minimum 5-6 phrases):
    - Périmètre exact: Quels locaux/espaces? Quelle surface? Combien de sites?
    - Prestations détaillées: Nettoyage quotidien? Hebdomadaire? Vitrerie? Désinfection?
    - Contraintes spécifiques: Horaires (nuit/jour)? Normes sanitaires? Certifications?
    - Type de bâtiments: Bureaux? Écoles? Hôpitaux? Musées?
    - Tout élément critique qui confirme que c'est bien dans le cœur de métier "nettoyage de locaux"
    
    ❌ INTERDIT: Résumés génériques vides comme "Marché de nettoyage de locaux" (trop court!)
    ✅ REQUIS: Résumé riche permettant au client de savoir s'il a les compétences/ressources
    
    FORMAT JSON STRICT ATTENDU:
    Réponds uniquement avec un objet JSON valide, sans markdown, sans texte autour.
    Structure :
    {
      "decision": "VALIDATED" | "REJECTED",
      "reasoning": "Explication détaillée de ta décision en 2-3 phrases montrant que tu as LU toute l'annonce",
      "confidence_score": 1-10,
      "client_summary": {
         "title": "Titre orienté Business avec montant si connu (ex: 'Nettoyage CAF 93 - 2.6M€ - 4 ans')",
         "summary": "RÉSUMÉ DÉTAILLÉ EN 5-6 PHRASES MINIMUM couvrant le périmètre exact, les prestations détaillées, les contraintes, le type de locaux, et tous les éléments critiques permettant au client de comprendre s'il a les compétences pour ce marché",
         "budget": "Montant estimé avec unité (ex: '2 600 000€ HT') OU 'Non précisé' si vraiment absent",
         "deadline": "Date limite de candidature (format: 'DD mois YYYY') OU 'Non précisé'",
         "location": "Ville(s) et département précis (ex: 'Bobigny (93)') OU 'Non précisé'",
         "duration": "Durée exacte du contrat (ex: '48 mois', '4 ans') OU 'Non précisé'",
         "key_points": [
            "Périmètre: [détail des sites/surfaces/zones à nettoyer]",
            "Prestations: [liste exhaustive des tâches de nettoyage]",
            "Contraintes: [horaires, normes, certifications requises]",
            "Opportunité: [pourquoi ce marché est intéressant ou à risque]"
         ],
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
                    summary: "Contrat de nettoyage pour établissement public avec prestations régulières",
                    budget: "Non spécifié",
                    deadline: "Non spécifié",
                    location: "Région Île-de-France",
                    duration: "12 mois renouvelable",
                    key_points: ["Rentabilité potentielle > 12%", "Secteur géographique compatible"],
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
        console.log(`   Confidence: ${aiData.confidence_score || 'N/A'}/10`);
        console.log(`   Reasoning: ${aiData.reasoning || 'N/A'}`);

        // 4. Update Database
        if (aiData.decision === "REJECTED") {
            await db.opportunity.update({
                where: { id: opportunityId },
                data: {
                    status: "AUTO_REJECTED",
                    ai_analysis: JSON.stringify({
                        reasoning: aiData.reasoning,
                        confidence: aiData.confidence_score || 0
                    }),
                    match_score: 0,
                    processedAt: new Date(),
                },
            });
            console.log(`🗑️ [AI Sniper] Opportunity AUTO_REJECTED.`);
            return { status: "REJECTED", reasoning: aiData.reasoning };
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
