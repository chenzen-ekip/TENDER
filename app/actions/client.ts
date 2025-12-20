"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

// --- Validation Schemas ---
// --- Validation Schemas ---
const ClientFormSchema = z.object({
    // Client Info
    name: z.string().min(2, "Le nom doit faire au moins 2 caractères."),
    email: z.string().email("Email valide requis."),
    sector: z.string().min(2),
    certifications: z.string().transform((str) => str.split(",").map((s) => s.trim()).filter(Boolean)), // Comma separated string -> array

    // Enrichment (Phase 2)
    siret: z.string().optional(),
    annualRevenue: z.coerce.number().optional(),
    employeeCount: z.coerce.number().optional(),
    references: z.string().optional(),

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
    errors?: {
        name?: string[];
        email?: string[];
        sector?: string[];
        certifications?: string[];
        siret?: string[];
        annualRevenue?: string[];
        employeeCount?: string[];
        references?: string[];
        keywords?: string[];
        departments?: string[];
        marketType?: string[];
        minBudget?: string[];
        mustHaveCerts?: string[];
        forbiddenKeywords?: string[];
        minProfitability?: string[];
        [key: string]: string[] | undefined;
    };
    message?: string;
    success?: boolean;
};

export async function createClientAction(prevState: ClientFormState, formData: FormData): Promise<ClientFormState> {
    // ... (Validation logic remains same) ...
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
        await db.$transaction(async (tx) => {
            const client = await tx.client.create({
                data: {
                    name: data.name,
                    // @ts-ignore
                    email: data.email,
                    sector: data.sector,
                    certifications: data.certifications.join(", "),
                    // Enhanced fields
                    siret: data.siret,
                    annualRevenue: data.annualRevenue,
                    employeeCount: data.employeeCount,
                    references: data.references,

                    keywords: {
                        create: data.keywords.map((k) => ({ word: k }))
                    },
                    departments: {
                        create: data.departments.map((d) => ({ code: d }))
                    }
                },
            });

            // ... (SearchConfig and SniperRules creation remains same) ...
            await tx.searchConfig.create({
                data: {
                    clientId: client.id,
                    marketType: data.marketType,
                    minBudget: data.minBudget,
                },
            });

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

export async function updateClientAction(clientId: string, prevState: ClientFormState, formData: FormData): Promise<ClientFormState> {
    // ... (Validation logic remains same) ...
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
        await db.$transaction(async (tx) => {
            await tx.client.update({
                where: { id: clientId },
                data: {
                    name: data.name,
                    // @ts-ignore
                    email: data.email,
                    sector: data.sector,
                    certifications: data.certifications.join(", "),
                    // Enhanced fields update
                    siret: data.siret,
                    annualRevenue: data.annualRevenue,
                    employeeCount: data.employeeCount,
                    references: data.references,
                },
            });
            // ... (Relations update remains same) ...
            await tx.clientKeyword.deleteMany({ where: { clientId } });
            await tx.clientKeyword.createMany({
                data: data.keywords.map((k) => ({ word: k, clientId })),
            });
            await tx.clientDepartment.deleteMany({ where: { clientId } });
            await tx.clientDepartment.createMany({
                data: data.departments.map((d) => ({ code: d, clientId })),
            });

            await tx.searchConfig.upsert({
                where: { clientId },
                update: { marketType: data.marketType, minBudget: data.minBudget },
                create: { clientId, marketType: data.marketType, minBudget: data.minBudget }
            });

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
        revalidatePath("/");
        return { success: true, message: "Client mis à jour avec succès !" };

    } catch (error) {
        console.error("Failed to update client:", error);
        return { success: false, message: "Erreur serveur lors de la mise à jour." };
    }
}



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
