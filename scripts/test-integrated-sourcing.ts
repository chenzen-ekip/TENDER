import { db } from "../lib/db";
import { scanAllTenders } from "../lib/cron/tender-scanner";

async function main() {
    const days = process.argv[2] ? parseInt(process.argv[2]) : 5;
    console.log(`🚀 [Test] Manuellement déclenché pour attraper les ${days} derniers jours...`);

    try {
        // 1. Reset lastSourcingDate for all active clients to X days ago
        const catchUpDate = new Date();
        catchUpDate.setDate(catchUpDate.getDate() - days);

        console.log(`📡 Mise à jour de la date de sourcing au : ${catchUpDate.toISOString()}`);

        // @ts-ignore
        await db.client.updateMany({
            where: { active: true },
            data: { lastSourcingDate: catchUpDate }
        });

        console.log("✅ Dates de sourcing réinitialisées.");

        // 2. Trigger the scan
        const results = await scanAllTenders();

        console.log("\n📊 RÉSULTATS DU SCAN :");
        console.log(`- Clients traités : ${results.clients}`);
        console.log(`- Tenders analysés : ${results.processed_tenders}`);
        console.log(`- Opportunités validées (Match IA) : ${results.validated_opportunities}`);
        console.log(`- Erreurs : ${results.errors}`);

        if (results.validated_opportunities > 0) {
            console.log("\n🔥 DES PÉPITES ONT ÉTÉ TROUVÉES ! Vérifiez votre dashboard ou Telegram.");
        } else {
            console.log("\nℹ️ Aucun nouveau marché correspondant n'a été trouvé pour cette période.");
        }

    } catch (error) {
        console.error("❌ Erreur lors du test :", error);
    } finally {
        await db.$disconnect();
    }
}

main();
