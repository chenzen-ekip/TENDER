// Debug pourquoi les tenders ne matchent pas
import { matchesClientSetup } from "../lib/services/tender-engine";

// Simuler le tender CAF
const cafTender = {
    idweb: "25-140157",
    objet: "PRESTATIONS DE NETTOYAGE ET ENTRETIEN DES LOCAUX DE LA CAF DE LA SEINE-SAINT-DENIS",
    code_departement: ["93"],
    donnees: "{}"  // Simplifié
};

const museeRodin = {
    idweb: "25-140808",
    objet: "Prestations de nettoyage des espaces du musée Rodin sur ses sites de Paris et de Meudon",
    code_departement: ["75"],
    donnees: "{}"
};

// Config client SBL
const clientConfig = {
    keywords: ["Nettoyage de locaux"],
    regions: ["75", "91", "92", "93", "94", "95", "78"]
};

console.log("🧪 TEST DE MATCHING\n");
console.log("=".repeat(70));

console.log("\n1️⃣ CAF SEINE-SAINT-DENIS (93)");
console.log(`   Titre: "${cafTender.objet}"`);
console.log(`   Dept: ${cafTender.code_departement}`);
const cafMatch = matchesClientSetup(cafTender, clientConfig);
console.log(`   Match: ${cafMatch ? "✅ OUI" : "❌  NON"}`);

console.log("\n2️⃣ MUSÉE RODIN (75)");
console.log(`   Titre: "${museeRodin.objet}"`);
console.log(`   Dept: ${museeRodin.code_departement}`);
const rodinMatch = matchesClientSetup(museeRodin, clientConfig);
console.log(`   Match: ${rodinMatch ? "✅ OUI" : "❌ NON"}`);

console.log("\n=".repeat(70));
console.log("\n🔍 DEBUG: Vérification manuelle du matching\n");

// Debug matching CAF
const cafSearchContent = (cafTender.objet + " " + (cafTender.donnees || "")).toLowerCase();
console.log(`Contenu CAF (lowercase): "${cafSearchContent}"`);
console.log(`Mot-clé exact: "nettoyage de locaux"`);
console.log(`   Match exact: ${cafSearchContent.includes("nettoyage de locaux") ? "✅" : "❌"}`);

const words = "nettoyage de locaux".split(/\s+/).filter(w => w.length > 2);
console.log(`   Mots extraits: [${words.join(', ')}]`);
words.forEach(word => {
    console.log(`   - "${word}": ${cafSearchContent.includes(word) ? "✅" : "❌"}`);
});

console.log("\n=".repeat(70));
