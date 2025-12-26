import OpenAI from "openai";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export interface SniperAnalysis {
    match_score: number;
    ai_analysis: string;
    status: 'VALIDATED' | 'REJECTED';
}

export async function analyzeTenderWithAI(
    fullText: string,
    sniperRules: any
): Promise<SniperAnalysis> {
    const prompt = `
Analyste Sniper Expert en Marchés Publics.
Analyse le marché BOAMP fourni ci-dessous en fonction des critères du client.

CRITÈRES CLIENT:
${JSON.stringify(sniperRules, null, 2)}

MARCHÉ COMPLET:
${fullText.substring(0, 15000)} // Safety limit for context window

INSTRUCTIONS:
Retourne UNIQUEMENT un objet JSON avec cette structure:
{
  "match_score": 0-100,
  "ai_analysis": "Résumé stratégique complet (Points forts, points d'attention, et recommandation d'angle d'attaque)",
  "status": "VALIDATED"
}
    `;

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [{ role: "system", content: prompt }],
            response_format: { type: "json_object" },
        });

        const content = response.choices[0].message.content;
        if (!content) throw new Error("No content from OpenAI");

        return JSON.parse(content) as SniperAnalysis;
    } catch (error) {
        console.error("❌ [AI Sniper] Analysis failed:", error);
        return {
            match_score: 0,
            ai_analysis: "Erreur d'analyse IA",
            status: 'REJECTED'
        };
    }
}

/**
 * Categorize DCE files based on their names.
 * Used during the "Concierge" process to organize the ZIP contents.
 */
export async function sortDCEFiles(filenames: string[]): Promise<{ files: Array<{ name: string, category: string, is_priority: boolean }> }> {
    const prompt = `
Tu es un expert en marchés publics. Analyse cette liste de fichiers provenant d'un DCE (Dossier de Consultation).
Catégorise chaque fichier dans l'une des catégories suivantes : ADMINISTRATIF, TECHNIQUE, FINANCIER, AUTRE.

RÈGLES :
- RC (Règlement de Consultation), CCAP -> ADMINISTRATIF
- CCTP, Plans, Définition technique -> TECHNIQUE
- DPGF, BPU, Devis Estimatif -> FINANCIER
- Identifie les fichiers "Prioritaires" (RC et CCTP).

LISTE DES FICHIERS :
${filenames.join("\n")}

FORMAT JSON STRICT:
{
  "files": [
    { "name": "nom_du_fichier", "category": "CATEGORIE", "is_priority": true/false }
  ]
}
    `;

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini", // Use mini for faster sorting
            messages: [{ role: "system", content: prompt }],
            response_format: { type: "json_object" },
        });

        const content = response.choices[0].message.content;
        if (!content) throw new Error("No content from OpenAI");

        return JSON.parse(content);
    } catch (error) {
        console.error("❌ [AI Sniper] File sorting failed:", error);
        // Fallback: simple heuristic or everything as AUTRE
        return {
            files: filenames.map(name => ({
                name,
                category: "AUTRE",
                is_priority: false
            }))
        };
    }
}
