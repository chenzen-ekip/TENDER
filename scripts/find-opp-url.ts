
import { db } from "../lib/db";

async function globalSearch() {
    const tender = await db.tender.findFirst({
        where: {
            title: {
                contains: "Vésinet"
            }
        },
        select: {
            id: true,
            opportunities: {
                select: { id: true }
            }
        }
    });
    console.log("Search Result:", JSON.stringify(tender, null, 2));
}

globalSearch();
