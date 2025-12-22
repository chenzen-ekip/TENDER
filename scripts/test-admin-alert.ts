import { db } from "../lib/db";
import { sendAdminDceRequestAlert } from "../lib/services/notification.service";

async function testRuntime() {
    console.log("🧪 TESTING PRISMA RUNTIME & ADMIN ALERT");

    try {
        // 1. Check Prisma Client Casing
        console.log("Checking DB access...");
        // @ts-ignore - Ignore lint explicitly to test runtime
        if (db.dCERequest) {
            console.log("✅ db.dCERequest exists");
        } else if (db.DCERequest) {
            console.log("✅ db.DCERequest exists");
        } else {
            console.log("❌ Neither casing found! Models:", Object.keys(db));
        }

        // 2. Fetch a valid opportunity
        const opp = await db.opportunity.findFirst({
            include: { client: true, tender: true }
        });

        if (!opp) {
            console.log("❌ No opportunity found to test");
            return;
        }

        console.log(`Using Opportunity: ${opp.id} (${opp.tender.title})`);

        // 3. Trigger Admin Alert
        console.log("📧 Sending Admin Alert...");
        await sendAdminDceRequestAlert(opp.id);
        console.log("✅ Alert function called.");

    } catch (e) {
        console.error("❌ Error:", e);
    }
}

testRuntime();
