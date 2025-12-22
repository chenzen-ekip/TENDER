// Script pour récupérer et analyser les marchés manqués avec le nouveau contexte enrichi
import { db } from "../lib/db";
import { mapTenderToDbObject, matchesClientSetup } from "../lib/services/tender-engine";
import { analyzeTender } from "../lib/services/ai-sniper";
import { sendOpportunityAlert } from "../lib/services/notification.service";

const MISSED_TENDER_IDS = [
    "25-140808", // Musée Rodin - 75
    "25-139993"  // CCPMF - 77
];

// Le tender 25-140157 (CAF) est déjà dans la DB, on le ré-analyse juste

async function recoverMissedTenders() {
    console.log("🔄 RÉCUPÉRATION DES MARCHÉS MANQUÉS\n");
    console.log("=".repeat(70));

    // 1. Récupérer le client SBL
    const client = await db.client.findFirst({
        where: { name: "SBL" },
        include: { keywords: true, departments: true }
    });

    if (!client) {
        console.error("❌ Client SBL non trouvé!");
        return;
    }

    console.log(`✓ Client trouvé: ${client.name}`);
    console.log(`  Départements: ${client.departments.map(d => d.code).join(', ')}`);
    console.log(`  Mots-clés: ${client.keywords.map(k => k.word).join(', ')}\n`);

    const keywords = client.keywords.map(k => k.word);
    const regions = client.departments.map(d => d.code);

    // 2. Fetch les tenders manqués depuis BOAMP
    for (const tenderId of MISSED_TENDER_IDS) {
        console.log(`\n${"=".repeat(70)}`);
        console.log(`📥 Récupération du tender: ${tenderId}`);

        try {
            const baseUrl = "https://boamp-datadila.opendatasoft.com/api/explore/v2.1/catalog/datasets/boamp/records";
            const whereClause = encodeURIComponent(`idweb = "${tenderId}"`);
            const query = `?where=${whereClause}&limit=1`;

            const response = await fetch(baseUrl + query);
            const data = await response.json();

            if (!data.results || data.results.length === 0) {
                console.log(`   ❌ PAS TROUVÉ sur BOAMP`);
                continue;
            }

            const rawTender = data.results[0];
            console.log(`   ✅ Trouvé sur BOAMP: ${rawTender.objet}`);

            // 3. Vérifier le matching
            if (!matchesClientSetup(rawTender, { keywords, regions })) {
                console.log(`   ⚠️ NE MATCHE PAS les critères du client`);
                continue;
            }

            console.log(`   ✅ MATCH confirmé!`);

            // 4. Créer le tender en DB
            const tenderData = mapTenderToDbObject(rawTender);
            const tender = await db.tender.upsert({
                where: { id_boamp: tenderData.id_boamp },
                update: {
                    title: tenderData.title,
                    summary: tenderData.summary,
                    pdf_url: tenderData.pdf_url,
                    raw_data: tenderData.raw_data
                },
                create: tenderData
            });

            console.log(`   ✅ Tender créé/mis à jour dans la DB`);

            // 5. Créer l'opportunity
            const existingOpp = await db.opportunity.findUnique({
                where: { clientId_tenderId: { clientId: client.id, tenderId: tender.id } }
            });

            if (existingOpp) {
                console.log(`   ⚠️ Opportunity déjà existante, skip`);
                continue;
            }

            const opportunity = await db.opportunity.create({
                data: {
                    clientId: client.id,
                    tenderId: tender.id,
                    status: "ANALYSIS_PENDING",
                    match_score: 0,
                    ai_analysis: "Pending Analysis..."
                }
            });

            console.log(`   ✅ Opportunity créée: ${opportunity.id}`);

            // 6. Analyser avec l'AI (nouveau contexte enrichi)
            console.log(`   🤖 Lancement analyse AI...`);
            const analysisResult = await analyzeTender(opportunity.id);

            if (analysisResult?.status === "VALIDATED") {
                console.log(`   ✅ VALIDÉ par l'AI!`);

                // 7. Envoyer la notification
                console.log(`   📧 Envoi notification...`);
                await sendOpportunityAlert(opportunity.id);
                console.log(`   ✅ EMAIL ENVOYÉ!`);
            } else {
                console.log(`   ❌ Rejeté par l'AI: ${analysisResult?.status}`);
            }

        } catch (error) {
            console.error(`   ❌ ERREUR:`, error);
        }
    }

    // 3. Ré-analyser le tender CAF qui était AUTO_REJECTED
    console.log(`\n${"=".repeat(70)}`);
    console.log(`🔄 RÉ-ANALYSE DU TENDER CAF (25-140157)`);

    try {
        const cafTender = await db.tender.findUnique({
            where: { id_boamp: "25-140157" }
        });

        if (!cafTender) {
            console.log(`   ❌ Tender CAF non trouvé dans la DB`);
        } else {
            const cafOpp = await db.opportunity.findFirst({
                where: {
                    tenderId: cafTender.id,
                    clientId: client.id
                }
            });

            if (!cafOpp) {
                console.log(`   ❌ Opportunity CAF non trouvée`);
            } else {
                console.log(`   ✓ Opportunity trouvée: ${cafOpp.id}`);
                console.log(`   Status actuel: ${cafOpp.status}`);

                // Reset status pour ré-analyser
                await db.opportunity.update({
                    where: { id: cafOpp.id },
                    data: {
                        status: "ANALYSIS_PENDING",
                        ai_analysis: "Re-analyzing with enriched context..."
                    }
                });

                console.log(`   🤖 Lancement nouvelle analyse AI...`);
                const reanalysisResult = await analyzeTender(cafOpp.id);

                if (reanalysisResult?.status === "VALIDATED") {
                    console.log(`   ✅ VALIDÉ cette fois!`);

                    console.log(`   📧 Envoi notification...`);
                    await sendOpportunityAlert(cafOpp.id);
                    console.log(`   ✅ EMAIL ENVOYÉ!`);
                } else {
                    console.log(`   ❌ Toujours rejeté: ${reanalysisResult?.status}`);
                }
            }
        }
    } catch (error) {
        console.error(`   ❌ ERREUR CAF:`, error);
    }

    console.log(`\n${"=".repeat(70)}`);
    console.log(`✅ RÉCUPÉRATION TERMINÉE`);
    console.log(`${"=".repeat(70)}`);

    await db.$disconnect();
}

recoverMissedTenders();
