// Test sans filtre départements pour voir la structure
async function testNoFilter() {
    const date = new Date();
    date.setDate(date.getDate() - 4);
    const dateDebut = date.toISOString().split('T')[0];

    const baseUrl = "https://boamp-datadila.opendatasoft.com/api/explore/v2.1/catalog/datasets/boamp/records";
    const whereClause = encodeURIComponent(`dateparution >= "${dateDebut}" AND idweb="25-139491"`);
    const query = `?where=${whereClause}`;

    console.log(`Test recherche du marché 25-139491 directement`);
    console.log(`URL: ${baseUrl}${query}\n`);

    try {
        const response = await fetch(baseUrl + query);

        if (!response.ok) {
            throw new Error(`Erreur API: ${response.status}`);
        }

        const data = await response.json();
        const results = data.results || [];

        console.log(`✅ Total marchés reçus: ${results.length}\n`);

        if (results.length > 0) {
            const t = results[0];
            console.log(`MARCHÉ TROUVÉ:\n`);
            console.log(`ID: ${t.idweb}`);
            console.log(`Titre: ${t.objet}`);
            console.log(`Date: ${t.dateparution}`);
            console.log(`\nStructure code_departement:`);
            console.log(JSON.stringify(t.code_departement, null, 2));
            console.log(`\nType: ${typeof t.code_departement}`);
            console.log(`IsArray: ${Array.isArray(t.code_departement)}`);
        } else {
            console.log(`❌ Marché 25-139491 non trouvé`);
        }

    } catch (error) {
        console.error(`❌ Erreur: ${error}`);
    }
}

testNoFilter();
