"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

// --- Validation Schemas ---
const ClientFormSchema = z.object({
    // Client Info
    name: z.string().min(2, "Le nom doit faire au moins 2 caractères."),
    whatsapp: z.string().min(10, "Numéro valide requis."),
    sector: z.string().min(2),
    certifications: z.string().transform((str) => str.split(",").map((s) => s.trim()).filter(Boolean)), // Comma separated string -> array

    // Search Config
    keywords: z.string().transform((str) => str.split(",").map((s) => s.trim()).filter(Boolean)),
    departments: z.string().transform((str) => str.split(",").map((s) => s.trim()).filter(Boolean)),
    marketType: z.string().default("Services"),
    minBudget: z.coerce.number().min(0).default(0),

    // Sniper Rules
    mustHaveCerts: z.string().optional().transform((str) => str ? str.split(",").map((s) => s.trim()).filter(Boolean) : []),
    forbiddenKeywords: z.string().optional().transform((str) => str ? str.split(",").map((s) => s.trim()).filter(Boolean) : []),
    minProfitability: z.coerce.number().min(0).max(100).default(10),
});

export type ClientFormState = {
    message?: string;
    errors?: { [key: string]: string[] };
    success?: boolean;
};

/**
 * Server Action to create a new client and all associated records.
 */
export async function createClientAction(prevState: ClientFormState, formData: FormData): Promise<ClientFormState> {
    // 1. Validate Form Data
    const rawData = Object.fromEntries(formData.entries());

    // Handle array transformation manually if Zod coerce/transform is tricky with FormData directly,
    // but Zod transform above should handle strings.

    const validated = ClientFormSchema.safeParse(rawData);

    if (!validated.success) {
        return {
            success: false,
            message: "Erreur de validation.",
            errors: validated.error.flatten().fieldErrors,
        };
    }

    const data = validated.data;

    try {
        // 2. Database Transaction
        await db.$transaction(async (tx) => {
            // Create Client with Relations
            const client = await tx.client.create({
                data: {
                    name: data.name,
                    whatsapp_phone: data.whatsapp,
                    sector: data.sector,
                    certifications: data.certifications.join(", "),
                    // Create related records (Pro Architecture)
                    keywords: {
                        create: data.keywords.map((k) => ({ word: k }))
                    },
                    departments: {
                        create: data.departments.map((d) => ({ code: d }))
                    }
                },
            });

            // Create SearchConfig
            await tx.searchConfig.create({
                data: {
                    clientId: client.id,
                    // Keywords/Regions are now on the Client model directly
                    marketType: data.marketType,
                    minBudget: data.minBudget,
                },
            });

            // Create SniperRules
            await tx.sniperRules.create({
                data: {
                    clientId: client.id,
                    mustHaveCertifications: data.mustHaveCerts.join(", "),
                    forbiddenKeywords: data.forbiddenKeywords.join(", "),
                    minProfitability: data.minProfitability,
                },
            });
        });

        revalidatePath("/admin/clients");
        return { success: true, message: "Client créé avec succès !" };

    } catch (error) {
        console.error("Failed to create client:", error);
        return { success: false, message: "Erreur serveur lors de la création du client." };
    }
}
