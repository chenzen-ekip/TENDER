
import { db } from "../lib/db";

async function listClients() {
    const clients = await db.client.findMany({
        select: { id: true, name: true, email: true }
    });
    console.log("All Clients:", JSON.stringify(clients, null, 2));
}

listClients();
