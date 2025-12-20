
import { db } from "@/lib/db";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from "docx";
import fs from "fs";
import path from "path";
import { analyzeCCTP, RCAnalysis } from "./ai-extractor";

const OUTPUT_DIR = path.join(process.cwd(), "public", "drafts");

if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

export async function generateDraftResponse(opportunityId: string) {
    console.log(`📝 [ResponseCopilot] Generating Drafts for Opportunity: ${opportunityId}`);

    const opportunity = await db.opportunity.findUnique({
        where: { id: opportunityId },
        include: {
            client: true,
            tender: true
        }
    });

    if (!opportunity || !opportunity.client) throw new Error("Missing Data");

    // 1. Generate Candidacy Letter (Lettre de Candidature)
    const letterPath = await generateCandidacyLetter(opportunity);

    // 2. Generate Technical Memory Framework (Trame Mémoire Technique)
    const memoryPath = await generateTechnicalMemory(opportunity);

    return { letterPath, memoryPath };
}

async function generateCandidacyLetter(opportunity: any) {
    const { client, tender } = opportunity;
    // Safe parse analysis
    const analysis = opportunity.analysis_summary as RCAnalysis | null;

    const doc = new Document({
        sections: [{
            properties: {},
            children: [
                new Paragraph({
                    text: `${client.name}`,
                    heading: HeadingLevel.HEADING_1,
                    alignment: AlignmentType.LEFT,
                }),
                new Paragraph({
                    text: `Email: ${client.email}`,
                    alignment: AlignmentType.LEFT,
                }),
                new Paragraph({ text: "" }), // Spacing
                new Paragraph({
                    text: `Objet: Candidature pour le marché "${tender.title}"`,
                    bold: true,
                }),
                new Paragraph({ text: "" }),
                new Paragraph({
                    text: "Madame, Monsieur,",
                }),
                new Paragraph({
                    text: `Nous avons l'honneur de vous présenter la candidature de la société ${client.name} pour le marché cité en objet.`,
                    spacing: { before: 200, after: 200 }
                }),
                new Paragraph({
                    text: "Informations Clés:",
                    bold: true,
                }),
                new Paragraph({ text: `• SIRET: ${client.siret || "[A COMPLETER]"}` }),
                new Paragraph({ text: `• Chiffre d'Affaires: ${client.annualRevenue ? client.annualRevenue + " k€" : "[A COMPLETER]"}` }),
                new Paragraph({ text: `• Effectifs: ${client.employeeCount || "[A COMPLETER]"}` }),
                new Paragraph({ text: "" }),
                new Paragraph({
                    text: "Nos Références:",
                    bold: true,
                }),
                new Paragraph({ text: client.references || "[Liste des références à insérer]" }),
                new Paragraph({ text: "" }),
                new Paragraph({
                    text: "Pièces Jointes:",
                    bold: true,
                }),
                ...(analysis?.required_documents || ["DC1", "DC2"]).map((doc: string) =>
                    new Paragraph({ text: `• ${doc}` })
                ),
                new Paragraph({ text: "" }),
                new Paragraph({
                    text: "Nous restons à votre disposition pour tout complément d'information.",
                }),
                new Paragraph({ text: "" }),
                new Paragraph({
                    text: "Cordialement,",
                }),
                new Paragraph({
                    text: "La Direction",
                    bold: true,
                    spacing: { before: 400 }
                }),
            ],
        }],
    });

    const fileName = `Lettre_Candidature_${opportunity.id.substring(0, 8)}.docx`;
    const filePath = path.join(OUTPUT_DIR, fileName);
    const buffer = await Packer.toBuffer(doc);
    await fs.promises.writeFile(filePath, buffer);

    return `/drafts/${fileName}`;
}

async function generateTechnicalMemory(opportunity: any) {
    // AI Analysis of CCTP to get the Plan
    const cctpData = await analyzeCCTP(opportunity.id);
    const plan = cctpData?.plan || ["1. Compréhension", "2. Méthodologie", "3. Moyens", "4. Planning", "5. RSE"];

    const children = [
        new Paragraph({
            text: "MEMOIRE TECHNIQUE",
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
        }),
        new Paragraph({
            text: `Marché: ${opportunity.tender.title}`,
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 }
        }),
    ];

    // Add dynamic sections based on CCTP Plan
    plan.forEach((title: string) => {
        children.push(
            new Paragraph({
                text: title,
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 200, after: 100 }
            }),
            new Paragraph({
                text: "[Décrivez ici votre approche spécifique pour ce point...]",
                style: "Normal",
                spacing: { after: 200 }
            })
        );
    });

    const doc = new Document({
        sections: [{
            properties: {},
            children: children,
        }],
    });

    const fileName = `Memoire_Technique_Cadre_${opportunity.id.substring(0, 8)}.docx`;
    const filePath = path.join(OUTPUT_DIR, fileName);
    const buffer = await Packer.toBuffer(doc);
    await fs.promises.writeFile(filePath, buffer);

    return `/drafts/${fileName}`;
}
