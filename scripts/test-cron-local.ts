// Script pour tester le cron job complet en local
import { db } from "../lib/db";

async function testCronLocally() {
    console.log("🧪 TEST DU CRON JOB EN LOCAL\n");

    try {
        // Appeler l'endpoint du cron
        const baseUrl = process.env.NEXT_PUBLIC_URL || "http://localhost:3000";
        const cronUrl = `${baseUrl}/api/cron/daily-sourcing`;

        console.log(`📡 Appel de: ${cronUrl}\n`);

        const response = await fetch(cronUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        console.log("✅ RÉSULTAT DU CRON:\n");
        console.log(JSON.stringify(data, null, 2));

        console.log("\n📊 STATISTIQUES:");
        console.log(`   Sourcing: ${data.stats?.sourcing || 0} marchés détectés`);
        console.log(`   Analysis: ${data.stats?.analysis || 0} analyses AI`);
        console.log(`   Notifications: ${data.stats?.notifications || 0} emails envoyés`);
        console.log(`   Errors: ${data.stats?.errors || 0} erreurs`);

        // Vérifier les dernières opportunités créées
        console.log("\n📋 DERNIÈRES OPPORTUNITÉS CRÉÉES:\n");

        const recentOpps = await db.opportunity.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: {
                tender: true,
                client: true
            }
        });

        recentOpps.forEach((opp, i) => {
            console.log(`${i + 1}. ${opp.tender.id_boamp}`);
            console.log(`   Client: ${opp.client.name}`);
            console.log(`   Status: ${opp.status}`);
            console.log(`   Créé: ${opp.createdAt.toLocaleString()}`);
            console.log(`   AI Analysis: ${typeof opp.ai_analysis === 'string' ? opp.ai_analysis.substring(0, 50) + '...' : 'N/A'}`);
            console.log('');
        });

    } catch (error) {
        console.error("❌ ERREUR:", error);
    } finally {
        await db.$disconnect();
    }
}

testCronLocally();
