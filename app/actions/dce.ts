"use server";

import { db } from "@/lib/db";
import { scrapeDceUrl } from "@/lib/services/dce-scraper";
import { StorageService } from "@/lib/services/dce-storage";
import { sortDCEFiles } from "@/lib/services/ai-sniper";
import { processDceZip } from "@/lib/services/dce-processing.service";
import AdmZip from "adm-zip";
import { revalidatePath } from "next/cache";

export type CaptureState = {
    success: boolean;
    message: string;
    progress?: number; // 0-100
    step?: string;
};

/**
 * Orchestrates the Full DCE Capture Flow:
 * 1. Scrape Profile Acheteur -> Get ZIP URL
 * 2. Download ZIP -> Unzip in Memory
 * 3. Upload individual files to Storage
 * 4. AI Sort filenames
 * 5. Update Database
 */
export async function captureDCE(opportunityId: string): Promise<CaptureState> {
    console.log(`🎬 [DCE REQUEST] User requested DCE for Opportunity ${opportunityId}`);

    try {
        // 1. Fetch Opportunity
        const opportunity = await db.opportunity.findUnique({
            where: { id: opportunityId },
            include: { tender: true }
        });

        if (!opportunity) {
            return { success: false, message: "Opportunité introuvable." };
        }

        // 2. Check if already requested
        const existingRequest = await db.dCERequest.findFirst({
            where: { opportunityId: opportunityId }
        });

        if (existingRequest) {
            return { success: true, message: "Demande déjà prise en compte ! L'équipe s'en occupe." };
        }

        // 3. Create Request in DB
        await db.dCERequest.create({
            data: {
                opportunityId: opportunityId,
                status: "PENDING",
                userEmail: "client@example.com" // TODO: Get from Auth session
            }
        });

        // 4. Notify Admin
        // Dynamic import to avoid circular dep issues in server actions sometimes
        const { sendAdminDceRequestAlert } = await import("@/lib/services/notification.service");
        await sendAdminDceRequestAlert(opportunityId);

        console.log(`✅ [DCE REQUEST] Created request & Notified Admin.`);

        revalidatePath(`/opportunities/${opportunityId}`);
        return { success: true, message: "Demande transmise à l'équipe ! Vous recevrez le dossier sous peu." };

    } catch (error: any) {
        console.error("❌ Request Failed:", error);
        return { success: false, message: "Erreur lors de la demande." };
    }
}
