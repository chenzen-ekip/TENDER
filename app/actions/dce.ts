"use server";

import { db } from "@/lib/db";
import { scrapeDceUrl } from "@/lib/services/dce-scraper";
import { StorageService } from "@/lib/services/dce-storage";
import { sortDCEFiles } from "@/lib/services/ai-sniper";
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

        const sourceUrl = opportunity.tender.pdf_url || opportunity.tender.source_url;
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
            dceUrl = scrapeResult.dceUrl;
        }

        console.log(`📦 Downloading ZIP: ${dceUrl}`);

        // 3. DOWNLOAD ZIP
        const response = await fetch(dceUrl);
        if (!response.ok) {
            return { success: false, message: `Erreur téléchargement ZIP: ${response.statusText}` };
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // 4. EXTRACT & UPLOAD
        console.log(`📂 Unzipping...`);
        const zip = new AdmZip(buffer);
        const zipEntries = zip.getEntries();

        const fileUploadPromises = zipEntries
            .filter(entry => !entry.isDirectory && !entry.entryName.startsWith('__MACOSX'))
            .map(async (entry) => {
                const fileLink = await StorageService.uploadFile(entry.getData(), entry.name);
                return { name: entry.name, url: fileLink };
            });

        const uploadedFiles = await Promise.all(fileUploadPromises);
        console.log(`✅ Uploaded ${uploadedFiles.length} files.`);

        // 5. AI SORT
        const filenames = uploadedFiles.map(f => f.name);
        const sortedResult = await sortDCEFiles(filenames);

        // Merge URLs with sorting result
        const finalFiles = sortedResult.files.map((sortedFile: any) => {
            const match = uploadedFiles.find(u => u.name === sortedFile.name);
            return {
                ...sortedFile,
                url: match?.url || ""
            };
        });

        // 6. SAVE TO DB
        await db.opportunity.update({
            where: { id: opportunityId },
            data: {
                dceFiles: finalFiles as any, // Cast to any for Json compatibility
                dceUrl: dceUrl // Ensure URL is saved if it wasn't before
            }
        });

        revalidatePath(`/opportunities/${opportunityId}`);
        return { success: true, message: "DCE capturé et trié avec succès." };

    } catch (error: any) {
        console.error("❌ Capture Failed:", error);
        return { success: false, message: error.message || "Erreur interne" };
    }
}
