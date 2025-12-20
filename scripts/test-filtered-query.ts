// Test différentes syntaxes pour le filtre départements
const targetTenders = ["25-139491", "25-138135"];

async function testDifferentSyntax() {
    const date = new Date();
    date.setDate(date.getDate() - 4);
    const dateDebut = date.toISOString().split('T')[0];

    const baseUrl = "https://boamp-datadila.opendatasoft.com/api/explore/v2.1/catalog/datasets/boamp/records";

    // Test 1: Simple OR syntax for departments
    const depts = ["75", "78"];  // Just test with 2 depts first
    const deptFilters = depts.map(d => `code_departement="${d}"`).join(' OR ');
    const whereClause = encodeURIComponent(`dateparution >= "${dateDebut}" AND (${deptFilters})`);
    const query = `?where=${whereClause}&order_by=dateparution desc&limit=200`;

    console.log(`Test avec syntaxe OR`);
    console.log(`URL: ${baseUrl}${query}\n`);

    try {
        const response = await fetch(baseUrl + query);
        console.log(`Status: ${response.status}`);

        if (!response.ok) {
            const text = await response.text();
            console.log(`Error details: ${text.substring(0, 200)}`);
            throw new Error(`Erreur API: ${response.status}`);
        }

        const data = await response.json();
        const results = data.results || [];

        console.log(`✅ Total marchés reçus: ${results.length}\n`);

        // Chercher nos marchés cibles
        for (const targetId of targetTenders) {
            const found = results.find((t: any) => t.idweb === targetId);

            if (found) {
                console.log(`✅ TROUVÉ: ${targetId}`);
                console.log(`   ${found.objet}`);
                console.log(`   Date: ${found.dateparution}\n`);
            }
        }

        // Premier marché pour voir la structure
        if (results.length > 0) {
            console.log(`\nExemple structure code_departement:`);
            console.log(JSON.stringify(results[0].code_departement, null, 2));
        }

    } catch (error) {
        console.error(`❌ Erreur: ${error}`);
    }
}

testDifferentSyntax();
