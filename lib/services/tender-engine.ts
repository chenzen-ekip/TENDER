import { db } from "@/lib/db";
import { getPisteToken } from "./piste-auth.service";

/**
 * Orchestrates the daily sourcing process for a specific client.
 * 1. Fetches client's search config.
 * 2. Authenticates with PISTE.
 * 3. Searches for tenders (Mocked for now).
 * 4. Deduplicates and saves new tenders.
 * 5. Creates "Analysis Pending" opportunities.
 */
/**
 * Fetches tenders since the last check date with a safety buffer.
 * This should be called ONCE per Cron cycle.
 */
export async function fetchRawTenders(lastCheckDate: Date) {
    // Safety: Go back 2 minutes to compensate for BOAMP indexation lag
    const safetyBuffer = 2 * 60 * 1000;

    // Dynamic Date: Today - 4 days (User Request for "Live" feel)
    const date = new Date();
    date.setDate(date.getDate() - 4);
    const dateDebut = date.toISOString().split('T')[0];

    // User Request: Format YYYY-MM-DD
    const formattedDate = dateDebut; // Force usage of dynamic date

    const baseUrl = "https://boamp-datadila.opendatasoft.com/api/explore/v2.1/catalog/datasets/boamp/records";
    const whereClause = encodeURIComponent(`dateparution >= "${formattedDate}"`);

    // Order by ASC to process oldest first (chronological replay)
    // LIMIT: 100 tenders per cycle (optimized for 15-min cron frequency)
    const query = `?where=${whereClause}&order_by=dateparution asc&limit=100`;

    console.log(`📡 [SOURCING] Aspirateur lancé depuis : ${formattedDate}`);

    try {
        const response = await fetch(baseUrl + query);
        if (!response.ok) throw new Error(`Erreur API BOAMP: ${response.status}`);

        const data = await response.json();

        if (!data.results) return [];

        console.log(`📦 [ASPIRATEUR] ${data.results.length} nouveaux marchés récupérés.`);
        return data.results;
    } catch (error) {
        console.error("❌ Erreur API BOAMP:", error);
        return [];
    }
}
// Force deploy for client trial

/**
 * Checks if a specific tender matches a client's configuration.
 * FILTRE CROISÉ : Mots-clés + Régions
 */
export function matchesClientSetup(tender: any, clientSettings: { keywords: string[], regions: string[] }) {
    // 1. FILTRE RÉGION : Est-ce que le marché est dans un des départements du client ?
    // Sécurité : on gère le cas null/undefined pour code_departement
    const rawDepts = tender.code_departement || [];
    const itemDepts = Array.isArray(rawDepts) ? rawDepts.map(String) : [String(rawDepts)];

    // Si le client n'a pas de régions spécifiques (tableau vide), on considère que c'est NATIONAL -> OK.
    const matchRegion = clientSettings.regions.length === 0 ||
        itemDepts.some(d => clientSettings.regions.includes(d));

    if (!matchRegion) return false;

    // 2. FILTRE MÉTIER : Est-ce qu'un des mots-clés du client est présent ?
    // On concatène objet + donnees pour une recherche large
    const searchContent = (tender.objet + " " + (tender.donnees || "")).toLowerCase();

    // Si pas de mots-clés définis, on rejette (sécurité) ou on accepte tout (à décider). 
    // Ici on suppose qu'un client DOIT avoir des mots-clés.
    if (clientSettings.keywords.length === 0) return false;

    const matchKeyword = clientSettings.keywords.some(kw =>
        searchContent.includes(kw.toLowerCase().trim())
    );

    return matchKeyword;
}

/**
 * Helper to standardise tender object for DB
 */
export function mapTenderToDbObject(item: any) {
    let description = "Voir détail";
    try {
        if (item.donnees) {
            const j = JSON.parse(item.donnees);
            if (j.OBJET?.OBJET_COMPLET) description = j.OBJET.OBJET_COMPLET;
        }
    } catch (e) { }

    return {
        id_boamp: item.idweb || item.id,
        title: item.objet || "Marché Public",
        summary: description.substring(0, 1000), // Enforce DB limit
        pdf_url: item.url_avis || `https://www.boamp.fr/pages/avis/?q=idweb:${item.idweb}`,
        status: "EXTRACTED"
    };
}



/**
 * Orchestrates the daily sourcing process.
 * DEPRECATED: usage moved to /api/cron/daily-sourcing/route.ts
 * Kept commented out for reference or potential future logic reuse.
 */
/*
export async function runDailySourcing(clientId: string) {
    console.log(`🚀 [TenderEngine] Starting sourcing for Client ID: ${clientId}`);

    // Logic moved to Cron API for "Fetch Once, Filter Many" architecture.
    // See app/api/cron/daily-sourcing/route.ts
}
*/
