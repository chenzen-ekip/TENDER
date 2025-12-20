
import { db } from "@/lib/db";
import { fetchRawTenders, matchesClientSetup } from "@/lib/services/tender-engine";

async function main() {
    console.log("🔍 [DEBUG] Analyse de la correspondance Client <-> Marchés...");

    // 1. Get Client
    const client = await db.client.findFirst({
        where: { active: true },
        include: { keywords: true, departments: true }
    });

    if (!client) {
        console.error("❌ Aucun client actif trouvé en base.");
        return;
    }

    console.log(`👤 Client: ${client.name}`);
    console.log(`   - Mots-clés: [${client.keywords.map(k => k.word).join(", ")}]`);
    console.log(`   - Départements: [${client.departments.map(d => d.code).join(", ")}]`);

    // 2. Fetch Tenders (Same logic as Cron)
    const sixDaysAgo = new Date();
    sixDaysAgo.setDate(sixDaysAgo.getDate() - 6);
    const tenders = await fetchRawTenders(sixDaysAgo);

    console.log(`📦 Récupéré: ${tenders.length} marchés du BOAMP.`);

    // 3. Test Match
    let matchCount = 0;

    tenders.forEach((tender: any, index: number) => {
        const keywords = client.keywords.map(k => k.word);
        const regions = client.departments.map(d => d.code);

        console.log(`\n--- Marché #${index + 1} ---`);
        console.log(`   Titre: ${tender.objet?.substring(0, 80)}...`);
        console.log(`   Dept: ${tender.code_departement}`);

        // Debug Region
        const rawDepts = tender.code_departement || [];
        const itemDepts = Array.isArray(rawDepts) ? rawDepts.map(String) : [String(rawDepts)];
        // Debug Keyword
        const searchContent = (tender.objet + " " + (tender.donnees || "")).toLowerCase();

        // Check indepedently
        const isRegionOK = regions.length === 0 || itemDepts.some(d => regions.includes(d));
        const isKeywordOK = keywords.some(kw => searchContent.includes(kw.toLowerCase().trim()));

        const statusIcon = (isRegionOK && isKeywordOK) ? "✅ MATCH" : "❌ REJET";
        console.log(`   ${statusIcon}`);
        console.log(`      - Région (${tender.code_departement}) : ${isRegionOK ? "OK" : "KO"}`);
        console.log(`      - Mots-clés : ${isKeywordOK ? "OK" : "KO"}`);

        if (isRegionOK && isKeywordOK) matchCount++;
    });

    console.log(`\n🎉 Résultat: ${matchCount} matches potentiels sur ${tenders.length} marchés.`);

    if (matchCount === 0) {
        console.log("\n💡 CONSEIL: Modifiez votre client pour ajouter un mot-clé présent dans les titres ci-dessus, ou videz la liste des départements.");
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await db.$disconnect());
