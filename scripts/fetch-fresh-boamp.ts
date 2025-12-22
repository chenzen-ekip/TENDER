// Fetch un tender frais depuis BOAMP pour voir la structure complète
async function fetchFreshBoampData() {
    console.log("📡 FETCH DEPUIS BOAMP API\n");

    const tenderId = "25-140157"; // CAF

    try {
        const baseUrl = "https://boamp-datadila.opendatasoft.com/api/explore/v2.1/catalog/datasets/boamp/records";
        const whereClause = encodeURIComponent(`idweb = "${tenderId}"`);
        const query = `?where=${whereClause}&limit=1`;

        console.log(`Fetching: ${tenderId}...`);
        const response = await fetch(baseUrl + query);
        const data = await response.json();

        if (!data.results || data.results.length === 0) {
            console.log("❌ Pas trouvé");
            return;
        }

        const result = data.results[0];

        console.log("\n📊 STRUCTURE COMPLÈTE:");
        console.log("=".repeat(70));
        console.log("\n🔑 TOP-LEVEL KEYS:");
        console.log(Object.keys(result).join(', '));

        // Parse donnees
        if (result.donnees) {
            try {
                const donnees = typeof result.donnees === 'string' ? JSON.parse(result.donnees) : result.donnees;

                console.log("\n\n📦 DONNEES KEYS:");
                console.log(Object.keys(donnees).join(', '));

                console.log("\n\n💰 MONTANT:");
                if (donnees.MONTANT) {
                    console.log(JSON.stringify(donnees.MONTANT, null, 2));
                } else {
                    console.log("❌ Pas de MONTANT");
                }

                console.log("\n⏱️ DUREE:");
                if (donnees.DUREE) {
                    console.log(JSON.stringify(donnees.DUREE, null, 2));
                } else {
                    console.log("❌ Pas de DUREE");
                }

                console.log("\n📋 PROCEDURE:");
                if (donnees.PROCEDURE) {
                    console.log(JSON.stringify(donnees.PROCEDURE, null, 2));
                } else {
                    console.log("❌ Pas de PROCEDURE");
                }

                console.log("\n📍 LIEU_EXEC:");
                if (donnees.LIEU_EXEC) {
                    console.log(JSON.stringify(donnees.LIEU_EXEC, null, 2));
                } else {
                    console.log("❌ Pas de LIEU_EXEC");
                }

                console.log("\n📝 OBJET:");
                if (donnees.OBJET) {
                    console.log(JSON.stringify(donnees.OBJET, null, 2));
                } else {
                    console.log("❌ Pas d'OBJET");
                }

                // Afficher TOUT le JSON pour analyse
                console.log("\n\n🗂️ DONNEES COMPLET (pour parsing):");
                console.log("=".repeat(70));
                console.log(JSON.stringify(donnees, null, 2));

            } catch (e) {
                console.error("❌ Erreur parsing:", e);
            }
        }

    } catch (error) {
        console.error("❌ Erreur API:", error);
    }
}

fetchFreshBoampData();
