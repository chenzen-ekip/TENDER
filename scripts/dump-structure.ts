// Afficher TOUTE la structure donnees pour voir les vrais champs
import { db } from "../lib/db";

async function inspectFullStructure() {
    console.log("🔍 INSPECTION STRUCTURE COMPLÈTE\n");

    const tender = await db.tender.findUnique({
        where: { id_boamp: "25-140157" }
    });

    if (!tender || !tender.raw_data) {
        console.log("❌ Pas de raw_data");
        return;
    }

    const rawData: any = tender.raw_data;

    if (rawData.donnees) {
        const donnees = typeof rawData.donnees === 'string' ? JSON.parse(rawData.donnees) : rawData.donnees;

        console.log("📊 CLÉS PRINCIPALES dans donnees:");
        console.log(Object.keys(donnees).join(', '));
        console.log("\n" + "=".repeat(70));

        // Afficher TOUT le contenu
        console.log("\n📦 CONTENU COMPLET (JSON):\n");
        console.log(JSON.stringify(donnees, null, 2));
    }

    await db.$disconnect();
}

inspectFullStructure();
