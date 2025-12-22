// Test du nouveau matching avec règle absolue "nettoyage"
import { matchesClientSetup } from "../lib/services/tender-engine";

const testCases = [
    {
        name: "CAF - Nettoyage et entretien",
        tender: {
            objet: "PRESTATIONS DE NETTOYAGE ET ENTRETIEN DES LOCAUX",
            code_departement: ["93"]
        },
        expected: true
    },
    {
        name: "Musée Rodin - Nettoyage des espaces",
        tender: {
            objet: "Prestations de nettoyage des espaces du musée Rodin",
            code_departement: ["75"]
        },
        expected: true
    },
    {
        name: "Autre région - Nettoyage mais hors IDF",
        tender: {
            objet: "Nettoyage de bureaux",
            code_departement: ["31"] // Toulouse
        },
        expected: false // Hors région
    },
    {
        name: "Nettoyage informatique - Hors sujet",
        tender: {
            objet: "Nettoyage de données informatiques",
            code_departement: ["75"]
        },
        expected: true // MATCH car "nettoyage" présent, l'AI décidera si c'est pertinent
    },
    {
        name: "Travaux sans nettoyage",
        tender: {
            objet: "Travaux de construction d'un bâtiment",
            code_departement: ["75"]
        },
        expected: false
    }
];

const clientConfig = {
    keywords: ["nettoyage", "entretien"],
    regions: ["75", "91", "92", "93", "94", "95", "78"]
};

console.log("🧪 TEST MATCHING AVEC RÈGLE ABSOLUE 'NETTOYAGE'\n");
console.log("=".repeat(70));

let passed = 0;
let failed = 0;

testCases.forEach((testCase, i) => {
    const result = matchesClientSetup(testCase.tender, clientConfig);
    const success = result === testCase.expected;

    console.log(`\n${i + 1}. ${testCase.name}`);
    console.log(`   Titre: "${testCase.tender.objet}"`);
    console.log(`   Dept: ${testCase.tender.code_departement}`);
    console.log(`   Résultat: ${result ? '✅ MATCH' : '❌ NO MATCH'}`);
    console.log(`   Attendu: ${testCase.expected ? '✅ MATCH' : '❌ NO MATCH'}`);
    console.log(`   Test: ${success ? '✅ RÉUSSI' : '❌ ÉCHOUÉ'}`);

    if (success) passed++;
    else failed++;
});

console.log("\n" + "=".repeat(70));
console.log(`\n📊 RÉSULTATS: ${passed}/${testCases.length} tests réussis`);
if (failed > 0) {
    console.log(`❌ ${failed} test(s) échoué(s)`);
} else {
    console.log("✅ TOUS LES TESTS PASSÉS!");
}
