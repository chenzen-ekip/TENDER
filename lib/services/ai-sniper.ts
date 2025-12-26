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
  "ai_analysis": "Résumé ultra-concis en 3 points (Impact financier, Difficulté technique, Gain potentiel)",
  "status": "VALIDATED" ou "REJECTED" (REJECTED si le score est < 70 ou si un mot-clé interdit est présent)
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
