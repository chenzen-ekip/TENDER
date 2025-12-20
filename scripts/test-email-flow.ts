// Script pour tester les emails enrichis et la notification admin
import { db } from "../lib/db";
import { sendOpportunityAlert, sendAdminDceRequestAlert } from "../lib/services/notification.service";

async function testEmailFlow() {
    console.log("🧪 TEST COMPLET DU FLUX EMAIL\n");
    console.log("=".repeat(80) + "\n");

    try {
        // 1. Trouver une opportunité VALIDATED récente
        const opportunity = await db.opportunity.findFirst({
            where: {
                status: "WAITING_CLIENT_DECISION"
            },
            orderBy: { createdAt: 'desc' },
            include: {
                tender: true,
                client: true
            }
        });

        if (!opportunity) {
            console.log("❌ Aucune opportunité WAITING_CLIENT_DECISION trouvée.");
            console.log("💡 Lancez d'abord le cron pour générer des opportunités.\n");
            return;
        }

        console.log("✅ Opportunité trouvée pour test:\n");
        console.log(`   ID: ${opportunity.id}`);
        console.log(`   Client: ${opportunity.client.name}`);
        console.log(`   Email: ${opportunity.client.email || 'N/A'}`);
        console.log(`   Tender: ${opportunity.tender.title}`);
        console.log(`   Status: ${opportunity.status}\n`);

        // 2. Afficher l'analyse AI (pour vérifier les nouveaux champs)
        console.log("🧠 ANALYSE AI STOCKÉE:\n");

        try {
            const aiData = typeof opportunity.ai_analysis === 'string'
                ? JSON.parse(opportunity.ai_analysis)
                : opportunity.ai_analysis;

            console.log(`   Title: ${aiData.title || 'N/A'}`);
            console.log(`   Summary: ${aiData.summary || 'N/A'}`);
            console.log(`   Budget: ${aiData.budget || 'N/A'}`);
            console.log(`   Deadline: ${aiData.deadline || 'N/A'}`);
            console.log(`   Location: ${aiData.location || 'N/A'}`);
            console.log(`   Duration: ${aiData.duration || 'N/A'}`);
            console.log(`   Urgency: ${aiData.urgency || 'N/A'}`);
            console.log(`   Key Points: ${aiData.key_points ? aiData.key_points.join(', ') : 'N/A'}`);

            console.log("\n" + "=".repeat(80) + "\n");

            // Vérifier si les nouveaux champs sont présents
            const hasNewFields = !!(aiData.summary || aiData.budget || aiData.deadline || aiData.location || aiData.duration);

            if (hasNewFields) {
                console.log("✅ LES NOUVEAUX CHAMPS SONT PRÉSENTS dans l'analyse AI\n");
            } else {
                console.log("⚠️  LES NOUVEAUX CHAMPS SONT ABSENTS - analyse créée avant la mise à jour\n");
                console.log("💡 Relancez le cron pour générer de nouvelles analyses enrichies\n");
            }

        } catch (e) {
            console.log(`   Raw: ${opportunity.ai_analysis}\n`);
        }

        // 3. Demander si on veut envoyer un email de test
        console.log("=".repeat(80) + "\n");
        console.log("📧 TEST 1: ENVOI EMAIL CLIENT\n");
        console.log(`Voulez-vous envoyer un email de test à ${opportunity.client.email || 'N/A'} ?`);
        console.log("(Modifiez le script pour activer: sendEmailTest = true)\n");

        const sendEmailTest = false; // CHANGEZ EN true POUR TESTER

        if (sendEmailTest && opportunity.client.email) {
            console.log("📤 Envoi de l'email client...\n");
            await sendOpportunityAlert(opportunity.id);
            console.log("✅ Email envoyé ! Vérifiez votre boîte de réception.\n");
        } else {
            console.log("⏭️  Test email client ignoré.\n");
        }

        // 4. Tester la notification admin
        console.log("=".repeat(80) + "\n");
        console.log("🚨 TEST 2: NOTIFICATION ADMIN (après clic GO)\n");
        console.log("Voulez-vous tester la notification admin ?");
        console.log("(Modifiez le script pour activer: sendAdminTest = true)\n");

        const sendAdminTest = false; // CHANGEZ EN true POUR TESTER

        if (sendAdminTest) {
            console.log("📤 Envoi de l'alerte admin...\n");
            await sendAdminDceRequestAlert(opportunity.id);
            console.log("✅ Email admin envoyé ! Vérifiez la boîte admin.\n");
        } else {
            console.log("⏭️  Test notification admin ignoré.\n");
        }

        console.log("=".repeat(80) + "\n");
        console.log("📋 RÉSUMÉ:\n");
        console.log(`✅ Opportunité analysée: ${opportunity.id}`);
        console.log(`✅ Analyse AI: ${hasNewFields ? 'ENRICHIE ✨' : 'BASIQUE'}`);
        console.log(`✅ Email client: ${sendEmailTest ? 'ENVOYÉ 📧' : 'NON TESTÉ'}`);
        console.log(`✅ Email admin: ${sendAdminTest ? 'ENVOYÉ 📧' : 'NON TESTÉ'}`);
        console.log("\n💡 Pour tester les emails, éditez le script et changez:");
        console.log("   sendEmailTest = true");
        console.log("   sendAdminTest = true\n");

    } catch (error) {
        console.error("❌ Erreur:", error);
    } finally {
        await db.$disconnect();
    }
}

testEmailFlow();
