
import { db } from "../lib/db";

async function investigateSBL() {
    const client = await db.client.findFirst({
        where: { name: "SBL" },
    });

    if (!client) {
        console.log(JSON.stringify({ error: "Client SBL not found" }));
        return;
    }

    const opportunities = await db.opportunity.findMany({
        where: { clientId: client.id },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
            tender: true
        }
    });

    const results = opportunities.map(opp => {
        let analysis: any = {};
        try {
            analysis = opp.ai_analysis ? JSON.parse(opp.ai_analysis) : {};
        } catch (e) {
            analysis = { raw: opp.ai_analysis };
        }

        return {
            id: opp.id,
            createdAt: opp.createdAt,
            status: opp.status,
            match_score: opp.match_score,
            tender: {
                title: opp.tender.title,
                boamp_id: opp.tender.id_boamp
            },
            ai_decision: analysis.decision,
            ai_summary: analysis.client_summary ? analysis.client_summary.summary : null,
            ai_urgency: analysis.client_summary ? analysis.client_summary.urgency : null
        };
    });


    const fs = require('fs');
    fs.writeFileSync('investigation_results.json', JSON.stringify(results, null, 2));
    console.log("✅ Results written to investigation_results.json");

    await db.$disconnect();
}


investigateSBL();
