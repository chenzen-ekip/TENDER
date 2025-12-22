import { put } from "@vercel/blob";
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export const StorageService = {
    /**
     * Saves a buffer to Vercel Blob Storage.
     */
    async uploadFile(buffer: Buffer, originalName: string): Promise<string> {
        const uniqueId = uuidv4();
        // Sanitize filename
        const cleanName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filename = `dce/extracted/${uniqueId}-${cleanName}`;

        console.log(`☁️ Uploading to Blob: ${filename}`);

        const blob = await put(filename, buffer, {
            access: 'public',
            contentType: 'application/pdf' // Defaulting to PDF mostly, but could detect
        });

        return blob.url;
    }
};
