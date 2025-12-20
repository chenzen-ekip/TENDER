// Script pour vérifier ce que l'API BOAMP retourne
import { writeFileSync } from 'fs';

const targetTenders = ["25-139491", "25-138135"];

async function checkBOAMP() {
    const date = new Date();
    date.setDate(date.getDate() - 4);
    const dateDebut = date.toISOString().split('T')[0];

    const baseUrl = "https://boamp-datadila.opendatasoft.com/api/explore/v2.1/catalog/datasets/boamp/records";
    const whereClause = encodeURIComponent(`dateparution >= "${dateDebut}"`);
    const query = `?where=${whereClause}&order_by=dateparution desc&limit=100`;

    const lines: string[] = [];
    lines.push(`Fetching BOAMP depuis: ${dateDebut}`);
    lines.push(`URL: ${baseUrl}${query}`);
    lines.push('');

    try {
        const response = await fetch(baseUrl + query);
        if (!response.ok) throw new Error(`Erreur API: ${response.status}`);

        const data = await response.json();
        const results = data.results || [];

        lines.push(`Total marchés reçus: ${results.length}`);
        lines.push('');
        lines.push('='.repeat(80));
        lines.push('');

        // Chercher nos marchés cibles
        lines.push("RECHERCHE DES MARCHÉS CIBLES");
        lines.push('');

        for (const targetId of targetTenders) {
            const found = results.find((t: any) => t.idweb === targetId);

            if (found) {
                lines.push(`TROUVÉ: ${targetId}`);
                lines.push(`   Titre: ${found.objet}`);
                lines.push(`   Date: ${found.dateparution}`);
                lines.push(`   Départements: ${found.code_departement?.join(', ') || 'N/A'}`);
                lines.push('');
            } else {
                lines.push(`MANQUANT dans les 100 premiers résultats: ${targetId}`);
                lines.push('');
            }
        }

        lines.push('');
        lines.push('='.repeat(80));
        lines.push('');

        // Afficher TOUS les marchés "nettoyage"
        lines.push("TOUS LES MARCHÉS CONTENANT 'NETTOYAGE' (dans les 100 résultats):");
        lines.push('');
        const nettoyageTenders = results.filter((t: any) => t.objet?.toLowerCase().includes('nettoyage'));

        lines.push(`Total: ${nettoyageTenders.length} marchés`);
        lines.push('');

        nettoyageTenders.forEach((t: any, i: number) => {
            lines.push(`${i + 1}. ${t.idweb || 'N/A'}`);
            lines.push(`   ${t.objet}`);
            lines.push(`   Date: ${t.dateparution}`);
            lines.push(`   Depts: ${t.code_departement?.join(', ') || 'N/A'}`);
            lines.push('');
        });

        const report = lines.join('\n');

        // Écrire dans un fichier
        writeFileSync('boamp-check-result.txt', report, 'utf-8');
        console.log(report);
        console.log("\nRapport écrit dans: boamp-check-result.txt");

    } catch (error) {
        const errorMsg = `Erreur: ${error}`;
        console.error(errorMsg);
        lines.push(errorMsg);
        writeFileSync('boamp-check-result.txt', lines.join('\n'), 'utf-8');
    }
}

checkBOAMP();
