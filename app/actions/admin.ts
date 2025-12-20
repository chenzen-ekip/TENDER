"use server";

import { db } from "@/lib/db";
import { processDceZip } from "@/lib/services/dce-processing.service";
import { analyzeRC } from "@/lib/services/ai-extractor";
import { revalidatePath } from "next/cache";
import { sendAdminDceRequestAlert } from "@/lib/services/notification.service";

/**
 * Handles the Manual Upload of a DCE ZIP file by the Admin.
 * 1. Reads the File from FormData
 * 2. Unzips & Sorts (using processDceZip)
 * 3. Triggers Deep Dive Analysis
 * 4. Updates Status to ANALYZED (ready for docs)
 * 5. Notifies User (Future Step)
 */
export async function processManualDceAction(formData: FormData) {
    const opportunityId = formData.get("opportunityId") as string;
    const file = formData.get("file") as File;

    if (!opportunityId || !file) {
        return { success: false, error: "Données manquantes (ID ou Fichier)" };
    }

    try {
        console.log(`👨‍✈️ [Admin] Processing Manual DCE for ${opportunityId}`);

        // 1. Update Status to processing
        await db.opportunity.update({
            where: { id: opportunityId },
            data: { status: "PROCESSING_MANUAL" }
        });

        // 2. Convert File to Buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // 3. Process ZIP (Unzip -> Upload -> Sort -> Save Files to DB)
        // Note: processDceZip updates status to EXTRACTED internally, but we will overwrite it to ANALYZED later.
        const processResult = await processDceZip(buffer, opportunityId, "MANUAL_UPLOAD");

        if (!processResult.success) {
            throw new Error("Echec du traitement du ZIP");
        }

        // 4. Trigger Deep Dive Analysis
        console.log(`🧠 [Admin] Triggering Deep Dive Analysis...`);
        await analyzeRC(opportunityId);

        // 5. Final Status Update
        await db.opportunity.update({
            where: { id: opportunityId },
            data: { status: "ANALYZED" }
        });

        // 6. Notify the user? (Not strictly required by prompt but good UX)
        // For now, simpler is better. The user will see the status change if they refresh.

        revalidatePath("/admin/pending-requests");
        revalidatePath(`/opportunities/${opportunityId}`);

        return { success: true, count: processResult.count };

    } catch (error: any) {
        console.error("❌ [Admin] Upload Failed:", error);
        return { success: false, error: error.message };
    }
}
