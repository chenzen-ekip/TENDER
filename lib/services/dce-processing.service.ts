
import { db } from "@/lib/db";
import { StorageService } from "@/lib/services/dce-storage";
import { sortDCEFiles } from "@/lib/services/ai-sniper";
import AdmZip from "adm-zip";
import { revalidatePath } from "next/cache";

/**
 * Shared logic to process a DCE ZIP buffer:
 * 1. Unzip
 * 2. Upload files
 * 3. AI Sort
 * 4. Save to DB
 */
export async function processDceZip(buffer: Buffer, opportunityId: string, dceUrl: string | null = null) {
    console.log(`⚙️ [DCE Processor] Processing ZIP for ${opportunityId}...`);

    // 1. Unzip
    const zip = new AdmZip(buffer);
    const zipEntries = zip.getEntries();

    console.log(`📂 Found ${zipEntries.length} entries in ZIP.`);

    // 2. Upload Files
    const fileUploadPromises = zipEntries
        .filter(entry => !entry.isDirectory && !entry.entryName.startsWith('__MACOSX'))
        .map(async (entry) => {
            // Use StorageService (Local or S3)
            const fileLink = await StorageService.uploadFile(entry.getData(), entry.name);
            return { name: entry.name, url: fileLink };
        });

    const uploadedFiles = await Promise.all(fileUploadPromises);
    console.log(`✅ Uploaded ${uploadedFiles.length} files.`);

    if (uploadedFiles.length === 0) {
        throw new Error("Le ZIP ne contient aucun fichier valide.");
    }

    // 3. AI Sort
    console.log("🧠 Sorting files with AI...");
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

    // 4. Update DB
    await db.opportunity.update({
        where: { id: opportunityId },
        data: {
            dceFiles: finalFiles as any, // Cast for JSON
            status: "EXTRACTED", // Intermediate status
            ...(dceUrl ? { dceUrl } : {})
        }
    });

    console.log(`✅ [DCE Processor] Success. Files saved to DB.`);
    return { success: true, count: finalFiles.length };
}
