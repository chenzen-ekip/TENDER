// Script to check why specific tenders were missed
import { db } from "../lib/db";

const MISSED_TENDER_IDS = [
    "25-140808", // Musée Rodin - 75
    "25-140157", // CAF Seine-Saint-Denis - 93
    "25-139993"  // CCPMF - 77
];

async function checkMissedTenders() {
    console.log("🔍 DIAGNOSTIC DES MARCHÉS MANQUÉS\n");

    // 1. Vérifier la configuration des clients actifs
    console.log("📋 STEP 1: Configuration des clients actifs");
    console.log("=".repeat(60));

    const clients = await db.client.findMany({
        where: { active: true },
        include: {
            keywords: true,
            departments: true
        }
    });

    console.log(`\nNombre de clients actifs: ${clients.length}\n`);

    for (const client of clients) {
        console.log(`Client: ${client.name} (ID: ${client.id})`);
        console.log(`  Email: ${client.email}`);
        console.log(`  Départements: ${client.departments.map(d => d.code).join(', ') || 'AUCUN'}`);
        console.log(`  Mots-clés: ${client.keywords.map(k => k.word).join(', ') || 'AUCUN'}`);
        console.log(`  WhatsApp: ${client.whatsapp_phone || 'NON'}`);
        console.log('');
    }

    // 2. Vérifier si les marchés manqués sont dans la DB
    console.log("\n📦 STEP 2: Vérification dans la base de données");
    console.log("=".repeat(60));

    for (const tenderId of MISSED_TENDER_IDS) {
        console.log(`\n🔎 Recherche du marché: ${tenderId}`);

        const tender = await db.tender.findUnique({
            where: { id_boamp: tenderId }
        });

        if (tender) {
            console.log(`  ✅ TROUVÉ dans la DB!`);
            console.log(`     Titre: ${tender.title}`);
            console.log(`     Status: ${tender.status}`);

            // Chercher les opportunities associées
            const opportunities = await db.opportunity.findMany({
                where: { tenderId: tender.id },
                include: { client: true }
            });

            if (opportunities.length > 0) {
                console.log(`     Opportunities créées: ${opportunities.length}`);
                opportunities.forEach(opp => {
                    console.log(`       - Client: ${opp.client.name}`);
                    console.log(`         Status: ${opp.status}`);
                    console.log(`         Match Score: ${opp.match_score}`);
                });
            } else {
                console.log(`     ❌ AUCUNE OPPORTUNITY CRÉÉE!`);
            }
        } else {
            console.log(`  ❌ PAS TROUVÉ dans la DB - Le tender n'a jamais été récupéré!`);
        }
    }

    // 3. Vérifier la dernière exécution du cron
    console.log("\n\n⏰ STEP 3: État du système");
    console.log("=".repeat(60));

    const systemState = await db.systemState.findUnique({
        where: { id: "global_config" }
    });

    if (systemState) {
        console.log(`Dernière vérification: ${systemState.lastCheckDate}`);
        const hoursSince = (Date.now() - systemState.lastCheckDate.getTime()) / (1000 * 60 * 60);
        console.log(`Il y a ${hoursSince.toFixed(1)} heures`);
    } else {
        console.log("❌ AUCUN ÉTAT SYSTÈME TROUVÉ - Le cron n'a jamais tourné?");
    }

    // 4. Test de récupération BOAMP en direct
    console.log("\n\n🌐 STEP 4: Test de récupération BOAMP (API directe)");
    console.log("=".repeat(60));

    for (const tenderId of MISSED_TENDER_IDS) {
        console.log(`\n🔎 Recherche BOAMP pour: ${tenderId}`);

        try {
            const baseUrl = "https://boamp-datadila.opendatasoft.com/api/explore/v2.1/catalog/datasets/boamp/records";
            const whereClause = encodeURIComponent(`idweb = "${tenderId}"`);
            const query = `?where=${whereClause}&limit=1`;

            const response = await fetch(baseUrl + query);
            const data = await response.json();

            if (data.results && data.results.length > 0) {
                const result = data.results[0];
                console.log(`  ✅ TROUVÉ sur BOAMP!`);
                console.log(`     Titre: ${result.objet}`);
                console.log(`     Date publication: ${result.dateparution}`);
                console.log(`     Départements: ${result.code_departement?.join(', ') || 'N/A'}`);

                // Extraire les premiers mots du contenu
                const preview = result.objet?.substring(0, 100) || '';
                console.log(`     Aperçu: ${preview}...`);
            } else {
                console.log(`  ❌ PAS TROUVÉ sur BOAMP!`);
            }
        } catch (error) {
            console.error(`  ❌ ERREUR API:`, error);
        }
    }

    console.log("\n\n" + "=".repeat(60));
    console.log("📊 DIAGNOSTIC TERMINÉ");
    console.log("=".repeat(60));

    await db.$disconnect();
}

checkMissedTenders();
