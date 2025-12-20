"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

// --- Validation Schemas ---
const ClientFormSchema = z.object({
    // Client Info
    name: z.string().min(2, "Le nom doit faire au moins 2 caractères."),
    email: z.string().email("Email valide requis."),
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
                    email: data.email,
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
// ... existing code ...

/**
 * Server Action to update an existing client.
 */
export async function updateClientAction(clientId: string, prevState: ClientFormState, formData: FormData): Promise<ClientFormState> {
    // 1. Validate Form Data
    const rawData = Object.fromEntries(formData.entries());
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
            // Update Client Basic Info
            await tx.client.update({
                where: { id: clientId },
                data: {
                    name: data.name,
                    email: data.email,
                    sector: data.sector,
                    certifications: data.certifications.join(", "),
                },
            });

            // Update Relations (Easy way: Delete all and re-create)
            // Keywords
            await tx.clientKeyword.deleteMany({ where: { clientId } });
            await tx.clientKeyword.createMany({
                data: data.keywords.map((k) => ({ word: k, clientId })),
            });

            // Departments
            await tx.clientDepartment.deleteMany({ where: { clientId } });
            await tx.clientDepartment.createMany({
                data: data.departments.map((d) => ({ code: d, clientId })),
            });

            // Update SearchConfig
            // Upsert in case it was missing for some reason
            await tx.searchConfig.upsert({
                where: { clientId },
                update: {
                    marketType: data.marketType,
                    minBudget: data.minBudget,
                },
                create: {
                    clientId,
                    marketType: data.marketType,
                    minBudget: data.minBudget,
                }
            });

            // Update SniperRules
            await tx.sniperRules.upsert({
                where: { clientId },
                update: {
                    mustHaveCertifications: data.mustHaveCerts.join(", "),
                    forbiddenKeywords: data.forbiddenKeywords.join(", "),
                    minProfitability: data.minProfitability,
                },
                create: {
                    clientId,
                    mustHaveCertifications: data.mustHaveCerts.join(", "),
                    forbiddenKeywords: data.forbiddenKeywords.join(", "),
                    minProfitability: data.minProfitability,
                }
            });
        });

        revalidatePath("/admin/clients");
        revalidatePath("/"); // Also revalidate home if dashboard is there
        return { success: true, message: "Client mis à jour avec succès !" };

    } catch (error) {
        console.error("Failed to update client:", error);
        return { success: false, message: "Erreur serveur lors de la mise à jour." };
    }
}
// ... existing code ...

/**
 * Server Action to delete a client.
 */
export async function deleteClientAction(clientId: string): Promise<{ success: boolean; message: string }> {
    try {
        await db.client.delete({
            where: { id: clientId },
        });

        revalidatePath("/admin/clients");
        revalidatePath("/");
        return { success: true, message: "Client supprimé." };
    } catch (error) {
        console.error("Failed to delete client:", error);
        return { success: false, message: "Erreur lors de la suppression." };
    }
}
