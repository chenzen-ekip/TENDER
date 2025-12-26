import { translateBoampUrlToApi } from "../lib/services/boamp-url-parser";

const testCases = [
    {
        name: "Simple Keywords",
        url: "https://www.boamp.fr/pages/recherche/?q=nettoyage",
        expected: '(objet LIKE "*nettoyage*" OR donnees LIKE "*nettoyage*")'
    },
    {
        name: "Multiple Departments",
        url: "https://www.boamp.fr/pages/recherche/?refine.code_departement=75&refine.code_departement=77&refine.code_departement=92",
        expected: '(code_departement = "75" OR code_departement = "77" OR code_departement = "92")'
    },
    {
        name: "Complex Search (User Example)",
        url: "https://www.boamp.fr/pages/recherche/?disjunctive.type_marche&disjunctive.descripteur_code&disjunctive.dc&disjunctive.code_departement&disjunctive.type_avis&disjunctive.famille&sort=dateparution&refine.type_marche=SERVICES&refine.dc=239&refine.code_departement=75&refine.code_departement=77&refine.type_avis=1&refine.type_avis=5&q.filtre_etat=(NOT%20%23null(datelimitereponse)%20AND%20datelimitereponse%3E%3D%222025-12-26%22)%20OR%20(%23null(datelimitereponse)%20AND%20datefindiffusion%3E%3D%222025-12-26%22)#resultarea",
        expected: '(type_marche = "SERVICES") AND (code_departement = "75" OR code_departement = "77") AND (dc = "239") AND (type_avis = "1" OR type_avis = "5")'
    },
    {
        name: "Keywords with Quotes and Hash",
        url: "https://www.boamp.fr/pages/recherche/?q=%22entretien%20espaces%20verts%22#resultarea",
        expected: '(objet LIKE "*entretien espaces verts*" OR donnees LIKE "*entretien espaces verts*")'
    },
    {
        name: "Empty URL",
        url: "https://www.boamp.fr/pages/recherche/",
        expected: '1=1'
    }
];

console.log("🚀 Running BOAMP Parser Industrial Tests...\n");

let successCount = 0;

testCases.forEach((tc, i) => {
    try {
        const result = translateBoampUrlToApi(tc.url);
        const passed = result === tc.expected;

        console.log(`Test ${i + 1}: ${tc.name}`);
        if (passed) {
            console.log("  ✅ PASSED");
            successCount++;
        } else {
            console.log("  ❌ FAILED");
            console.log(`     Expected: ${tc.expected}`);
            console.log(`     Got:      ${result}`);
        }
        console.log("------------------------------------------");
    } catch (err: any) {
        console.log(`Test ${i + 1}: ${tc.name} ❌ ERRORED: ${err.message}`);
    }
});

console.log(`\n📊 Summary: ${successCount}/${testCases.length} tests passed.`);

if (successCount === testCases.length) {
    console.log("🎉 All parser tests successful! Industrial Grade Confirmed.");
} else {
    process.exit(1);
}
