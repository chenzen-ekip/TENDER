// Test final : simuler exactement le flux du cron job
import { fetchRawTenders, matchesClientSetup } from "../lib/services/tender-engine";

async function simulateCronJob() {
    console.log("🤖 SIMULATION DU CRON JOB COMPLET\n");
    console.log("=".repeat(80) + "\n");

    // 1. Fetch raw tenders
    const fourDaysAgo = new Date();
    fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);

    console.log("ÉTAPE 1: FETCH depuis BOAMP");
    console.log(`Date de début: ${fourDaysAgo.toISOString().split('T')[0]}`);

    const allDepartments = ["75", "91", "92", "93", "94", "95", "78"];
    const allKeywords = ["Nettoyage de locaux"];

    const rawTenders = await fetchRawTenders(fourDaysAgo, allDepartments, allKeywords);

    console.log(`\n✅ ${rawTenders.length} marchés récupérés\n`);
    console.log("=".repeat(80) + "\n");

    // 2. Check for target tenders
    const targetTenders = ["25-139491", "25-138135"];
    console.log("ÉTAPE 2: RECHERCHE DES MARCHÉS CIBLES DANS LE FETCH\n");

    for (const targetId of targetTenders) {
        const found = rawTenders.find((t: any) => t.idweb === targetId);

        if (found) {
            console.log(`✅ ${targetId} PRÉSENT dans le fetch`);
            console.log(`   Titre: ${found.objet}`);
            console.log(`   Date: ${found.dateparution}`);
            console.log(`   Depts: ${found.code_departement?.join(', ')}\n`);
        } else {
            console.log(`❌ ${targetId} ABSENT du fetch\n`);
        }
    }

    console.log("=".repeat(80) + "\n");

    // 3. Apply matching logic
    console.log("ÉTAPE 3: APPLICATION DU MATCHING (client SBL)\n");

    const clientSettings = {
        keywords: ["Nettoyage de locaux"],
        regions: ["75", "91", "92", "93", "94", "95", "78"]
    };

    let matchCount = 0;
    const matched: any[] = [];

    for (const tender of rawTenders) {
        if (matchesClientSetup(tender, clientSettings)) {
            matchCount++;
            matched.push(tender);
        }
    }

    console.log(`✅ ${matchCount} marchés matchent les critères du client SBL\n`);

    if (matched.length > 0) {
        console.log("Marchés matchés (premiers 5):");
        matched.slice(0, 5).forEach((t: any, i: number) => {
            console.log(`\n${i + 1}. ${t.idweb || 'N/A'}`);
            console.log(`   ${t.objet.substring(0, 80)}...`);
            console.log(`   Date: ${t.dateparution}`);
            console.log(`   Depts: ${t.code_departement?.join(', ')}`);
        });
    }

    console.log("\n" + "=".repeat(80) + "\n");

    // 4. Check if target tenders matched
    console.log("ÉTAPE 4: VÉRIFICATION SI LES CIBLES MATCHENT\n");

    for (const targetId of targetTenders) {
        const found = matched.find((t: any) => t.idweb === targetId);

        if (found) {
            console.log(`✅ ${targetId} MATCHÉ`);
        } else {
            console.log(`❌ ${targetId} NON MATCHÉ`);
        }
    }

    console.log("\n" + "=".repeat(80));
    console.log(`\n📊 RÉSUMÉ:`);
    console.log(`   Marchés fetchés: ${rawTenders.length}`);
    console.log(`   Marchés matchés: ${matchCount}`);
    console.log(`   Résultat attendu pour stats.sourcing: ${matchCount}`);
}

simulateCronJob();
