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
export async function fetchRawTenders(lastCheckDate: Date, clientDepartments: string[] = [], clientKeywords: string[] = []) {
    // Dynamic Date: Today - 2 days (optimized for 12h cron frequency)
    const date = new Date();
    date.setDate(date.getDate() - 2);
    const dateDebut = date.toISOString().split('T')[0];

    const baseUrl = "https://boamp-datadila.opendatasoft.com/api/explore/v2.1/catalog/datasets/boamp/records";
    const whereClause = encodeURIComponent(`dateparution >= "${dateDebut}"`);

    console.log(`📡 [SOURCING] Aspirateur lancé depuis : ${dateDebut}`);
    console.log(`🔄 [SOURCING] Pagination: fetching multiple batches (max 100/batch)`);

    const allTenders: any[] = [];
    const maxBatches = 5; // Fetch up to 500 tenders total (5 batches × 100)

    try {
        for (let batch = 0; batch < maxBatches; batch++) {
            const offset = batch * 100;
            const query = `?where=${whereClause}&order_by=dateparution desc&limit=100&offset=${offset}`;

            console.log(`📦 [Batch ${batch + 1}/${maxBatches}] Fetching from offset ${offset}...`);

            const response = await fetch(baseUrl + query);
            if (!response.ok) {
                console.error(`❌ Batch ${batch + 1} failed: ${response.status}`);
                break; // Stop on error
            }

            const data = await response.json();
            const results = data.results || [];

            if (results.length === 0) {
                console.log(`✅ No more results at offset ${offset}, stopping pagination`);
                break; // No more results
            }

            allTenders.push(...results);
            console.log(`   → ${results.length} tender added (total: ${allTenders.length})`);

            // If we got less than 100, we've reached the end
            if (results.length < 100) {
                console.log(`✅ Reached end of results (got ${results.length} < 100)`);
                break;
            }
        }

        console.log(`📦 [ASPIRATEUR] ${allTenders.length} nouveaux marchés récupérés au total.`);
        return allTenders;

    } catch (error) {
        console.error("❌ Erreur API BOAMP:", error);
        return allTenders; // Return what we managed to fetch
    }
}
// Force deploy for client trial
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

    const matchKeyword = clientSettings.keywords.some(kw => {
        const keywordLower = kw.toLowerCase().trim();

        // 1. Essai de match exact (prioritaire)
        if (searchContent.includes(keywordLower)) {
            return true;
        }

        // 2. Match flexible : on vérifie que TOUS les mots significatifs (>2 lettres) sont présents
        // Ceci permet "nettoyage de locaux" de matcher "nettoyage... locaux" (ordre flexible)
        const words = keywordLower.split(/\s+/).filter(w => w.length > 2);
        if (words.length > 0) {
            return words.every(word => searchContent.includes(word));
        }

        return false;
    });

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
