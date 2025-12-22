// Force refetch du tender CAF avec les données BOAMP complètes
import { db } from "../lib/db";
import { mapTenderToDbObject } from "../lib/services/tender-engine";

async function refetchCAFTender() {
    console.log("🔄 REFETCH TENDER CAF AVEC RAW_DATA\n");

    const tenderId = "25-140157";

    try {
        // 1. Fetch depuis BOAMP
        const baseUrl = "https://boamp-datadila.opendatasoft.com/api/explore/v2.1/catalog/datasets/boamp/records";
        const whereClause = encodeURIComponent(`idweb = "${tenderId}"`);
        const query = `?where=${whereClause}&limit=1`;

        console.log(`📡 Fetching depuis BOAMP...`);
        const response = await fetch(baseUrl + query);
        const data = await response.json();

        if (!data.results || data.results.length === 0) {
            console.log("❌ Pas trouvé sur BOAMP");
            return;
        }

        const rawTender = data.results[0];
        console.log(`✅ Trouvé: ${rawTender.objet}`);

        // 2. Map avec raw_data
        const tenderData = mapTenderToDbObject(rawTender);

        console.log("\n📦 DONNÉES QUI SERONT STOCKÉES:");
        console.log(`   id_boamp: ${tenderData.id_boamp}`);
        console.log(`   title: ${tenderData.title}`);
        console.log(`   summary: ${tenderData.summary?.substring(0, 100)}...`);
        console.log(`   raw_data présent: ${tenderData.raw_data ? '✅ OUI' : '❌ NON'}`);

        if (tenderData.raw_data) {
            const rawData: any = tenderData.raw_data;
            console.log(`\n🔍 VÉRIFICATION DU RAW_DATA:`);
            console.log(`   donnees présent: ${rawData.donnees ? '✅ OUI' : '❌ NON'}`);

            if (rawData.donnees) {
                const donnees = typeof rawData.donnees === 'string' ? JSON.parse(rawData.donnees) : rawData.donnees;
                console.log(`   CONTRAT présent: ${donnees.CONTRAT ? '✅ OUI' : '❌ NON'}`);

                if (donnees.CONTRAT) {
                    const montantPath = donnees.CONTRAT?.['cac:RequestedTenderTotal']?.['cbc:EstimatedOverallContractAmount'];
                    const dureePath = donnees.CONTRAT?.['cac:PlannedPeriod']?.['cbc:DurationMeasure'];
                    const lieuPath = donnees.CONTRAT?.['cac:RealizedLocation']?.['cac:Address'];

                    console.log(`   Montant extrait: ${montantPath ? `✅ ${montantPath['#text']} ${montantPath['@currencyID']}` : '❌ NON'}`);
                    console.log(`   Durée extraite: ${dureePath ? `✅ ${dureePath['#text']} ${dureePath['@unitCode']}` : '❌ NON'}`);
                    console.log(`   Lieu extrait: ${lieuPath ? `✅ ${lieuPath['cbc:CityName']}` : '❌ NON'}`);
                }
            }
        }

        // 3. Update dans la DB
        console.log(`\n💾 Mise à jour dans la DB...`);
        await db.tender.update({
            where: { id_boamp: tenderId },
            data: {
                title: tenderData.title,
                summary: tenderData.summary,
                pdf_url: tenderData.pdf_url,
                raw_data: tenderData.raw_data
            }
        });

        console.log(`✅ Tender mis à jour avec raw_data complet!`);
        console.log(`\n🎯 Maintenant l'AI pourra extraire toutes les infos!`);

    } catch (error) {
        console.error("❌ Erreur:", error);
    }

    await db.$disconnect();
}

refetchCAFTender();
