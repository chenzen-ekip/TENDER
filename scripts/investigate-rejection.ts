// Script pour investiguer pourquoi un tender a été AUTO_REJECTED
import { db } from "../lib/db";

const TENDER_ID = "25-140157"; // CAF Seine-Saint-Denis

async function investigateRejection() {
    console.log("🔍 INVESTIGATION: Pourquoi le tender a été rejeté?\n");
    console.log("=".repeat(70));

    // 1. Trouver le tender
    const tender = await db.tender.findUnique({
        where: { id_boamp: TENDER_ID }
    });

    if (!tender) {
        console.log(`❌ Tender ${TENDER_ID} non trouvé dans la DB`);
        return;
    }

    console.log("📄 TENDER INFO:");
    console.log(`   ID: ${tender.id_boamp}`);
    console.log(`   Titre: ${tender.title}`);
    console.log(`   Summary: ${tender.summary.substring(0, 200)}...`);
    console.log("");

    // 2. Trouver les opportunities associées
    const opportunities = await db.opportunity.findMany({
        where: { tenderId: tender.id },
        include: {
            client: {
                include: {
                    keywords: true,
                    departments: true,
                    sniperRules: true
                }
            }
        }
    });

    console.log(`📊 OPPORTUNITIES TROUVÉES: ${opportunities.length}\n`);

    for (const opp of opportunities) {
        console.log("=".repeat(70));
        console.log(`🎯 OPPORTUNITY ${opp.id}`);
        console.log(`   Client: ${opp.client.name}`);
        console.log(`   Status: ${opp.status}`);
        console.log(`   Match Score: ${opp.match_score}`);
        console.log(`   Created: ${opp.createdAt}`);
        console.log("");

        console.log("📋 CLIENT CONFIG:");
        console.log(`   Départements: ${opp.client.departments.map(d => d.code).join(', ')}`);
        console.log(`   Mots-clés: ${opp.client.keywords.map(k => k.word).join(', ')}`);
        console.log("");

        console.log("🧠 AI ANALYSIS:");
        if (typeof opp.ai_analysis === 'string') {
            try {
                const analysis = JSON.parse(opp.ai_analysis);
                console.log(JSON.stringify(analysis, null, 2));
            } catch (e) {
                console.log(`   (Texte brut): ${opp.ai_analysis.substring(0, 300)}...`);
            }
        } else {
            console.log("   (Aucune analyse disponible)");
        }
        console.log("");

        // Sniper Rules
        if (opp.client.sniperRules) {
            console.log("🎯 SNIPER RULES:");
            const rules = opp.client.sniperRules;
            console.log(`   Certifications: ${rules.mustHaveCertifications || 'AUCUNE'}`);
            console.log(`   Mots interdits: ${rules.forbiddenKeywords || 'AUCUN'}`);
            console.log(`   Rentabilité min: ${rules.minProfitability || 0}%`);
            console.log("");
        }

        // Test de matching manuel
        console.log("🧪 TEST DE MATCHING MANUEL:");
        const tenderTextLower = (tender.title + " " + tender.summary).toLowerCase();
        const clientKeywords = opp.client.keywords.map(k => k.word.toLowerCase());
        const clientDepts = opp.client.departments.map(d => d.code);

        console.log(`   Texte du tender (lowercase): "${tenderTextLower.substring(0, 100)}..."`);
        console.log(`   Mots-clés recherchés: ${clientKeywords.join(', ')}`);
        console.log("");

        // Check keyword matches
        clientKeywords.forEach(kw => {
            const found = tenderTextLower.includes(kw);
            console.log(`   ✓ "${kw}" ${found ? '✅ TROUVÉ' : '❌ ABSENT'}`);
        });

        console.log("");
        console.log("=".repeat(70));
    }

    await db.$disconnect();
}

investigateRejection();
