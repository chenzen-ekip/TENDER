
import { db } from "@/lib/db";
import OpenAI from "openai";
import { extractTextFromPdf } from "./document-parser";
import fs from "fs";
import path from "path";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export interface RCAnalysis {
    selection_criteria: {
        price_weight: number; // Percentage
        technical_weight: number; // Percentage
        other_criteria: string[];
    };
    required_documents: string[]; // List of codes e.g. DC1, DC2, Memoire Technique
    buyer_contact: {
        name: string;
        email: string;
        phone: string;
    };
    critical_notes: string; // "Visite obligatoire le...", "Echantillons requis..."
}

/**
 * Perform a Deep Dive analysis on the Règlement de Consultation (RC).
 * 1. Find the RC file in the DCE.
 * 2. Extract text.
 * 3. AI Extraction of structured data.
 * 4. Save to Opportunity.
 */
export async function analyzeRC(opportunityId: string) {
    console.log(`🕵️ [AI Extractor] Deep Dive for Opportunity: ${opportunityId}`);

    // 1. Fetch Opportunity & Files
    const opportunity = await db.opportunity.findUnique({
        where: { id: opportunityId }
    });

    if (!opportunity || !opportunity.dceFiles) {
        throw new Error("DCE Files not found.");
    }

    // Cast dceFiles to array
    const files = opportunity.dceFiles as any[];

    // Find RC File
    // Priority: Explicit "is_priority" from Sort, or Name match
    const rcFile = files.find(f =>
        (f.category === "ADMINISTRATIF" && (f.name.toLowerCase().includes("rc") || f.name.toLowerCase().includes("reglement"))) ||
        f.is_priority === true
    ) || files.find(f => f.name.toLowerCase().endsWith(".pdf")); // Fallback to any PDF if no RC found? Risky but ok for MVP.

    if (!rcFile) {
        console.warn("⚠️ [AI Extractor] No suitable RC file found.");
        return null;
    }

    console.log(`📄 [AI Extractor] Analyzing File: ${rcFile.name}`);

    // 2. Read File Content
    // Local Storage: resolve URL to filesystem path if local
    // URL: /dce/filename -> public/dce/filename
    const relativePath = rcFile.url.replace(/^\//, ""); // Remove leading slash
    const fullPath = path.join(process.cwd(), "public", relativePath);

    if (!fs.existsSync(fullPath)) {
        throw new Error(`File not found at path: ${fullPath}`);
    }

    const buffer = await fs.promises.readFile(fullPath);
    const text = await extractTextFromPdf(buffer);

    // Truncate for Token Limit (Keep first 30k chars, usually relevant info is early)
    const truncatedText = text.substring(0, 30000);

    // 3. AI Extraction
    const systemPrompt = `
    Tu es un expert en marchés publics. Analyse ce texte (Règlement de Consultation).
    
    EXTRACTION STRICTE :
    1. Critères de Jugement : Pondération Prix vs Technique (%)
    2. Liste des Pièces Administratives et Techniques à fournir (Codes DC1, DC2, Mémoire, etc.)
    3. Contact Acheteur (Nom, Email, Tel)
    4. Notes Critiques (Visites obligatoires, Echantillons, Date limite questions)

    FORMAT JSON STRICT:
    {
      "selection_criteria": {
        "price_weight": 40,
        "technical_weight": 60,
        "other_criteria": ["RSE 10%"]
      },
      "required_documents": ["DC1", "DC2", "Memoire Technique"],
      "buyer_contact": { "name": "...", "email": "...", "phone": "..." },
      "critical_notes": "Visite obligatoire le 12/01..."
    }
    `;

    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: `Voici le document :\n${truncatedText}` },
            ],
            response_format: { type: "json_object" },
            temperature: 0
        });

        const content = completion.choices[0]?.message?.content || "{}";
        const analysis = JSON.parse(content);

        console.log("🧠 [AI Extractor] Analysis Data:", analysis);

        // 4. Save to DB
        await db.opportunity.update({
            where: { id: opportunityId },
            data: {
                analysis_summary: analysis
            }
        });

        return analysis;

    } catch (error) {
        console.error("❌ [AI Extractor] AI Error:", error);
        return null;
    }
}

/**
 * Analyzes the CCTP to extract the Plan/Structure for the Technical Memory.
 */
export async function analyzeCCTP(opportunityId: string) {
    console.log(`🏗️ [AI Extractor] CCTP Analysis for Opportunity: ${opportunityId}`);

    // 1. Fetch
    const opportunity = await db.opportunity.findUnique({
        where: { id: opportunityId }
    });

    if (!opportunity || !opportunity.dceFiles) return null;

    // Cast dceFiles to array
    const files = opportunity.dceFiles as any[];

    // Find CCTP
    const cctpFile = files.find(f =>
        (f.category === "TECHNIQUE" && (f.name.toLowerCase().includes("cctp"))) ||
        f.name.toLowerCase().includes("cctp")
    );

    if (!cctpFile) {
        console.warn("⚠️ [AI Extractor] No CCTP file found.");
        return { plan: ["1. Compréhension du besoin", "2. Méthodologie", "3. Moyens Humains", "4. Moyens Techniques", "5. RSE"] }; // Fallback Generic Plan
    }

    // 2. Extract Text
    const relativePath = cctpFile.url.replace(/^\//, "");
    const fullPath = path.join(process.cwd(), "public", relativePath);

    if (!fs.existsSync(fullPath)) return null;

    const buffer = await fs.promises.readFile(fullPath);
    const text = await extractTextFromPdf(buffer);
    const truncatedText = text.substring(0, 20000);

    // 3. AI Extract Plan
    const systemPrompt = `
    Tu es un assistant BTP. Extrais le PLAN (Grande masses) de ce CCTP pour structurer un Mémoire Technique.
    Ignore les clauses administratives, concentre-toi sur la technique et l'exécution.
    
    FORMAT JSON:
    {
      "plan": ["TITRE 1 (ex: Objet)", "TITRE 2 (ex: Description Prestations)", "TITRE 3 (ex: Contraintes)"]
    }
    `;

    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: `Voici le CCTP :\n${truncatedText}` },
            ],
            response_format: { type: "json_object" },
            temperature: 0
        });

        const content = completion.choices[0]?.message?.content || "{}";
        return JSON.parse(content);
    } catch (e) {
        console.error("❌ [AI Extractor] CCTP Error:", e);
        return { plan: ["Contexte", "Solutions Techniques", "Moyens", "Qualité"] }; // Fallback
    }
}
