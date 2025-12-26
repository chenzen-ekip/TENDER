
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

const prisma = new PrismaClient();

async function testIntegration() {
    console.log("🔍 [TEST] Starting n8n Integration Verification...");

    const secretKey = process.env.N8N_SECRET_KEY;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    if (!secretKey) {
        console.error("❌ [TEST] N8N_SECRET_KEY is not defined in .env");
        return;
    }

    // --- 1. Test Client Configs ---
    console.log("\n📡 [TEST 1] Fetching Client Configs...");
    try {
        const res = await fetch(`${baseUrl}/api/n8n/client-configs`, {
            headers: { "x-n8n-key": secretKey }
        });

        if (res.ok) {
            const data = await res.json() as any;
            console.log(`✅ Success! Found ${data.clients?.length} active clients.`);
            if (data.clients?.length > 0) {
                console.log(`   Sample: ${data.clients[0].name} (${data.clients[0].keywords.length} keywords)`);
            }
        } else {
            console.error(`❌ Failed! Status: ${res.status}`);
        }
    } catch (err) {
        console.error("❌ Error fetching client configs:", err);
    }

    // --- 2. Test Update Opportunity ---
    console.log("\n📡 [TEST 2] Mocking Opportunity Update...");
    try {
        // Find a real client to test with
        const client = await prisma.client.findFirst({ where: { active: true } });
        if (!client) {
            console.error("❌ No active client found in DB to test with.");
            return;
        }

        const testTender = {
            id_boamp: "TEST-" + Date.now(),
            title: "Marché de TEST n8n",
            summary: "Ceci est un test d'intégration n8n.",
            pdf_url: "https://example.com/test.pdf"
        };

        const res = await fetch(`${baseUrl}/api/n8n/update-opportunity`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-n8n-key": secretKey
            },
            body: JSON.stringify({
                clientId: client.id,
                tenderData: testTender,
                analysisResult: {
                    ai_analysis: "Analyse de test par n8n.",
                    match_score: 99,
                    status: "VALIDATED"
                }
            })
        });

        if (res.ok) {
            const data = await res.json() as any;
            console.log(`✅ Success! Opportunity updated: ${data.opportunityId}`);
        } else {
            console.error(`❌ Failed! Status: ${res.status}`);
            const text = await res.text();
            console.log("   Response:", text);
        }
    } catch (err) {
        console.error("❌ Error updating opportunity:", err);
    }

    console.log("\n🏁 [TEST] Verification complete.");
}

testIntegration()
    .catch(err => console.error(err))
    .finally(() => prisma.$disconnect());
