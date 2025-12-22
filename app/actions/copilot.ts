"use server";

import { generateDraftResponse } from "@/lib/services/response-generator";
import { analyzeRC } from "@/lib/services/ai-extractor";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { sendAdminDceRequestAlert } from "@/lib/services/notification.service";

export async function generateDocsAction(opportunityId: string) {
    try {
        const paths = await generateDraftResponse(opportunityId);
        return { success: true, paths };
    } catch (e: any) {
        console.error("Generate Docs Error:", e);
        return { success: false, error: e.message };
    }
}

export async function runDeepDiveAction(opportunityId: string) {
    try {
        const analysis = await analyzeRC(opportunityId);
        revalidatePath(`/opportunities/${opportunityId}`);
        return { success: true, analysis };
    } catch (e: any) {
        console.error("Deep Dive Error:", e);
        return { success: false, error: e.message };
    }
}

/**
 * PHASE 4: CONCIERGE MODE
 * User clicks "GO" -> Creates DCERequest -> Admin Notified.
 */
export async function requestDceAction(opportunityId: string) {
    try {
        console.log(`🙋‍♂️ [Copilot] DCE Request for Opp: ${opportunityId}`);

        // Use the robust captureDCE action which handles DB + Notifications
        const { captureDCE } = await import("./dce");
        const result = await captureDCE(opportunityId);

        return result;
    } catch (e: any) {
        console.error("Request DCE Error:", e);
        return { success: false, message: "Erreur lors de la demande." };
    }
}
