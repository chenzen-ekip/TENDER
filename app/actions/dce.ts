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
    console.log(`🎬 [DCE CAPTURE] Starting for Opportunity ${opportunityId}`);

    try {
        // 1. Fetch Opportunity
        const opportunity = await db.opportunity.findUnique({
            where: { id: opportunityId },
            include: { tender: true }
        });

        if (!opportunity || !opportunity.tender) {
            return { success: false, message: "Opportunité introuvable." };
        }

        const sourceUrl = opportunity.tender.pdf_url;
        if (!sourceUrl) {
            return { success: false, message: "Aucune URL source disponible." };
        }

        // 2. SCRAPE
        let dceUrl = opportunity.dceUrl;

        // Only scrape if we don't have the DCE URL yet
        if (!dceUrl) {
            console.log(`🕷️ Scraping ${sourceUrl}...`);
            const scrapeResult = await scrapeDceUrl(sourceUrl);

            if (!scrapeResult.success || !scrapeResult.dceUrl) {
                return {
                    success: false,
                    message: scrapeResult.error || "Impossible de trouver le lien DCE."
                };
            }

            // CRITICAL: If Scraper says it's not a direct download (e.g. it's a page), ABORT.
            // DO NOT try to unzip an HTML page!!
            if (!scrapeResult.isDirectDownload) {
                console.warn(`⚠️ Scraper returned a Page URL, not a ZIP. Aborting download.`);
                return {
                    success: false,
                    message: "Le lien direct vers le ZIP est introuvable (Page scannée uniquement)."
                };
            }
            dceUrl = scrapeResult.dceUrl;
        }

        console.log(`📦 Downloading ZIP: ${dceUrl}`);

        // 3. DOWNLOAD ZIP
        const response = await fetch(dceUrl);
        if (!response.ok) {
            return { success: false, message: `Erreur téléchargement ZIP: ${response.statusText}` };
        }

        const contentType = response.headers.get("content-type");
        if (contentType && !contentType.includes("zip") && !contentType.includes("octet-stream")) {
            console.error(`❌ Invalid Content-Type: ${contentType}`);
            return { success: false, message: "Le fichier téléchargé n'est pas un ZIP valide." };
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // 4. EXTRACT & UPLOAD & SORT (Delegated to Service)
        console.log(`📂 Unzipping & Processing...`);

        // Import service dynamically or top-level (Top-level is better, already imported?)
        // Need to import processDceZip in the file first.
        // Assuming I will add the import in a separate step or via full replace?
        // No, partial replace. I will replace the logic block first.

        await processDceZip(buffer, opportunityId, dceUrl);

        // Re-fetch opportunity to confirm? No need, service updated DB.

        revalidatePath(`/opportunities/${opportunityId}`);
        return { success: true, message: "DCE capturé et trié avec succès." };

    } catch (error: any) {
        console.error("❌ Capture Failed:", error);
        return { success: false, message: error.message || "Erreur interne" };
    }
}
