import { db } from "@/lib/db";
import { translateBoampUrlToApi } from "@/lib/services/boamp-url-parser";
import { searchBoampTenders, fetchTenderFullHtml } from "@/lib/services/boamp-service";
import { analyzeTenderWithAI } from "@/lib/services/ai-sniper";
import { sendTelegramAlert, sendClientEmailAlert } from "@/lib/services/notifier";

/**
 * Tender Scanner - The Autonomous "Cerveau"
 * 1. Fetch Clients
 * 2. Search BOAMP (Custom URL)
 * 3. Fetch Full HTML Detail
 * 4. AI Go/No-Go Analysis
 * 5. DB Upsert & Notifications
 */
export async function scanAllTenders() {
    console.log("⏳ [Radar Industrial] Starting full autonomous scan...");

    const clients = await db.client.findMany({
        where: { active: true },
        include: { sniperRules: true }
    });

    const stats = {
        clients: clients.length,
        processed_tenders: 0,
        validated_opportunities: 0,
        errors: 0
    };

    for (const client of clients as any[]) {
        try {
            console.log(`📡 [Radar] Scanning for client: ${client.name}`);

            if (!client.searchUrl) {
                console.warn(`⚠️ [Radar] No searchUrl for ${client.name}. Skipping.`);
                continue;
            }

            // 1. Translate URL to BOAMP API Query
            const whereClause = translateBoampUrlToApi(client.searchUrl);
            const since = client.lastSourcingDate
                ? new Date(client.lastSourcingDate).toISOString().split('T')[0]
                : new Date(Date.now() - 48 * 3600000).toISOString().split('T')[0];

            const fullWhere = `(${whereClause}) AND (dateparution >= "${since}")`;

            // 2. Search BOAMP for new IDs
            const records = await searchBoampTenders(fullWhere);
            console.log(`🔍 [Radar] Found ${records.length} potential tenders for ${client.name}`);

            for (const record of records) {
                stats.processed_tenders++;
                const idweb = record.idweb;

                try {
                    // Check if Opportunity already exists (Deduplication)
                    const existingOp = await db.opportunity.findFirst({
                        where: {
                            clientId: client.id,
                            tender: { id_boamp: idweb }
                        }
                    });

                    if (existingOp) {
                        console.log(`➡️ [Radar] Skipping duplicate: ${idweb}`);
                        continue;
                    }

                    // 3. Fetch Full HTML for deep analysis
                    const fullText = await fetchTenderFullHtml(idweb);
                    if (!fullText) continue;

                    // 4. AI Sniper Analysis
                    const analysis = await analyzeTenderWithAI(fullText, client.sniperRules);
                    console.log(`🤖 [Radar] AI Analysis for ${idweb}: Score=${analysis.match_score}, Status=${analysis.status}`);

                    // 5. DB Upsert (Tender)
                    const tender = await db.tender.upsert({
                        where: { id_boamp: idweb },
                        update: {
                            title: record.title || "Sans titre",
                            summary: fullText || record.summary || "Aucun résumé",
                            deadline: record.datelimitereception ? new Date(record.datelimitereception) : null,
                            raw_data: record as any
                        },
                        create: {
                            id_boamp: idweb,
                            title: record.title || "Sans titre",
                            summary: fullText || record.summary || "Aucun résumé",
                            status: "EXTRACTED",
                            deadline: record.datelimitereception ? new Date(record.datelimitereception) : null,
                            raw_data: record as any
                        }
                    });

                    // 6. Save Opportunity & Notify if Validated
                    if (analysis.status === "VALIDATED") {
                        await db.opportunity.create({
                            data: {
                                clientId: client.id,
                                tenderId: tender.id,
                                match_score: analysis.match_score,
                                ai_analysis: analysis.ai_analysis,
                                status: "PENDING",
                                processedAt: new Date()
                            }
                        });

                        stats.validated_opportunities++;

                        // 7. Fire Alerts
                        await sendTelegramAlert(`🔔 **NOUVEAU GOLD NUGGET**\n\nClient: ${client.name}\nMarché: ${tender.title}\nScore IA: ${analysis.match_score}%\n\nL'expert doit aller voir ! 🚀`);

                        // Email (Optional - Mocked for now)
                        if (client.email) {
                            await sendClientEmailAlert(client.email, tender.title, analysis.ai_analysis, analysis.match_score, idweb, client.id);
                        }
                    }

                } catch (tenderError) {
                    console.error(`❌ [Radar] Error processing tender ${idweb}:`, tenderError);
                    stats.errors++;
                }
            }

            // 8. Update client's last sourcing date to now
            await db.client.update({
                where: { id: client.id },
                data: { lastSourcingDate: new Date() } as any
            });

        } catch (clientError) {
            console.error(`❌ [Radar] Critical failure for client ${client.name}:`, clientError);
            stats.errors++;
        }
    }

    console.log("✅ [Radar] Full Scan Completed.", stats);
    return stats;
}
