// Script pour supprimer les opportunités du client SBL
import { db } from "../lib/db";

async function deleteOpportunities() {
    console.log("🗑️  Suppression des opportunités SBL...\n");

    const result = await db.opportunity.deleteMany({
        where: {
            client: { name: "SBL" }
        }
    });

    console.log(`✅ ${result.count} opportunité(s) supprimée(s)\n`);
    console.log("Maintenant appelez le cron pour les régénérer :");
    console.log("https://tender-dun-theta.vercel.app/api/cron/daily-sourcing\n");

    await db.$disconnect();
}

deleteOpportunities();
