import { jsPDF } from "jspdf";

interface OpportunityData {
    tender: {
        title: string;
        buyer?: string;
    };
    ai_analysis: string;
}

export async function generateOpportunityPdf(opportunity: OpportunityData): Promise<Buffer> {
    // eslint-disable-next-line new-cap
    const doc = new jsPDF();

    const tender = opportunity.tender;
    // Handle case where analysis might be an object or string (based on user snippet vs current db)
    // Current DB has ai_analysis as string.
    const analysisText = opportunity.ai_analysis || "Analyse en cours...";

    // Style de l'en-tête
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("RAPPORT D'ANALYSE IA", 20, 20);

    doc.setLineWidth(0.5);
    doc.line(20, 25, 190, 25);

    // Informations Marché
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Acheteur :", 20, 40);
    doc.setFont("helvetica", "normal");
    doc.text(tender.buyer || "Non spécifié", 50, 40);

    doc.setFont("helvetica", "bold");
    doc.text("Objet :", 20, 50);
    doc.setFont("helvetica", "normal");
    const titleLines = doc.splitTextToSize(tender.title || "", 150);
    doc.text(titleLines, 50, 50);

    let yPos = 50 + (titleLines.length * 7) + 10;

    // Analyse de l'IA
    doc.setFillColor(240, 240, 240);
    doc.rect(20, yPos, 170, 10, "F");
    doc.setFont("helvetica", "bold");
    doc.text("ANALYSE DÉTAILLÉE :", 25, yPos + 7);

    yPos += 20;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);

    const analysisLines = doc.splitTextToSize(analysisText, 170);
    doc.text(analysisLines, 20, yPos);

    // Buffer de sortie
    return Buffer.from(doc.output('arraybuffer'));
}
