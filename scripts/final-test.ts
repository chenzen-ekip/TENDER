
import { db } from "../lib/db";
import { analyzeTender } from "../lib/services/ai-sniper";
import { sendOpportunityAlert } from "../lib/services/notification.service";
import { v4 as uuidv4 } from "uuid";

/**
 * 🧪 SCRIPT DE TEST FINAL - FLUX GLOBAL
 * 1. Crée un Client de Test
 * 2. Simule l'arrivée d'un (vrai) marché BOAMP (injecté directement)
 * 3. Lance l'Analyse IA (AI Sniper)
 * 4. Simule l'envoi de l'Email
 */
async function main() {
    console.log("🚀 Lancement du Test Global (End-to-End)...");

    // 1. Create Test Client
    console.log("\n👤 Création du Client de Test...");
    const clientName = "TEST FINAL CORP";
    const clientEmail = "aurelien.soler@gmail.com"; // User's email for real check if needed

    // Cleanup previous test
    const existingClient = await db.client.findFirst({ where: { name: clientName } });
    if (existingClient) {
        await db.client.delete({ where: { id: existingClient.id } });
    }

    const client = await db.client.create({
        data: {
            name: clientName,
            email: clientEmail,
            sector: "Nettoyage",

            // Phase 2 Enrichment (Commented until Prisma Generate works)
            // siret: "12345678900000",
            // annualRevenue: 1000,

            searchConfig: {
                create: {
                    marketType: "Services",
                    // keywords removed (now on Client relation)
                    // regions removed (using departments relation instead)
                    minBudget: 50000
                }
            },
            sniperRules: {
                create: {
                    minProfitability: 10,
                    mustHaveCertifications: "",
                    forbiddenKeywords: "travaux"
                }
            },
            keywords: {
                create: [{ word: "nettoyage" }, { word: "entretien" }]
            },
            departments: {
                create: [{ code: "75" }, { code: "62" }]
            }
        },
        include: { searchConfig: true, sniperRules: true }
    });
    console.log(`✅ Client créé : ${client.name} (${client.email})`);

    // 2. Simulate Tender Injection (Sourcing)
    console.log("\n📡 Simulation Sourcing (Injection Directe)...");

    // Real-ish data from recent cleanup
    const tenderId = uuidv4();
    const boampId = "24-111111";

    // Cleanup previous tender if exists
    await db.tender.deleteMany({ where: { id_boamp: boampId } });

    const tender = await db.tender.create({
        data: {
            id_boamp: boampId,
            title: "Marché de Nettoyage des Locaux Administratifs - Mairie de Paris",
            summary: "Prestations de nettoyage courant et vitrerie pour les bâtiments municipaux...", // Short summary
            // description: removed (not in schema)
            // date_parution: removed
            // source_url: removed (using pdf_url)
            pdf_url: "https://www.boamp.fr/pages/avis/?q=idweb:24-111111",
            status: "EXTRACTED",
            deadline: new Date("2025-01-15T12:00:00Z")
        }
    });

    console.log(`✅ Sourcing OK - Marché inséré : ${tender.title}`);

    // Create Opportunity Link
    const opportunity = await db.opportunity.create({
        data: {
            clientId: client.id,
            tenderId: tender.id,
            status: "PENDING",
            match_score: 0,
            ai_analysis: "{}" // Required field
        }
    });
    console.log(`🔗 Opportunité liée (ID: ${opportunity.id})`);

    // 3. AI Analysis
    console.log("\n🧠 Lancement Analyse IA...");
    const aiResult = await analyzeTender(opportunity.id);

    if (aiResult?.status === "VALIDATED") {
        console.log("✅ Analyse IA OK - Marché VALIDÉ");
        console.log("   Raison:", aiResult.summary?.key_points);
    } else {
        console.log("❌ Analyse IA : REJETÉ (Ce n'était pas prévu pour ce test positif)");
        console.log("   Raison:", aiResult?.error || "Rejet Auto");
    }

    // 4. Notification Email
    console.log("\n✉️ Envoi de l'Email de Notification...");
    if (aiResult?.status === "VALIDATED") {
        try {
            await sendOpportunityAlert(opportunity.id);
            console.log(`✅ Email envoyé à ${client.email}`);
        } catch (e) {
            console.error("❌ Erreur envoi email:", e);
        }
    } else {
        console.log("⚠️ Pas d'email car opportunité rejetée.");
    }

    console.log("\n🎉 TEST GLOBAL TERMINÉ !");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await db.$disconnect();
    });
