import { sendTelegramAlert } from "../lib/services/notifier";

async function main() {
    console.log("🚀 [Test] Envoi d'une alerte Telegram de test...");

    try {
        await sendTelegramAlert("🎯 **TEST SYSTÈME RADAR**\n\nLe moteur Sniper est en ligne et opérationnel.\n\n✅ Connexion BOAMP: OK\n✅ Intelligence Artificielle: OK\n✅ Système d'alerte: OK\n\nPrêt à chasser ! 🏎️💨");
        console.log("✅ Alerte envoyée ! Vérifiez votre Telegram.");
    } catch (error) {
        console.error("❌ Échec de l'envoi :", error);
    }
}

main();
