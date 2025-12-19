
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fetchRawTenders, matchesClientSetup, mapTenderToDbObject } from "@/lib/services/tender-engine";
import { analyzeTender } from "@/lib/services/ai-sniper";
import { sendOpportunityAlert } from "@/lib/services/notification.service";

// Prevent caching
export const dynamic = 'force-dynamic';
// Deploy Trigger: V2 Flux Mode


export async function GET(request: Request) {
    // 0. Security Check - REMOVED for Easy Trigger
    // const authHeader = request.headers.get("authorization");
    // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) { ... }


    try {
        const stats = {
            sourcing: 0,
            analysis: 0,
            notifications: 0,
            errors: 0
        };

        const MAX_ANALYSIS_LIMIT = 5; // Vercel Timeout Protection
        console.log("⏳ [Cron] Starting Daily Sourcing Job...");

        // --- STEP 1: Sourcing (Fetch & Persist Only) ---
        let state = await db.systemState.findUnique({ where: { id: "global_config" } });
        const lastDate = state?.lastCheckDate || new Date(Date.now() - 24 * 60 * 60 * 1000);

        // Fetch NEW tenders
        // Note: fetchRawTenders should ideally respect the short interval
        // We assume it fetches everything SINCE lastDate.
        const rawTenders = await fetchRawTenders(lastDate);

        const clients = await db.client.findMany({
            where: { active: true },
            include: { keywords: true, departments: true }
        });
        console.log(`📋 [Cron] Found ${clients.length} clients, ${rawTenders.length} tenders.`);

        // Persist Candidates
        for (const client of clients) {
            const keywords = client.keywords.map((k: any) => k.word);
            const regions = client.departments.map((d: any) => d.code);

            for (const rawTender of rawTenders) {
                if (matchesClientSetup(rawTender, { keywords, regions })) {
                    const tenderData = mapTenderToDbObject(rawTender);

                    // Upsert Tender
                    const tender = await db.tender.upsert({
                        where: { id_boamp: tenderData.id_boamp },
                        update: { title: tenderData.title, summary: tenderData.summary, pdf_url: tenderData.pdf_url },
                        create: tenderData
                    });

                    // Check duplicate Opportunity
                    const existingOpp = await db.opportunity.findUnique({
                        where: { clientId_tenderId: { clientId: client.id, tenderId: tender.id } }
                    });

                    if (!existingOpp) {
                        await db.opportunity.create({
                            data: {
                                clientId: client.id,
                                tenderId: tender.id,
                                status: "ANALYSIS_PENDING",
                                match_score: 0,
                                ai_analysis: "Pending Analysis..."
                            }
                        });
                        stats.sourcing++;
                    }
                }
            }
        }

        // --- STEP 2: Limited Processing Loop (Analysis + Notify) ---
        // Pick top N 'ANALYSIS_PENDING' opportunities to process
        // This handles both new finds AND backlog from previous timeouts
        const candidates = await db.opportunity.findMany({
            where: { status: "ANALYSIS_PENDING" },
            take: MAX_ANALYSIS_LIMIT,
            orderBy: { createdAt: 'asc' }, // FIFO
            include: { client: true } // Need client for phone check later?
        });

        console.log(`⚡ [Cron] Processing batch of ${candidates.length} candidates (Limit: ${MAX_ANALYSIS_LIMIT})`);

        for (const opp of candidates) {
            try {
                // 2.1 Analyze
                // analyzeTender now returns { status, summary? }
                const analysisResult = await analyzeTender(opp.id);
                stats.analysis++;

                // 2.2 Notify Immediately if VALIDATED
                if (analysisResult?.status === "VALIDATED") {
                    try {
                        // Check phone availability explicitly or rely on service
                        // We rely on service but log extensively here
                        if (opp.client?.whatsapp_phone) {
                            console.log(`📲 [Cron] Sending WhatsApp for Opp ${opp.id}...`);
                            await sendOpportunityAlert(opp.id);
                            console.log(`✅ [Cron] WhatsApp SENT for Opp ${opp.id}`);
                            stats.notifications++;
                        } else {
                            console.log(`⚠️ [Cron] No WhatsApp phone for Client ${opp.client?.name}, skipping alert.`);
                        }
                    } catch (notifyError) {
                        console.error(`❌ [Cron] Notification FAILED for Opp ${opp.id}:`, notifyError);
                        stats.errors++;
                    }
                }

            } catch (analysisError) {
                console.error(`❌ [Cron] Analysis FAILED for Opp ${opp.id}:`, analysisError);
                stats.errors++;
            }
        }

        // --- STEP 3: Update System State ---
        // Only if we actually sourced something? Or always update to move the window forward?
        // If we move the window forward, we won't re-source the same raw tenders.
        // Since we persisted them as "ANALYSIS_PENDING", they are safe in DB.
        // So we can update the date to now.
        if (rawTenders.length > 0) {
            await db.systemState.upsert({
                where: { id: "global_config" },
                update: { lastCheckDate: new Date() },
                create: { id: "global_config", lastCheckDate: new Date() }
            });
        }

        console.log("✅ [Cron] Job Completed.", stats);
        return NextResponse.json({ success: true, stats, timestamp: new Date().toISOString() });

    } catch (error) {
        console.error("❌ [Cron] Top-Level Job Failure:", error);
        return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
    }
}
