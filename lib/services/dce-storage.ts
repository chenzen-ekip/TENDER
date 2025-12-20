
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// MVP: Store in public/dce folder
// PROD: Switch to S3/Uploadthing
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'dce');

// Ensure dir exists
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export const StorageService = {
    /**
     * Saves a buffer to storage and returns the public URL.
     */
    async uploadFile(buffer: Buffer, originalName: string): Promise<string> {
        const uniqueId = uuidv4();
        const ext = path.extname(originalName);
        const fileName = `${uniqueId}-${originalName.replace(/[^a-zA-Z0-9.-]/g, '_')}`; // Sanitize

        const filePath = path.join(UPLOAD_DIR, fileName);

        await fs.promises.writeFile(filePath, buffer);

        // Return public URL (Next.js serves 'public' at root)
        return `/dce/${fileName}`;
    }
};
