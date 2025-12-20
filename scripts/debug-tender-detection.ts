// Debug Script: Test BOAMP API and Client Matching
// Run with: npx tsx scripts/debug-tender-detection.ts

import { db } from "../lib/db";
import { fetchRawTenders, matchesClientSetup } from "../lib/services/tender-engine";

async function debugTenderDetection() {
    console.log("🔍 Starting Tender Detection Debug...\n");

    // 1. List all active clients
    const clients = await db.client.findMany({
        where: { active: true },
        include: { keywords: true, departments: true }
    });

    console.log(`📋 Found ${clients.length} active clients:`);
    clients.forEach(client => {
        console.log(`\n  - ${client.name} (${client.email})`);
        console.log(`    Sector: ${client.sector}`);
        console.log(`    Keywords: ${client.keywords.map((k: any) => k.word).join(", ")}`);
        console.log(`    Departments: ${client.departments.map((d: any) => d.code).join(", ") || "National"}`);
    });

    // 2. Fetch tenders from BOAMP (last 4 days)
    const fourDaysAgo = new Date();
    fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);

    console.log(`\n📡 Fetching tenders from BOAMP since: ${fourDaysAgo.toISOString().split('T')[0]}`);
    const rawTenders = await fetchRawTenders(fourDaysAgo);

    console.log(`\n📦 Retrieved ${rawTenders.length} raw tenders from BOAMP\n`);

    // 3. Check for the specific tender (25-139491)
    const targetTender = rawTenders.find((t: any) =>
        t.idweb?.includes("139491") || t.id?.includes("139491")
    );

    if (targetTender) {
        console.log("✅ TARGET TENDER FOUND IN API RESPONSE:");
        console.log(JSON.stringify(targetTender, null, 2));
    } else {
        console.log("❌ TARGET TENDER NOT FOUND IN API RESPONSE");
        console.log("First tender example:");
        if (rawTenders.length > 0) {
            console.log(JSON.stringify(rawTenders[0], null, 2));
        }
    }

    // 4. Test matching logic for each client
    console.log("\n🔄 Testing matching logic:");
    for (const client of clients) {
        const keywords = client.keywords.map((k: any) => k.word);
        const regions = client.departments.map((d: any) => d.code);

        let matches = 0;
        for (const tender of rawTenders) {
            if (matchesClientSetup(tender, { keywords, regions })) {
                matches++;
            }
        }

        console.log(`\n  ${client.name}: ${matches} matches`);

        // Test specific tender if found
        if (targetTender) {
            const isMatch = matchesClientSetup(targetTender, { keywords, regions });
            console.log(`  → Target tender (25-139491) matches ${client.name}: ${isMatch ? "✅ YES" : "❌ NO"}`);

            if (!isMatch) {
                console.log(`    - Keywords: ${keywords.join(", ")}`);
                console.log(`    - Regions: ${regions.join(", ") || "National"}`);
                console.log(`    - Tender departments: ${targetTender.code_departement}`);
                console.log(`    - Tender objet: ${targetTender.objet?.substring(0, 100)}...`);
            }
        }
    }

    await db.$disconnect();
}

debugTenderDetection().catch(console.error);
