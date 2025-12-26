
import { db } from "../lib/db";

async function checkClientLocation() {
    const client = await db.client.findFirst({
        where: { name: "apoem nettoyage" },
        select: { name: true, departments: true }
    });
    console.log("Client Location:", JSON.stringify(client, null, 2));
}

checkClientLocation();
