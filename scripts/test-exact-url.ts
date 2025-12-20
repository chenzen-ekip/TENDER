// Test exact de la requête générée par fetchRawTenders
async function testExactQuery() {
    const date = new Date();
    date.setDate(date.getDate() - 4);
    const dateDebut = date.toISOString().split('T')[0];

    const baseUrl = "https://boamp-datadila.opendatasoft.com/api/explore/v2.1/catalog/datasets/boamp/records";
    const whereClause = encodeURIComponent(`dateparution >= "${dateDebut}"`);
    const query = `?where=${whereClause}&order_by=dateparution desc&limit=500`;

    const fullUrl = baseUrl + query;

    console.log("Test de la requête EXACTE générée par fetchRawTenders:\n");
    console.log(`Date: ${dateDebut}`);
    console.log(`WHERE (avant encode): dateparution >= "${dateDebut}"`);
    console.log(`WHERE (encodé): ${whereClause}`);
    console.log(`\nURL complète:`);
    console.log(fullUrl);
    console.log("");

    try {
        console.log("Envoi de la requête...");
        const response = await fetch(fullUrl);

        console.log(`Status: ${response.status}`);

        if (!response.ok) {
            const text = await response.text();
            console.log(`\n❌ ERREUR`);
            console.log(`Body: ${text.substring(0, 300)}`);
        } else {
            const data = await response.json();
            console.log(`\n✅ SUCCÈS`);
            console.log(`Résultats: ${data.results?.length || 0}`);

            if (data.results && data.results.length > 0) {
                console.log(`\nPremiers marchés:`);
                data.results.slice(0, 3).forEach((t: any) => {
                    console.log(`  - ${t.idweb}: ${t.dateparution}`);
                });
            }
        }
    } catch (error) {
        console.log(`\n❌ EXCEPTION: ${error}`);
    }
}

testExactQuery();
