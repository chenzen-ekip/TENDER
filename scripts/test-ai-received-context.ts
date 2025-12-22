// Test pour voir ce que l'AI reçoit EXACTEMENT
import { db } from "../lib/db";

async function testAIContext() {
    const opportunity = await db.opportunity.findUnique({
        where: { id: "1d300286-f41c-44f8-96e1-2f69ab32d2b7" },
        include: {
            tender: true,
            client: { include: { sniperRules: true } }
        }
    });

    if (!opportunity) return;

    const { tender } = opportunity;

    // Reproduire exactement la logique d'extraction
    let enrichedContext = `
    Titre: ${tender.title}
    Résumé: ${tender.summary}
  `;

    if (tender.raw_data && typeof tender.raw_data === 'object') {
        const rawData: any = tender.raw_data;

        enrichedContext += `\n    ID BOAMP: ${rawData.idweb || ''}`;
        enrichedContext += `\n    Département(s): ${Array.isArray(rawData.code_departement) ? rawData.code_departement.join(', ') : rawData.code_departement || ''}`;
        enrichedContext += `\n    Ville: ${rawData.ville || ''}`;

        if (rawData.donnees) {
            const donnees = typeof rawData.donnees === 'string' ? JSON.parse(rawData.donnees) : rawData.donnees;
            const eforms = donnees.EFORMS || donnees.CONTRAT || donnees;

            console.log("\n🔍 CONTEXTE EXACT QUE L'AI REÇOIT:");
            console.log("=".repeat(70));

            // MONTANT
            if (eforms?.['cac:RequestedTenderTotal']?.['cbc:EstimatedOverallContractAmount']) {
                const montantData = eforms['cac:RequestedTenderTotal']['cbc:EstimatedOverallContractAmount'];
                const montant = montantData['#text'] || montantData;
                const devise = montantData['@currencyID'] || 'EUR';
                const montantNum = parseInt(montant);
                const montantText = `${montantNum.toLocaleString('fr-FR')} ${devise} HT (soit ${(montantNum / 1000000).toFixed(2)}M€)`;
                enrichedContext += `\n\n    💰 MONTANT ESTIMÉ: ${montantText}`;
                console.log(`\n💰 MONTANT EXTRAIT: ${montantText}`);
            } else {
                console.log(`\n❌ MONTANT NON TROUVÉ`);
            }

            // DURÉE
            if (eforms?.['cac:PlannedPeriod']?.['cbc:DurationMeasure']) {
                const dureeData = eforms['cac:PlannedPeriod']['cbc:DurationMeasure'];
                const dureeNombre = parseInt(dureeData['#text'] || dureeData);
                const unite = dureeData['@unitCode'] || 'MONTH';
                const dureeText = `${dureeNombre} mois (soit ${Math.round(dureeNombre / 12)} ans)`;
                enrichedContext += `\n    ⏱️ DURÉE: ${dureeText}`;
                console.log(`⏱️ DURÉE EXTRAITE: ${dureeText}`);
            } else {
                console.log(`❌ DURÉE NON TROUVÉE`);
            }

            // DATE DÉBUT
            if (eforms?.['cac:PlannedPeriod']?.['cbc:StartDate']) {
                const startDate = eforms['cac:PlannedPeriod']['cbc:StartDate'];
                enrichedContext += `\n    📅 DATE DE DÉBUT: ${startDate}`;
                console.log(`📅 DATE EXTRAITE: ${startDate}`);
            }
        }
    }

    console.log("\n=".repeat(70));
    console.log("\n📄 CONTEXTE COMPLET ENVOYÉ À L'AI:\n");
    console.log(enrichedContext);
    console.log("\n=".repeat(70));

    await db.$disconnect();
}

testAIContext();
