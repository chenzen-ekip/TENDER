// Vérifier ce que l'AI reçoit comme contexte pour le tender CAF
import { db } from "../lib/db";

const TENDER_ID = "25-140157";

async function checkAIContext() {
    console.log("🔍 VÉRIFICATION DU CONTEXTE AI\n");

    const tender = await db.tender.findUnique({
        where: { id_boamp: TENDER_ID }
    });

    if (!tender) {
        console.log("❌ Tender non trouvé");
        return;
    }

    console.log("📄 CE QUE L'AI REÇOIT ACTUELLEMENT:\n");
    console.log("=".repeat(70));

    const tenderText = `
    Titre: ${tender.title}
    Résumé: ${tender.summary}
    Description complète: ... (Simulation contenu PDF) ...
  `;

    console.log(tenderText);
    console.log("=".repeat(70));

    console.log("\n❌ PROBLÈME DÉTECTÉ:");
    console.log(`   Le "Résumé" est: "${tender.summary}"`);

    if (tender.summary === "Voir détail" || tender.summary.length < 50) {
        console.log("   ⚠️ Le résumé est VIDE ou générique!");
        console.log("   L'AI ne reçoit AUCUN contexte métier réel!");
        console.log("");
        console.log("💡 SOLUTION:");
        console.log("   Enrichir le contexte AI avec:");
        console.log("   1. Les données BOAMP brutes (field 'donnees' en JSON)");
        console.log("   2. Le contenu du PDF si disponible");
        console.log("   3. Tous les champs pertinents de l'API BOAMP");
    }

    await db.$disconnect();
}

checkAIContext();
