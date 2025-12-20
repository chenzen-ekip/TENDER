// Test simple de l'API BOAMP
async function testSimpleAPI() {
    const date = new Date();
    date.setDate(date.getDate() - 4);
    const dateDebut = date.toISOString().split('T')[0];

    console.log(`Testing BOAMP API with date >= ${dateDebut}\n`);

    // Test différentes syntaxes
    const tests = [
        {
            name: "Avec >=",
            where: `dateparution >= "${dateDebut}"`
        },
        {
            name: "Avec > (date - 1 jour)",
            where: `dateparution > "2025-12-15"`
        }
    ];

    const baseUrl = "https://boamp-datadila.opendatasoft.com/api/explore/v2.1/catalog/datasets/boamp/records";

    for (const test of tests) {
        console.log(`\n🧪 Test: ${test.name}`);
        console.log(`   WHERE: ${test.where}`);

        const whereClause = encodeURIComponent(test.where);
        const query = `?where=${whereClause}&order_by=dateparution desc&limit=10`;
        const url = baseUrl + query;

        console.log(`   URL: ${url.substring(0, 100)}...`);

        try {
            const response = await fetch(url);

            if (!response.ok) {
                const text = await response.text();
                console.log(`   ❌ Status: ${response.status}`);
                console.log(`   Error: ${text.substring(0, 150)}`);
            } else {
                const data = await response.json();
                console.log(`   ✅ Status: ${response.status}`);
                console.log(`   Résultats: ${data.results?.length || 0}`);

                if (data.results && data.results.length > 0) {
                    console.log(`   Premier marché: ${data.results[0].idweb} - ${data.results[0].dateparution}`);
                }
            }
        } catch (error) {
            console.log(`   ❌ Exception: ${error}`);
        }
    }
}

testSimpleAPI();
