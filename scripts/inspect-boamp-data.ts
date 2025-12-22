// Test pour voir ce que contient exactement le champ donnees BOAMP
import { db } from "../lib/db";

async function inspectBoampData() {
    console.log("🔍 INSPECTION DES DONNÉES BOAMP\n");

    const tender = await db.tender.findUnique({
        where: { id_boamp: "25-140157" } // CAF
    });

    if (!tender || !tender.raw_data) {
        console.log("❌ Tender ou raw_data non trouvé");
        return;
    }

    const rawData: any = tender.raw_data;

    console.log("📄 TENDER:", tender.id_boamp);
    console.log("   Titre:", tender.title);
    console.log("\n" + "=".repeat(70));

    console.log("\n📊 RAW_DATA STRUCTURE:");
    console.log("   Keys:", Object.keys(rawData).join(', '));

    console.log("\n💰 MONTANT (si présent):");
    if (rawData.donnees) {
        try {
            const donnees = typeof rawData.donnees === 'string' ? JSON.parse(rawData.donnees) : rawData.donnees;

            if (donnees.MONTANT) {
                console.log("   ✅ MONTANT trouvé!");
                console.log(JSON.stringify(donnees.MONTANT, null, 2));
            } else {
                console.log("   ❌ Pas de champ MONTANT");
            }

            if (donnees.DUREE) {
                console.log("\n⏱️ DURÉE trouvée!");
                console.log(JSON.stringify(donnees.DUREE, null, 2));
            }

            if (donnees.PROCEDURE) {
                console.log("\n📋 PROCÉDURE:");
                console.log(JSON.stringify(donnees.PROCEDURE, null, 2));
            }

            if (donnees.OBJET) {
                console.log("\n📝 OBJET:");
                console.log(JSON.stringify(donnees.OBJET, null, 2));
            }

            console.log("\n🗂️ TOUTES LES CLÉS dans DONNEES:");
            console.log(Object.keys(donnees).join(', '));

        } catch (e) {
            console.error("❌ Erreur parsing donnees:", e);
        }
    }

    console.log("\n" + "=".repeat(70));

    await db.$disconnect();
}

inspectBoampData();
