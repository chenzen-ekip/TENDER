
/**
 * Utility to extract API query parameters from a BOAMP search URL.
 * Translates web interface filters into OpenDataSoft 'where' clauses.
 */
export function translateBoampUrlToApi(url: string): string {
    // 0. Remove hash fragment BEFORE parsing as it's not part of the search params
    const baseUrl = url.split('#')[0];
    const urlObj = new URL(baseUrl);
    const params = urlObj.searchParams;
    const filters: string[] = [];

    // 1. Type de Marché (Refine)
    const typeMarche = params.getAll("refine.type_marche");
    if (typeMarche.length > 0) {
        filters.push(`(${typeMarche.map(t => `type_marche = "${t}"`).join(" OR ")})`);
    }

    // 2. Départements (Refine)
    const depts = params.getAll("refine.code_departement");
    if (depts.length > 0) {
        filters.push(`(${depts.map(d => `code_departement = "${d}"`).join(" OR ")})`);
    }

    // 3. Descripteurs CPV / DC (Refine)
    const dc = params.getAll("refine.dc");
    if (dc.length > 0) {
        filters.push(`(${dc.map(d => `dc = "${d}"`).join(" OR ")})`);
    }

    // 4. Type d'Avis (Refine)
    const typeAvis = params.getAll("refine.type_avis");
    if (typeAvis.length > 0) {
        filters.push(`(${typeAvis.map(t => `type_avis = "${t}"`).join(" OR ")})`);
    }

    // 5. Mots-clés (Search query 'q')
    let query = params.get("q");
    if (query) {
        // Remove special search syntax like q.filtre_etat or #resultarea if accidentally included
        // Clean query if it contains complex ODS syntax
        const cleanQuery = query.split('#')[0].split('&')[0].replace(/\"/g, "");
        if (cleanQuery && cleanQuery.length > 1) {
            filters.push(`(objet LIKE "*${cleanQuery}*" OR donnees LIKE "*${cleanQuery}*")`);
        }
    }

    // 6. Handle q.filtre_etat (Advanced date filters)
    const filtreEtat = params.get("q.filtre_etat");
    if (filtreEtat) {
        // We generally want to preserve the date filtering logic if it's there
        // Actually, n8n will provide its own date based on lastSourcingDate, 
        // but we can parse it to extract any specific logic.
        // For now, we prioritize standard ODS fields.
    }

    if (filters.length === 0) return "1=1";
    return filters.join(" AND ");
}
