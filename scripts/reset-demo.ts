
import { db } from "@/lib/db";

// Usage: npx tsx scripts/reset-demo.ts [SEARCH_TERM]
// Example: npx tsx scripts/reset-demo.ts 25-138304

async function main() {
    const args = process.argv.slice(2);
    const searchTerm = args[0];

    if (!searchTerm) {
        console.error("❌ Usage: npx tsx scripts/reset-demo.ts [ID_BOAMP_OU_TITRE]");
        return;
    }

    console.log(`🗑️  Recherche de marchés contenant: "${searchTerm}"...`);

    // 1. Find Tenders matching the term
    const tenders = await db.tender.findMany({
        where: {
            OR: [
                { id_boamp: { contains: searchTerm } },
                { title: { contains: searchTerm, mode: 'insensitive' } }
            ]
        },
        include: {
            opportunities: true
        }
    });

    if (tenders.length === 0) {
        console.log("⚠️ Aucun marché trouvé.");
        return;
    }

    // 2. Delete them
    for (const tender of tenders) {
        console.log(`\n🎯 Cible trouvée: [${tender.id_boamp}] ${tender.title.substring(0, 50)}...`);
        console.log(`   - Opportunités liées: ${tender.opportunities.length}`);

        // Delete Opportunity first (though Cascade might handle it, let's be explicit)
        if (tender.opportunities.length > 0) {
            await db.opportunity.deleteMany({
                where: { tenderId: tender.id }
            });
            console.log("   ✅ Opportunités supprimées.");
        }

        // Delete Tender
        await db.tender.delete({
            where: { id: tender.id }
        });
        console.log("   ✅ Marché supprimé.");
    }

    console.log(`\n✨ Nettoyage terminé. ${tenders.length} marché(s) supprimé(s).`);
    console.log("👉 Vous pouvez relancer le Cron pour redécouvrir cette offre.");
}

main()
    .catch(console.error)
    .finally(async () => await db.$disconnect());
