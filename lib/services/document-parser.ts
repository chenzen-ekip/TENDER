import AdmZip from "adm-zip";
// @ts-ignore
const pdf = require("pdf-parse");

/**
 * Downloads a document from a URL and extracts its text.
 * Handles:
 * - Direct PDF files.
 * - ZIP archives (finds the most relevant PDF inside).
 * - Text truncation to stay within Token limits.
 */
export async function extractTextFromUrl(url: string): Promise<string> {
    console.log(`📥 [DocParser] Downloading: ${url}`);

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch document: ${response.statusText}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Detect Content Type (Basic)
        // In a real scenario, check mime-type header, but extensions/magic bytes work too.
        let text = "";

        if (isZip(buffer)) {
            console.log("📦 [DocParser] Detected ZIP archive.");
            text = await extractTextFromZip(buffer);
        } else {
            // Assume PDF by default for now
            console.log("📄 [DocParser] Handling as PDF.");
            text = await extractTextFromPdf(buffer);
        }

        // Cleaning and Truncation
        const cleaned = cleanText(text);
        console.log(`✅ [DocParser] Extracted ${cleaned.length} chars.`);
        return cleaned;

    } catch (error) {
        console.error("❌ [DocParser] Extraction failed:", error);
        return "ERREUR_EXTRACTION_DOCUMENT";
    }
}

/**
 * Extract text from the "best" PDF in the ZIP.
 * Priority: Filename contains 'CCTP' > 'RC' > 'DCE' > Any PDF.
 */
async function extractTextFromZip(buffer: Buffer): Promise<string> {
    const zip = new AdmZip(buffer);
    const zipEntries = zip.getEntries();

    let bestEntry = null;
    let highestScore = -1;

    for (const entry of zipEntries) {
        if (entry.isDirectory || !entry.entryName.toLowerCase().endsWith(".pdf")) {
            continue;
        }

        let score = 0;
        const name = entry.entryName.toUpperCase();

        if (name.includes("CCTP")) score += 10; // Cahier des Clauses Techniques Particulières
        if (name.includes("RC") || name.includes("REGLEMENT")) score += 5;   // Règlement de Consultation
        if (name.includes("DCE")) score += 2;

        if (score > highestScore) {
            highestScore = score;
            bestEntry = entry;
        }
    }

    if (!bestEntry) {
        // If no specific PDF found, try the first one
        const firstPdf = zipEntries.find(e => e.entryName.toLowerCase().endsWith(".pdf"));
        if (firstPdf) {
            console.log(`⚠️ [DocParser] No priority PDF found. Using first available: ${firstPdf.entryName}`);
            return await extractTextFromPdf(firstPdf.getData());
        }
        console.warn("⚠️ [DocParser] No PDF found in ZIP.");
        return "AUCUN_PDF_DANS_ZIP";
    }

    console.log(`🎯 [DocParser] Selected file from ZIP: ${bestEntry.entryName}`);
    return await extractTextFromPdf(bestEntry.getData());
}

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
    try {
        const data = await pdf(buffer);
        return data.text;
    } catch (e) {
        console.error("❌ [DocParser] PDF Parse Error:", e);
        return "";
    }
}

function isZip(buffer: Buffer): boolean {
    // PK identifier for zip files
    return buffer.length > 4 && buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04;
}

function cleanText(text: string): string {
    // Remove excessive whitespace, newlines, etc.
    let cleaned = text
        .replace(/\r\n/g, "\n")
        .replace(/\n\s*\n/g, "\n") // Remove multiple empty lines
        .replace(/\s+/g, " ") // Collapse spaces
        .trim();

    // Truncate to ~20k chars (roughly 5-6k tokens)
    if (cleaned.length > 20000) {
        console.log(`✂️ [DocParser] Truncating text from ${cleaned.length} to 20000 chars.`);
        cleaned = cleaned.substring(0, 20000) + "... [TRONQUÉ]";
    }

    return cleaned;
}
