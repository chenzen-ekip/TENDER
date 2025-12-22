// Force DELETE et RE-CREATE du tender avec données complètes
import { db } from "../lib/db";

async function forceFreshTender() {
    console.log("🔄 SUPPRESSION ET RECRÉATION COMPLÈTE\n");

    const tenderId = "25-140157";

    try {
        // 1. Supprimer l'opportunity existante
        await db.opportunity.deleteMany({
            where: {
                tender: { id_boamp: tenderId }
            }
        });
        console.log("✅ Opportunity supprimée");

        // 2. Supprimer le tender
        await db.tender.delete({
            where: { id_boamp: tenderId }
        });
        console.log("✅ Tender supprimé");

        // 3. Fetch frais depuis BOAMP
        const baseUrl = "https://boamp-datadila.opendatasoft.com/api/explore/v2.1/catalog/datasets/boamp/records";
        const whereClause = encodeURIComponent(`idweb = "${tenderId}"`);
        const query = `?where=${whereClause}&limit=1`;

        console.log(`\n📡 Fetching depuis BOAMP...`);
        const response = await fetch(baseUrl + query);
        const data = await response.json();

        if (!data.results || data.results.length === 0) {
            console.log("❌ Pas trouvé");
            return;
        }

        const rawTender = data.results[0];
        console.log(`✅ Trouvé: ${rawTender.objet}`);

        // 4. Vérifier les données EFORMS
        if (rawTender.donnees) {
            const donnees = typeof rawTender.donnees === 'string' ? JSON.parse(rawTender.donnees) : rawTender.donnees;

            console.log(`\n🔍 VÉRIFICATION EFORMS:`);
            console.log(`   donnes.EFORMS existe: ${donnees.EFORMS ? '✅' : '❌'}`);

            if (donnees.EFORMS) {
                const eforms = donnees.EFORMS;
                const montant = eforms?.['cac:RequestedTenderTotal']?.['cbc:EstimatedOverallContractAmount'];
                const duree = eforms?.['cac:PlannedPeriod']?.['cbc:DurationMeasure'];

                console.log(`   Montant dans EFORMS: ${montant ? `✅ ${montant['#text']} ${montant['@currencyID']}` : '❌'}`);
                console.log(`   Durée dans EFORMS: ${duree ? `✅ ${duree['#text']} ${duree['@unitCode']}` : '❌'}`);
            }
        }

        // 5. Créer le nouveau tender avec raw_data COMPLET
        let description = "Voir détail";
        if (rawTender.donnees) {
            const j = typeof rawTender.donnees === 'string' ? JSON.parse(rawTender.donnees) : rawTender.donnees;
            if (j.OBJET?.OBJET_COMPLET) description = j.OBJET.OBJET_COMPLET;
        }

        const newTender = await db.tender.create({
            data: {
                id_boamp: rawTender.idweb,
                title: rawTender.objet || "Marché Public",
                summary: description.substring(0, 1000),
                pdf_url: rawTender.url_avis || `https://www.boamp.fr/pages/avis/?q=idweb:${rawTender.idweb}`,
                status: "EXTRACTED",
                raw_data: rawTender // TOUT l'objet BOAMP
            }
        });

        console.log(`\n✅ Nouveau tender créé: ${newTender.id}`);
        console.log(`   raw_data stocké: ${newTender.raw_data ? '✅ OUI' : '❌ NON'}`);

        // 6. Créer nouvelle opportunity pour client SBL
        const client = await db.client.findFirst({ where: { name: "SBL" } });

        if (client) {
            const newOpp = await db.opportunity.create({
                data: {
                    clientId: client.id,
                    tenderId: newTender.id,
                    status: "ANALYSIS_PENDING",
                    match_score: 0,
                    ai_analysis: "Pending"
                }
            });
            console.log(`✅ Nouvelle opportunity créée: ${newOpp.id}`);
            console.log(`\n🎯 Prêt pour analyse AI avec données complètes!`);
        }

    } catch (error) {
        console.error("❌ Erreur:", error);
    }

    await db.$disconnect();
}

forceFreshTender();
