
import puppeteer from 'puppeteer-core';

export interface ScrapeResult {
    success: boolean;
    dceUrl?: string; // Direct ZIP link if found
    landingUrl: string; // The URL we ended up on (checking for redirects)
    isDirectDownload: boolean; // True if dceUrl is a file, False if it's a page
    error?: string;
}

/**
 * Scrapes the Profile Acheteur to find the DCE (Dossier de Consultation) link.
 * Strategy:
 * 1. Navigate to the profileUrl.
 * 2. Check for common "Download" button patterns.
 * 3. Return the ZIP url if found, otherwise return the page URL as a fallback.
 */
export async function scrapeDceUrl(profileUrl: string): Promise<ScrapeResult> {
    console.log(`🕷️ [DCE Scraper] Starting scrape for: ${profileUrl}`);

    let browser;
    try {
        if (process.env.AWS_LAMBDA_FUNCTION_VERSION) {
            // PRODUCTION: Use sparticuz/chromium
            const chromium = require('@sparticuz/chromium');
            browser = await puppeteer.launch({
                args: [
                    ...chromium.args,
                    '--ignore-certificate-errors',
                    '--allow-running-insecure-content'
                ],
                defaultViewport: chromium.defaultViewport,
                executablePath: await chromium.executablePath(),
                headless: chromium.headless,
            });
        } else {
            // DEVELOPMENT: Use local Chrome (requires Chrome installed on machine or Puppeteer cache)
            // Since we removed 'puppeteer' (full), allow referencing local Chrome path if needed or rely on puppeteer-core finding it if possible (often tricky).
            // BETTER DEV FALLBACK: User probably has Chrome installed.
            // On Windows/Mac, puppeteer-core doesn't download Chrome. 
            // We'll try a standard path or assume the user has set PUPPETEER_EXECUTABLE_PATH env var.
            // For now, let's assume standard install paths or environment variable.

            const exePath = process.env.PUPPETEER_EXECUTABLE_PATH ||
                "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" ||
                "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

            browser = await puppeteer.launch({
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
                executablePath: exePath,
                headless: true
            });
        }

        const page = await browser.newPage();

        // Set User Agent to avoid basic bot detection
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

        // Go to URL
        const response = await page.goto(profileUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        const finalUrl = page.url();

        // 1. Check if the URL itself is a file (unlikely but possible)
        if (finalUrl.endsWith('.zip') || response?.headers()['content-type']?.includes('application/zip')) {
            console.log(`✅ [DCE Scraper] URL is already a file.`);
            return { success: true, dceUrl: finalUrl, landingUrl: finalUrl, isDirectDownload: true };
        }

        // 2. Search for "Download" buttons
        // Common selectors/text for French public tender platforms (Marches-publics, AWS, etc.)
        const downloadLink = await page.evaluate(() => {
            const keywords = ['télécharger', 'dce', 'dossier', 'download', 'pièces'];
            const anchors = Array.from(document.querySelectorAll('a'));

            // Priority 1: Check for .zip links with Keywords
            const zipLink = anchors.find(a =>
                a.href.toLowerCase().endsWith('.zip') &&
                keywords.some(k => a.innerText.toLowerCase().includes(k))
            );
            if (zipLink) return zipLink.href;

            // Priority 2: Check for any link with specific exact phrases
            const strongMatch = anchors.find(a => {
                const text = a.innerText.toLowerCase().trim();
                return text.includes("télécharger le dossier") || text.includes("télécharger le dce");
            });
            if (strongMatch) return strongMatch.href;

            // Priority 3: Check for generic .zip links
            const genericZip = anchors.find(a => a.href.toLowerCase().endsWith('.zip'));
            if (genericZip) return genericZip.href;

            return null;
        });

        if (downloadLink) {
            console.log(`✅ [DCE Scraper] Found download link: ${downloadLink}`);
            return { success: true, dceUrl: downloadLink, landingUrl: finalUrl, isDirectDownload: true };
        }

        // 3. Fallback: No obvious link found (maybe Auth required or weird JS)
        console.log(`⚠️ [DCE Scraper] No direct download link found. Returning page URL.`);
        return { success: true, dceUrl: finalUrl, landingUrl: finalUrl, isDirectDownload: false };

    } catch (error: any) {
        console.error(`❌ [DCE Scraper] Error: ${error.message}`);
        return { success: false, landingUrl: profileUrl, isDirectDownload: false, error: error.message };
    } finally {
        if (browser) await browser.close();
    }
}
