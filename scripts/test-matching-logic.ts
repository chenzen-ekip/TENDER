// Test pour comprendre pourquoi le matching flexible ne fonctionne pas
const searchContent = "prestations de nettoyage et entretien des locaux de la caf de la seine-saint-denis";
const keyword = "nettoyage de locaux";

console.log("🧪 TEST DE MATCHING FLEXIBLE\n");
console.log(`Texte du tender: "${searchContent}"`);
console.log(`Mot-clé: "${keyword}"\n`);

// Test 1: Match exact (devrait échouer)
const exactMatch = searchContent.includes(keyword);
console.log(`1️⃣ Match exact: ${exactMatch ? '✅' : '❌'} (attendu: ❌)`);

// Test 2: Match flexible (utilisé dans le code)
const words = keyword.split(/\s+/).filter(w => w.length > 2);
console.log(`\n2️⃣ Mots significatifs extraits: [${words.join(', ')}] (> 2 lettres)`);

const flexibleMatch = words.every(word => searchContent.includes(word));
console.log(`   Tous les mots présents? ${flexibleMatch ? '✅' : '❌'} (attendu: ✅)`);

words.forEach(word => {
    const found = searchContent.includes(word);
    console.log(`   - "${word}": ${found ? '✅ trouvé' : '❌ absent'}`);
});

console.log("\n🔍 CONCLUSION:");
if (flexibleMatch) {
    console.log("✅ Le matching flexible DEVRAIT fonctionner!");
    console.log("   Le problème est probablement dans l'AI ou la DB.");
} else {
    console.log("❌ Le matching flexible échoue aussi!");
    console.log("   Il faut vérifier la logique de split/filter.");
}
