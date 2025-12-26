
import { db } from "../lib/db";
import { sendOpportunityAlert } from "../lib/services/notification.service";
import { v4 as uuidv4 } from "uuid";

async function setupDemo() {
    console.log("🎬 Setting up DEMO for Apoem Nettoyage...");

    // 1. Create/Get Client
    const clientName = "apoem nettoyage";
    // Using a known accessible email for the demo video (User's probably)
    // Assuming context from previous commands, user is aurel.avoungnassou59@gmail.com
    const clientEmail = "aurelavn1@gmail.com";

    let client = await db.client.findFirst({ where: { name: clientName } });

    if (!client) {
        client = await db.client.create({
            data: {
                name: clientName,
                email: clientEmail,
                sector: "Nettoyage Industriel",
                active: true
            }
        });
        console.log(`✅ Client created: ${client.name}`);
    } else {
        // Update email to be sure
        client = await db.client.update({
            where: { id: client.id },
            data: { email: clientEmail }
        });
        console.log(`✅ Client found and updated: ${client.name}`);
    }

    // 2. Create Tender (Perfect Match in 33 - Gironde)
    const tenderId = `DEMO-${Date.now()}`;
    const tender = await db.tender.create({
        data: {
            id_boamp: tenderId,
            title: "Entretien et Nettoyage des Bureaux du Conseil Départemental de la Gironde (33)",
            summary: "Prestations de nettoyage des locaux administratifs et vitrerie pour plusieurs sites situés à Bordeaux et dans la métropole bordelaise. Fréquence quotidienne.",
            pdf_url: "https://www.boamp.fr", // Fake link
            status: "EXTRACTED",
            deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 15), // +15 days
            raw_data: { departement: "33" }
        }
    });

    console.log(`✅ Tender created: ${tender.title}`);

    // 3. Create Opportunity
    const aiSummary = {
        title: "Nettoyage Bureaux Administratifs - Bordeaux (33)",
        summary: "Marché public pour le nettoyage quotidien des bureaux administratifs du département. Inclut le dépoussiérage, l'entretien des sols et la gestion des sanitaires. Sites centraux à Bordeaux.",
        budget: "240k€ / an (Estimé)",
        deadline: "20 Janvier 2026",
        location: "Bordeaux (33000)",
        duration: "24 mois + 2 reconductions",
        key_points: [
            "Proximité géographique immédiate (33)",
            "Marché récurrent et stable",
            "Volume de travail important",
            "Possibilité de lotissement technique"
        ],
        urgency: "HAUTE"
    };

    const opportunity = await db.opportunity.create({
        data: {
            clientId: client.id,
            tenderId: tender.id,
            status: "WAITING_CLIENT_DECISION",
            match_score: 95,
            decision_token: uuidv4(),
            ai_analysis: JSON.stringify(aiSummary),
            // Pre-fill fake DCE files so they appear immediately in the "DCE Ready" view
            dceFiles: {
                files: [
                    { name: "CCTP_Nettoyage_GRDF.pdf", category: "TECHNIQUE", is_priority: true },
                    { name: "RC_Reglement_Consultation.pdf", category: "ADMINISTRATIF", is_priority: true },
                    { name: "DPGF_Annexe_Prix.xlsx", category: "FINANCIER", is_priority: false },
                    { name: "AE_Acte_Engagement.pdf", category: "ADMINISTRATIF", is_priority: false },
                    { name: "Plan_Surfaces_Niveaux.pdf", category: "TECHNIQUE", is_priority: false }
                ]
            }
        }
    });

    console.log(`✅ Opportunity created: ${opportunity.id}`);
    console.log(`🔑 Decision Token: ${opportunity.decision_token}`);

    // 4. Send Email
    console.log("📧 Sending Alert...");
    await sendOpportunityAlert(opportunity.id);
    console.log("🚀 EMAIL SENT! Check inbox.");
    console.log(`👉 Direct Link (Backup): http://localhost:3000/decision/${opportunity.decision_token}/accept`);

    await db.$disconnect();
}

setupDemo();
