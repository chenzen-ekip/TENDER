/**
 * BOAMP Service
 * Responsible for fetching tenders from Opendatasoft APIs.
 */

export interface BoampRecord {
    idweb: string;
    title: string;
    summary?: string;
    dateparution: string;
    datelimitereception?: string;
    url_avis?: string;
    [key: string]: any;
}

const SEARCH_API_URL = "https://boamp-datadila.opendatasoft.com/api/explore/v2.1/catalog/datasets/boamp/records";
const HTML_API_URL = "https://boamp-datadila.opendatasoft.com/api/explore/v2.1/catalog/datasets/boamp-html/records";

export async function searchBoampTenders(whereClause: string, limit: number = 20): Promise<BoampRecord[]> {
    const url = new URL(SEARCH_API_URL);
    url.searchParams.append("where", whereClause);
    url.searchParams.append("limit", limit.toString());
    url.searchParams.append("order_by", "dateparution DESC");

    console.log(`🔍 [BOAMP] Searching: ${url.toString()}`);

    const response = await fetch(url.toString());
    if (!response.ok) {
        throw new Error(`BOAMP Search API error: ${response.status}`);
    }

    const data = await response.json();
    return data.results || [];
}

export async function fetchTenderFullHtml(idweb: string): Promise<string | null> {
    const url = new URL(HTML_API_URL);
    url.searchParams.append("where", `idweb:"${idweb}"`);
    url.searchParams.append("limit", "1");

    console.log(`📄 [BOAMP] Fetching HTML for: ${idweb}`);

    const response = await fetch(url.toString());
    if (!response.ok) {
        console.error(`❌ [BOAMP] HTML API error for ${idweb}: ${response.status}`);
        return null;
    }

    const data = await response.json();
    const record = data.results?.[0];

    if (!record || !record.avis_html) {
        console.warn(`⚠️ [BOAMP] No HTML found for ${idweb}`);
        return null;
    }

    // Basic cleaning of the HTML
    return record.avis_html
        .replace(/<[^>]*>/g, ' ') // Remove tags
        .replace(/\s+/g, ' ')     // Normalize spaces
        .trim();
}
