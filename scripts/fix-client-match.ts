
import { db } from "@/lib/db";

async function main() {
    console.log("🛠️ Correction automatique du Client pour matcher le marché #2...");

    const client = await db.client.findFirst({
        where: { active: true }
    });

    if (!client) {
        console.error("❌ Aucun client actif.");
        return;
    }

    console.log(`👤 Client trouvé: ${client.name}`);

    // Add 'infrastructure' keyword
    await db.clientKeyword.create({
        data: {
            word: "infrastructure",
            clientId: client.id
        }
    });

    console.log("✅ Mot-clé 'infrastructure' ajouté avec succès !");
    console.log("👉 Vous pouvez maintenant relancer le Cron ou le script de debug.");
}

main()
    .catch(console.error)
    .finally(async () => await db.$disconnect());
