// Script pour ajouter des variantes de mots-clés au client SBL
import { db } from "../lib/db";

const KEYWORD_VARIANTS = [
    "nettoyage",
    "entretien",
    "prestations de nettoyage",
    "nettoyage de locaux",
    "nettoyage des locaux",
    "nettoyage des espaces",
    "entretien des locaux",
    "entretien de bâtiments"
];

async function expandKeywords() {
    console.log("🔧 EXPANSION DES MOTS-CLÉS\n");

    // Trouver le client SBL
    const client = await db.client.findFirst({
        where: { name: "SBL" },
        include: { keywords: true }
    });

    if (!client) {
        console.error("❌ Client SBL non trouvé!");
        return;
    }

    console.log(`✓ Client: ${client.name}`);
    console.log(`\nMots-clés actuels:`);
    client.keywords.forEach(k => console.log(`  - ${k.word}`));

    // Supprimer les anciens keywords
    await db.clientKeyword.deleteMany({
        where: { clientId: client.id }
    });

    console.log(`\n✅ Anciens mots-clés supprimés`);

    // Ajouter les nouvelles variantes
    for (const keyword of KEYWORD_VARIANTS) {
        await db.clientKeyword.create({
            data: {
                clientId: client.id,
                word: keyword
            }
        });
        console.log(`  ✓ Ajouté: "${keyword}"`);
    }

    console.log(`\n✅ ${KEYWORD_VARIANTS.length} mots-clés configurés`);
    console.log("\n💡 Ces variantes permettront de catcher:");
    console.log("   - 'nettoyage des espaces' (Musée Rodin)");
    console.log("   - 'nettoyage et entretien des locaux' (CAF)");
    console.log("   - 'entretien des bâtiments' (CCPMF)");

    await db.$disconnect();
}

expandKeywords();
