// Test INLINE de la nouvelle logique
const keyword = "Nettoyage de locaux";
const searchContent = "prestations de nettoyage et de bio nettoyage des locaux, vitrerie et hôtellerie pour l'hôpital le vésinet";

const keywordLower = keyword.toLowerCase().trim();

console.log("Keyword:", keywordLower);
console.log("Search:", searchContent);

// 1. Match exact
const exactMatch = searchContent.includes(keywordLower);
console.log("\n1. Match exact:", exactMatch);

// 2. Match flexible
const words = keywordLower.split(/\s+/).filter(w => w.length > 2);
console.log("\n2. Words (>2 chars):", words);

const flexibleMatch = words.every(word => {
    const found = searchContent.includes(word);
    console.log(`   - "${word}" found:`, found);
    return found;
});

console.log("\n✅ Flexible Match Result:", flexibleMatch ? "OUI ✅" : "NON ❌");
