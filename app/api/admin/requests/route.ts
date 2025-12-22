import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
    try {
        const pendingRequests = await db.dCERequest.findMany({
            where: { status: "PENDING" },
            include: {
                opportunity: {
                    include: {
                        tender: true,
                        client: true
                    }
                }
            },
            orderBy: { createdAt: "desc" }
        });

        // Transform for UI
        const data = pendingRequests.map(req => ({
            id: req.id,
            opportunityId: req.opportunityId,
            tender: {
                title: req.opportunity.tender.title,
                id_boamp: req.opportunity.tender.id_boamp,
                pdf_url: req.opportunity.tender.pdf_url
            },
            client: {
                name: req.opportunity.client.name
            },
            status: req.status,
            createdAt: req.createdAt
        }));

        return NextResponse.json(data);
    } catch (error) {
        console.error("Admin Requests API Error:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
