
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // Create a Pro Client "BTP Paris"
    const client = await prisma.client.create({
        data: {
            name: "BTP Paris Expert",
            whatsapp_phone: "33612345678",
            sector: "BTP",
            active: true,
            keywords: {
                create: [
                    { word: "Peinture" },
                    { word: "Ravalement" },
                    { word: "Maçonnerie" }
                ]
            },
            departments: {
                create: [
                    { code: "75" },
                    { code: "92" },
                    { code: "94" }
                ]
            },
            sniperRules: {
                create: {
                    minProfitability: 15
                }
            }
        }
    });

    console.log("✅ Seeded Client:", client.name);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
