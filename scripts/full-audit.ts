
import { db } from "@/lib/db";
import { TenderEngine } from "@/lib/services/tender-engine";
import { captureDCE } from "@/app/actions/dce";
import { processDceZip } from "@/lib/services/dce-processing.service";
import AdmZip from "adm-zip";
import fs from "fs";

async function runAudit() {
    console.log("\n🕵️‍♂️ STARTING FULL SAAS AUDIT (A-Z)");
    console.log("=====================================\n");

    try {
        // ---------------------------------------------------------
        // PHASE 1: SOURCING (Can the engine find markets?)
        // ---------------------------------------------------------
        console.log("🔹 PHASE 1: SOURCING (Test Live BOAMP)");
        // We will fetch real data but limit it to avoid flooding
        // Note: fetchRawTenders is private usually, so we rely on finding existing or just checking connection.
        // Let's actually check the LAST fetched tender in DB to see if sourcing works.
        const lastTender = await db.tender.findFirst({
            orderBy: { createdAt: 'desc' },
            include: { opportunities: true }
        });

        if (!lastTender) {
            console.warn("⚠️ No tenders found in DB. Triggering a quick scan...");
            // In a real script we might trigger the engine, but let's assume cron runs.
            // For now, let's allow the user to see what's in DB.
        } else {
            console.log(`✅ Sourcing Active. Last Tender: "${lastTender.title}"`);
            console.log(`   📅 Date: ${lastTender.createdAt.toISOString()}`);
            console.log(`   🔗 Source ID: ${lastTender.id_boamp}`);
        }

        // ---------------------------------------------------------
        // PHASE 2: AI ANALYSIS (Is the brain working?)
        // ---------------------------------------------------------
        console.log("\n🔹 PHASE 2: AI ANALYSIS QUALITY");
        if (lastTender && lastTender.opportunities.length > 0) {
            const opp = await db.opportunity.findUnique({
                where: { id: lastTender.opportunities[0].id }
            });
            console.log(`✅ Analyzing Opportunity: ${opp?.id}`);
            console.log(`   🧠 AI Summary: ${opp?.ai_analysis?.substring(0, 100)}...`);

            if (opp?.ai_analysis?.includes("Non précisé")) {
                console.error("❌ FAILURE: 'Non précisé' found in analysis!");
            } else {
                console.log("✅ Data Quality: High (No generic placeholders detected)");
            }
        } else {
            console.log("⚠️ No opportunity to analyze.");
        }

        // ---------------------------------------------------------
        // PHASE 3: USER REQUEST (The Concierge Trigger)
        // ---------------------------------------------------------
        console.log("\n🔹 PHASE 3: USER REQUEST SIMULATION");
        // Create a dummy opportunity if needed, or use existing
        let testOppId = lastTender?.opportunities[0]?.id;

        if (testOppId) {
            console.log(`🙋‍♂️ Simulating User Request for: ${testOppId}`);

            // Clean up previous requests for test
            await db.dCERequest.deleteMany({ where: { opportunityId: testOppId } });

            const reqResult = await captureDCE(testOppId);
            if (reqResult.success) {
                console.log("✅ Request Created successfully.");
                console.log(`   📝 Message: ${reqResult.message}`);
            } else {
                console.error(`❌ Request Failed: ${reqResult.message}`);
            }

            // Verify DB State
            const dbReq = await db.dCERequest.findFirst({ where: { opportunityId: testOppId } });
            if (dbReq && dbReq.status === "PENDING") {
                console.log("✅ DB State Valid: Status is PENDING");
            } else {
                console.error("❌ DB State Invalid.");
            }
        }

        // ---------------------------------------------------------
        // PHASE 4: ADMIN FULFILLMENT (Unzip + Blob Upload - SERVER SIDE SIM)
        // ---------------------------------------------------------
        console.log("\n🔹 PHASE 4: ADMIN FULFILLMENT (Processing ZIP)");
        if (testOppId) {
            // 1. Create a Fake ZIP in memory
            const zip = new AdmZip();
            zip.addFile("RC_Test.pdf", Buffer.from("Fake RC Content"));
            zip.addFile("CCTP_Test.pdf", Buffer.from("Fake CCTP Content"));
            zip.addFile("BPU_Test.xls", Buffer.from("Fake BPU Content"));

            const zipBuffer = zip.toBuffer();
            console.log(`📦 Generated Mock ZIP (${zipBuffer.length} bytes)`);

            // 2. Process it (Pass Buffer directly to skip Blob Download step which requires network URL)
            // We use processDceZip directly
            console.log("⚙️ Running AI Sorting & Blob Storage (Simulation)...");

            // Pass a fake 'zipUrl' just for the function signature if needed? 
            // The service takes (buffer, oppId, zipUrl).
            await processDceZip(zipBuffer, testOppId, "https://fake-blob-url.com/file.zip");

            // 3. Verify Files in DB
            const files = await db.file.findMany({ where: { opportunityId: testOppId } });
            console.log(`\n📊 POST-PROCESSING REPORT: Found ${files.length} files.`);

            files.forEach(f => {
                console.log(`   📄 [${f.category}] ${f.name} -> ${f.url}`);
                if (f.url.includes("blob")) {
                    console.log("      ✅ Hosting: Vercel Blob");
                } else {
                    console.log("      ⚠️ Hosting: Local/Other");
                }
            });

            // 4. Verify Request Status Updated
            const finalReq = await db.dCERequest.findFirst({ where: { opportunityId: testOppId } });
            if (finalReq?.status === "READY") {
                console.log("✅ Workflow Complete: Request marked as READY.");
            } else {
                console.error(`❌ Workflow Status Error: Expected READY, got ${finalReq?.status}`);
            }
        }

    } catch (error) {
        console.error("\n💥 FATAL ERROR DURING AUDIT:", error);
    } finally {
        console.log("\n🏁 AUDIT COMPLETE.");
    }
}

runAudit();
