// Test de matching pour le marché 25-139491
import { matchesClientSetup } from "../lib/services/tender-engine";

// Le marché réel du BOAMP
const tender = {
    idweb: "25-139491",
    objet: "Prestations de nettoyage et de bio nettoyage des locaux, vitrerie et hôtellerie pour l'hôpital Le Vésinet",
    code_departement: ["78", "75"],
    dateparution: "2025-12-19"
};

// Le client SBL
const clientSBL = {
    keywords: ["Nettoyage de locaux"],
    regions: ["75", "91", "92", "93", "94", "95", "78"]
};

console.log("\n🔍 Test de matching SBL vs Marché 25-139491\n");
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
