
import { db } from "@/lib/db";
import { captureDCE } from "@/app/actions/dce";
import { analyzeRC } from "@/lib/services/ai-extractor";

async function main() {
    console.log("🤖 [TEST] Démarrage du Test Copilot (Capture + Tri + Analyse)...\n");

    // 1. Get an Opportunity
    let opp = await db.opportunity.findFirst({
        orderBy: { createdAt: 'desc' },
        include: { tender: true }
    });

    if (!opp) {
        console.log("⚠️ Aucune opportunité trouvée. On va en simuler une...");
        // Simulation logic if needed, but for now let's ask user to rely on cron
        console.error("❌ ERREUR: Vous devez d'abord avoir une opportunité (Lancez le Cron !).");
        return;
    }

    console.log(`🎯 Cible: Marché "${opp.tender.title.substring(0, 50)}..."`);
    console.log(`   ID: ${opp.id}`);

    // 2. Test DCE Capture & Sorting
    console.log("\n📡 1. Lancement de la capture DCE (Téléchargement + Tri IA)...");
    const dceResult = await captureDCE(opp.id);

    if (dceResult.success) {
        console.log("   ✅ Capture Réussie !");
        console.log("   📂 Fichiers Triés par l'IA :");

        // Fetch updated files from DB
        const updatedOpp = await db.opportunity.findUnique({
            where: { id: opp.id }
        });

        if (!updatedOpp) return;

        // Force cast to any to bypass stale Prisma types (EPERM issue)
        const files = (updatedOpp as any).dceFiles || [];

        const categories = ["Administratif", "Technique", "Financier", "Autre"];
        categories.forEach(cat => {
            const catFiles = files.filter((f: any) => f.category === cat);
            if (catFiles.length > 0) {
                console.log(`      📁 [${cat}]`);
                catFiles.forEach((f: any) => console.log(`         - ${f.name}`));
            }
        });

    } else {
        console.error(`   ❌ Echec Capture: ${dceResult.message}`);
        // Continue anyway to test analysis if partial data exists? No.
        return;
    }

    // 3. Test Deep Dive Analysis (RC Reading)
    console.log("\n🧠 2. Lancement de l'Analyse Deep Dive (Lecture RC)...");
    try {
        const analysis = await analyzeRC(opp.id);
        console.log("   ✅ Analyse Terminée !");
        console.log("\n   📊 [RESULTATS DE L'IA]");
        console.log("   ----------------------");
        console.log(`   💰 Poids Prix : ${analysis.selection_criteria.price_weight}%`);
        console.log(`   🛠️ Poids Technique : ${analysis.selection_criteria.technical_weight}%`);
        console.log(`   📄 Pièces Requises : [${analysis.required_documents.join(", ")}]`);
        console.log(`   ⚠️ Points d'Attention : ${analysis.critical_notes}`);
        console.log(`   👤 Contact Acheteur : ${analysis.buyer_contact}`);

    } catch (e: any) {
        console.error(`   ❌ Erreur Analyse: ${e.message}`);
    }

    console.log("\n✨ Test Terminé. Si vous voyez les catégories et les poids, c'est que TOUT fonctionne.");
}

main()
    .catch(console.error)
    .finally(async () => await db.$disconnect());
