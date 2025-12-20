// Script pour vérifier la configuration du client SBL dans la DB
import { db } from "../lib/db";
import { writeFileSync } from "fs";

async function checkClientConfig() {
    const lines: string[] = [];
    lines.push("Vérification de la configuration du client SBL");
    lines.push("");

    try {
        // Chercher le client SBL
        const client = await db.client.findFirst({
            where: { name: "SBL" },
            include: {
                keywords: true,
                departments: true
            }
        });

        if (!client) {
            lines.push("❌ Client SBL non trouvé dans la base de données!");
            lines.push("");
            lines.push("Liste de tous les clients:");

            const allClients = await db.client.findMany({
                include: {
                    keywords: true,
                    departments: true
                }
            });

            allClients.forEach(c => {
                lines.push("");
                lines.push(`- ${c.name} (ID: ${c.id})`);
                lines.push(`  Active: ${c.active}`);
                lines.push(`  Keywords: ${c.keywords.map((k: any) => k.word).join(', ')}`);
                lines.push(`  Departments: ${c.departments.map((d: any) => d.code).join(', ')}`);
            });
        } else {
            lines.push(`✅ Client trouvé: ${client.name}`);
            lines.push(`   ID: ${client.id}`);
            lines.push(`   Active: ${client.active}`);
            lines.push(`   Email: ${client.email || 'N/A'}`);
            lines.push("");
            lines.push("Configuration:");
            lines.push(`   Keywords (${client.keywords.length}):`);
            client.keywords.forEach((k: any) => {
                lines.push(`     - "${k.word}"`);
            });
            lines.push("");
            lines.push(`   Départements (${client.departments.length}):`);
            lines.push(`     ${client.departments.map((d: any) => d.code).join(', ')}`);

            // Vérifier les opportunités existantes
            const opportunities = await db.opportunity.findMany({
                where: { clientId: client.id },
                include: { tender: true },
                orderBy: { createdAt: 'desc' },
                take: 10
            });

            lines.push("");
            lines.push(`Opportunités récentes (${opportunities.length}):`);
            opportunities.forEach((opp: any) => {
                lines.push("");
                lines.push(`   - ${opp.tender.id_boamp}`);
                lines.push(`     ${opp.tender.title.substring(0, 80)}`);
                lines.push(`     Status: ${opp.status}`);
                lines.push(`     Créé: ${new Date(opp.createdAt).toLocaleString()}`);
            });
        }

        const report = lines.join('\n');
        writeFileSync('client-config-check.txt', report, 'utf-8');
        console.log(report);
        console.log("\n✅ Rapport écrit dans: client-config-check.txt");

    } catch (error) {
        const errorMsg = `❌ Erreur: ${error}`;
        console.error(errorMsg);
        lines.push(errorMsg);
        writeFileSync('client-config-check.txt', lines.join('\n'), 'utf-8');
    } finally {
        await db.$disconnect();
    }
}

checkClientConfig();
