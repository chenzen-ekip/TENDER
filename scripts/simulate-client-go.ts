import { db } from "@/lib/db";
import { requestDceAction } from "@/app/actions/copilot";

async function main() {
    // Trouve la dernière opportunité créée
    const opp = await db.opportunity.findFirst({
        orderBy: { createdAt: 'desc' },
        include: { tender: true, client: true }
    });

    if (!opp) {
        console.log("❌ Aucune opportunité trouvée.");
        console.log("💡 Lance d'abord le Cron pour créer des opportunités.");
        return;
    }

    console.log(`🎯 Simulation du clic "GO" pour:`);
    console.log(`   Client: ${opp.client.name}`);
    console.log(`   Marché: ${opp.tender.title.substring(0, 60)}...`);
    console.log(`   ID: ${opp.id}`);

    // Simule le clic "GO"
    const result = await requestDceAction(opp.id);

    if (result.success) {
        console.log(`\n✅ Status changé en DCE_REQUESTED`);
        console.log(`📧 Email admin envoyé !`);
        console.log(`\n👉 Va sur: http://localhost:3000/admin/pending-requests`);
    } else {
        console.error(`❌ Erreur:`, result.error);
    }
}

main()
    .catch(console.error)
    .finally(async () => {
        await db.$disconnect();
        process.exit();
    });
