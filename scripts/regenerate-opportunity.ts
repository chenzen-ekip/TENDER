// Script pour forcer la re-analyse d'une opportunité avec les nouveaux champs
import { db } from "../lib/db";
import { analyzeTender } from "../lib/services/ai-sniper";
import { sendOpportunityAlert } from "../lib/services/notification.service";

async function regenerateOpportunity() {
    console.log("🔄 RÉGÉNÉRATION D'UNE OPPORTUNITÉ AVEC ANALYSE ENRICHIE\n");
    console.log("=".repeat(80) + "\n");

    try {
        // 1. Trouver une opportunité du client SBL
        const opportunity = await db.opportunity.findFirst({
            where: {
                client: { name: "SBL" }
            },
            orderBy: { createdAt: 'desc' },
            include: {
                tender: true,
                client: true
            }
        });

        if (!opportunity) {
            console.log("❌ Aucune opportunité trouvée pour le client SBL.\n");
            return;
        }

        console.log("✅ Opportunité trouvée:\n");
        console.log(`   ID: ${opportunity.id}`);
        console.log(`   Tender: ${opportunity.tender.title}`);
        console.log(`   Status actuel: ${opportunity.status}\n`);

        // 2. Reset le status pour forcer la re-analyse
        console.log("📝 Réinitialisation du status...\n");
        await db.opportunity.update({
            where: { id: opportunity.id },
            data: {
                status: "ANALYSIS_PENDING",
                ai_analysis: "Pending re-analysis...",
                processedAt: null
            }
        });

        // 3. Re-analyser avec le nouveau prompt AI
        console.log("🤖 Re-analyse avec le prompt enrichi...\n");
        const result = await analyzeTender(opportunity.id);

        console.log(`✅ Analyse terminée: ${result?.status}\n`);

        // 4. Récupérer l'opportunité mise à jour
        const updated = await db.opportunity.findUnique({
            where: { id: opportunity.id },
            include: { tender: true, client: true }
        });

        if (!updated) {
            console.log("❌ Impossible de récupérer l'opportunité mise à jour.\n");
            return;
        }

        // 5. Afficher la nouvelle analyse
        console.log("=".repeat(80) + "\n");
        console.log("🧠 NOUVELLE ANALYSE AI:\n");

        try {
            const aiData = typeof updated.ai_analysis === 'string'
                ? JSON.parse(updated.ai_analysis)
                : updated.ai_analysis;

            console.log(`   Title: ${aiData.title || 'N/A'}`);
            console.log(`   Summary: ${aiData.summary || 'N/A'}`);
            console.log(`   Budget: ${aiData.budget || 'N/A'}`);
            console.log(`   Deadline: ${aiData.deadline || 'N/A'}`);
            console.log(`   Location: ${aiData.location || 'N/A'}`);
            console.log(`   Duration: ${aiData.duration || 'N/A'}`);
            console.log(`   Urgency: ${aiData.urgency || 'N/A'}`);
            console.log(`   Key Points:`);
            if (aiData.key_points) {
                aiData.key_points.forEach((point: string) => {
                    console.log(`     - ${point}`);
                });
            }

            const hasNewFields = !!(aiData.summary || aiData.budget || aiData.deadline || aiData.location || aiData.duration);

            console.log("\n" + "=".repeat(80) + "\n");

            if (hasNewFields) {
                console.log("✅ LES NOUVEAUX CHAMPS SONT PRÉSENTS ! 🎉\n");

                // 6. Envoyer l'email de test
                console.log("📧 Envoi de l'email de test à votre adresse...\n");

                if (updated.client.email) {
                    await sendOpportunityAlert(updated.id);
                    console.log(`✅ EMAIL ENVOYÉ à ${updated.client.email} !\n`);
                    console.log("📬 Vérifiez votre boîte de réception (et spam) pour voir l'email enrichi.\n");
                } else {
                    console.log("⚠️  Pas d'email configuré pour ce client.\n");
                }

                console.log("=".repeat(80) + "\n");
                console.log("🎯 NEXT STEPS:\n");
                console.log("1. Vérifiez votre email pour voir le résumé enrichi");
                console.log("2. Cliquez sur le bouton '✅ GO' dans l'email");
                console.log("3. Vous devriez recevoir un 2ème email (notification admin)\n");

            } else {
                console.log("⚠️  Les nouveaux champs sont toujours absents.\n");
                console.log("Raisons possibles:");
                console.log("- Pas de clé OpenAI API configurée");
                console.log("- Le prompt AI n'a pas réussi à extraire les données");
                console.log("- Le tender n'a pas assez d'informations\n");
            }

        } catch (e) {
            console.log(`   Raw: ${updated.ai_analysis}\n`);
        }

    } catch (error) {
        console.error("❌ Erreur:", error);
    } finally {
        await db.$disconnect();
    }
}

regenerateOpportunity();
