
import { db } from "../lib/db";

async function findApoem() {
    const clients = await db.client.findMany({
        where: {
            name: {
                contains: "Apoem"
            }
        }
    });
    console.log("Found clients:", JSON.stringify(clients, null, 2));
}

findApoem();
