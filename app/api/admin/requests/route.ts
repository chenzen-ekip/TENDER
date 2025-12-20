
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const requests = await db.opportunity.findMany({
            where: { status: "DCE_REQUESTED" },
            include: {
                client: { select: { name: true } },
                tender: { select: { title: true, id_boamp: true, pdf_url: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(requests);
    } catch (error) {
        console.error("Fetch Requests Error:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
