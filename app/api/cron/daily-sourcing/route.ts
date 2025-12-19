
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fetchRawTenders, matchesClientSetup, mapTenderToDbObject } from "@/lib/services/tender-engine";
import { analyzeTender } from "@/lib/services/ai-sniper";
import { sendOpportunityAlert } from "@/lib/services/notification.service";

// Prevent caching
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    // 0. Security Check
    const authHeader = request.headers.get("authorization");
    const isDev = process.env.NODE_ENV === "development";

    // Check if valid secret or dev mode override
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && !isDev) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        const stats = {
            sourcing: 0,
            analysis: 0,
            notifications: 0,
        };

        console.log("⏳ [Cron] Starting Daily Sourcing Job...");

        // --- STEP 1: Sourcing (Fetch tenders ONCE) ---
        // 1. Get System State (Last Check Date)
        let state = await db.systemState.findUnique({ where: { id: "global_config" } });

        // Default to 24h ago if first run
        const lastDate = state?.lastCheckDate || new Date(Date.now() - 24 * 60 * 60 * 1000);

        // 2. Fetch only NEW tenders using Buffered Logic
        const rawTenders = await fetchRawTenders(lastDate);

        const clients = await db.client.findMany({
            where: { active: true }, // Filter active clients
            include: {
                keywords: true,
                departments: true
            }
        });
        console.log(`📋 [Cron] Found ${clients.length} active clients to process against ${rawTenders.length} tenders.`);

        // Process each client
        for (const client of clients) {
            // Map relations to simple arrays
            const keywords = client.keywords.map((k: any) => k.word);
            const regions = client.departments.map((d: any) => d.code);

            console.log(`👤 Processing Client ${client.name} (Regions: ${regions.length ? regions : "ALL"}, Keywords: ${keywords})`);

            for (const rawTender of rawTenders) {
                // Check match
                const isMatch = matchesClientSetup(rawTender, { keywords, regions });

                if (isMatch) {
                    // 1. Ensure Tender exists in DB
                    // Note: Ideally we upsert tenders in batch, but for now we do it lazily or here
                    // To avoid massive Promise.all, we do singular operations or we could mapTenderToDbObject
                    const tenderData = mapTenderToDbObject(rawTender);

                    const tender = await db.tender.upsert({
                        where: { id_boamp: tenderData.id_boamp },
                        update: {
                            title: tenderData.title,
                            summary: tenderData.summary,
                            pdf_url: tenderData.pdf_url
                        },
                        create: tenderData
                    });

                    // 2. Create Opportunity
                    // Check existence
                    const existingOpp = await db.opportunity.findUnique({
                        where: {
                            clientId_tenderId: {
                                clientId: client.id,
                                tenderId: tender.id
                            }
                        }
                    });

                    if (!existingOpp) {
                        console.log(`✨ [Match] New Opportunity for ${client.name}: ${tender.title.substring(0, 30)}...`);
                        await db.opportunity.create({
                            data: {
                                clientId: client.id,
                                tenderId: tender.id,
                                status: "ANALYSIS_PENDING",
                                match_score: 0,
                                ai_analysis: "Pending GPT-4o analysis..."
                            }
                        });
                        stats.sourcing++;
                    }
                }
            }
        }

        // --- STEP 2: AI Analysis (Process pending opportunities) ---
        const pendingOpportunities = await db.opportunity.findMany({
            where: {
                status: "ANALYSIS_PENDING",
            },
        });
        console.log(`🤖 [Cron] Found ${pendingOpportunities.length} opportunities to analyze.`);

        // Run analysis sequentially to avoid rate limits (if any) or parallel if robust
        // Using Promise.all for speed, assuming OpenAI rate limits are handled or high enough
        await Promise.all(
            pendingOpportunities.map(async (opp: { id: string }) => {
                await analyzeTender(opp.id);
                stats.analysis++;
            })
        );

        // --- STEP 3: Notifications (Send alerts for waiting decisions) ---
        // Vital: SIMPLIFIED for Robustness/Demo. Fetch all waiting decisions. 
        // Logic inside sendOpportunityAlert handles deduplication or re-sending.
        const opportunitiesToNotify = await db.opportunity.findMany({
            where: {
                status: "WAITING_CLIENT_DECISION",
                // decision_token: null, // REMOVED to allow re-runs/debug
            },
            include: {
                client: true, // Needed for logging/checking
            }
        });
        console.log(`🔍 [Cron] Found ${opportunitiesToNotify.length} potential alerts to process (Status: WAITING_CLIENT_DECISION).`);
        console.log(`🔔 [Cron] Processing notifications...`);

        await Promise.all(
            opportunitiesToNotify.map(async (opp: { id: string, client: { whatsapp_phone: string | null } }) => {
                // Double check if client has whatsapp configured
                if (opp.client && opp.client.whatsapp_phone) {
                    await sendOpportunityAlert(opp.id);
                    stats.notifications++;
                }
            })
        );

        console.log("✅ [Cron] Job Completed successfully.", stats);

        return NextResponse.json({
            success: true,
            stats,
            timestamp: new Date().toISOString(),
        });

    } catch (error) {
        console.error("❌ [Cron] Job Failed:", error);
        return NextResponse.json(
            { success: false, error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
