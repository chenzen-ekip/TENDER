// Test de matching pour le marché 25-138135
import { matchesClientSetup } from "../lib/services/tender-engine";

// Le deuxième marché réel du BOAMP
const tender = {
    idweb: "25-138135",
    objet: "Nettoyage des locaux Pyramides et fournitures de consommables",
    code_departement: ["75", "92"],
    dateparution: "2025-12-17"
};

// Le client SBL
const clientSBL = {
    keywords: ["Nettoyage de locaux"],
    regions: ["75", "91", "92", "93", "94", "95", "78"]
};

console.log("\n🔍 Test de matching SBL vs Marché 25-138135\n");
console.log("Marché:", tender.objet);
console.log("Départements marché:", tender.code_departement);
console.log("\nClient SBL:");
console.log("Keywords:", clientSBL.keywords);
console.log("Régions:", clientSBL.regions);

const result = matchesClientSetup(tender, clientSBL);

console.log("\n✅ Match Result:", result ? "OUI ✅" : "NON ❌");

// Debug détaillé
const searchContent = (tender.objet + " ").toLowerCase();
console.log("\n🔎 Debug:");
console.log("Search content:", searchContent);
console.log("Keyword 'nettoyage de locaux' found:", searchContent.includes("nettoyage de locaux"));
console.log("Department match:", tender.code_departement.some(d => clientSBL.regions.includes(d)));
