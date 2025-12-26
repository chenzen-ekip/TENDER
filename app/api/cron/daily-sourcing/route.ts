import { NextResponse } from "next/server";
import { scanAllTenders } from "@/lib/cron/tender-scanner";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        console.log("⏳ [Cron] Starting centralized Sourcing Scanner...");

        // Simply delegate to the scanner brain
        const stats = await scanAllTenders();

        console.log("✅ [Cron] Sourcing Job Completed.", stats);
        return NextResponse.json({ success: true, stats });

    } catch (error: any) {
        console.error("❌ [Cron] Top-Level Job Failure:", error);
        return NextResponse.json({
            success: false,
            error: error.message || "Internal Server Error"
        }, { status: 500 });
    }
}
