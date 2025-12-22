
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

    // 4. Update DB (Transaction: Update Opportunity JSON + Create File Records + Update Request Status)
    await db.$transaction(async (tx) => {
        // A. Legacy JSON update (for UI compatibility)
        await tx.opportunity.update({
            where: { id: opportunityId },
            data: {
                dceFiles: { files: finalFiles } as any,
                status: "EXTRACTED", // Or "READY"
                ...(dceUrl ? { dceUrl } : {})
            }
        });

        // B. Create robust File records
        // First delete old files for this opportunity to avoid duplicates if re-uploaded
        await tx.file.deleteMany({ where: { opportunityId } });

        await tx.file.createMany({
            data: finalFiles.map((f: any) => ({
                name: f.name,
                url: f.url,
                category: f.category,
                opportunityId: opportunityId,
                mimeType: "application/pdf" // default
            }))
        });

        // C. Update the DCERequest to READY
        const pendingRequest = await tx.dCERequest.findFirst({
            where: {
                opportunityId: opportunityId,
                status: { not: "READY" }
            }
        });

        if (pendingRequest) {
            await tx.dCERequest.update({
                where: { id: pendingRequest.id },
                data: { status: "READY" }
            });
        }
    });

    // 5. Notify User (Fire & Forget)
    // We import dynamically to avoid circular deps if any
    const { sendDceReadyNotification } = await import("@/lib/services/notification.service");
    await sendDceReadyNotification(opportunityId);

    console.log(`✅ [DCE Processor] Success. Files saved & User notified.`);
    return { success: true, count: finalFiles.length };
}
