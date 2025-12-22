"use server";

import { db } from "@/lib/db";
import { processDceZip } from "@/lib/services/dce-processing.service";
import { revalidatePath } from "next/cache";

/**
 * ADMIN ONLY: Uploads a manually downloaded ZIP for a specific DCE Request.
 * 1. Process ZIP (Unzip -> Upload -> Sort)
 * 2. Update Opportunity (dceFiles)
 * 3. Update Request Status (PENDING -> READY)
 * 4. Notify User
 */
export async function adminUploadDCE(formData: FormData) {
    console.log("👮‍♂️ [ADMIN] Processing DCE Upload (Blob Mode)...");

    try {
        const blobUrl = formData.get("blobUrl") as string;
        const opportunityId = formData.get("opportunityId") as string;
        const requestId = formData.get("requestId") as string;

        if (!blobUrl || !opportunityId) {
            return { success: false, message: "URL du fichier ou ID manquant." };
        }

        console.log(`📦 Fetching Blob: ${blobUrl}`);

        // 1. Download the Blob content (Server to Vercel/AWS)
        const response = await fetch(blobUrl);
        if (!response.ok) throw new Error("Impossible de télécharger le Blob");

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // 2. Process ZIP (Unzip + AI Sort + DB Update of Opportunity)
        // This function already updates db.opportunity.dceFiles
        const result = await processDceZip(buffer, opportunityId, null);

        // 3. Update Request Status
        if (requestId) {
            await db.dCERequest.update({
                where: { id: requestId },
                data: { status: "READY" }
            });
        } else {
            // If no requestId provided, try to find pending ones and close them
            await db.dCERequest.updateMany({
                where: { opportunityId: opportunityId, status: "PENDING" },
                data: { status: "READY" }
            });
        }

        // 4. Notify User (User Email)
        // TODO: Call notification service to tell user "It's ready!"
        const { sendDceReadyNotification } = await import("@/lib/services/notification.service");
        await sendDceReadyNotification(opportunityId);

        revalidatePath("/admin/pending-requests");
        return { success: true, count: result.count, message: "DCE traité et utilisateur notifié !" };

    } catch (error: any) {
        console.error("❌ Admin Upload Failed:", error);
        return { success: false, message: error.message || "Erreur upload" };
    }
}
