// Test de la fonction fetchRawTenders mise à jour avec limite 500
import { fetchRawTenders } from "../lib/services/tender-engine";

async function testNewFetch() {
    console.log("🧪 Test de fetchRawTenders avec limite 500\n");

    const fourDaysAgo = new Date();
    fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);

    // Appel avec les paramètres (même si non utilisés dans l'API)
    const allDepartments = ["75", "91", "92", "93", "94", "95", "78"];
    const allKeywords = ["Nettoyage de locaux"];

    const results = await fetchRawTenders(fourDaysAgo, allDepartments, allKeywords);

    console.log(`\n📊 Résultats:`);
    console.log(`Total marchés récupérés: ${results.length}`);

    if (results.length > 0) {
        console.log(`\n📅 Répartition par date:`);
        const byDate: any = {};
        results.forEach((t: any) => {
            const date = t.dateparution;
            byDate[date] = (byDate[date] || 0) + 1;
        });

        Object.entries(byDate)
            .sort()
            .reverse()
            .forEach(([date, count]) => {
                console.log(`  ${date}: ${count} marchés`);
            });
    }

    // Chercher nos marchés cibles
    const targetTenders = ["25-139491", "25-138135"];
    console.log(`\n🎯 Recherche des marchés cibles:`);

    for (const targetId of targetTenders) {
        const found = results.find((t: any) => t.idweb === targetId);

        if (found) {
            console.log(`✅ TROUVÉ: ${targetId}`);
            console.log(`   ${found.objet}`);
            console.log(`   Date: ${found.dateparution}`);
            console.log(`   Depts: ${found.code_departement?.join(', ')}\n`);
        } else {
            console.log(`❌ MANQUANT: ${targetId}\n`);
        }
    }
}

testNewFetch();
