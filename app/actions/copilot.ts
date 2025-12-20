"use server";

import { generateDraftResponse } from "@/lib/services/response-generator";
import { analyzeRC } from "@/lib/services/ai-extractor";
import { revalidatePath } from "next/cache";

export async function generateDocsAction(opportunityId: string) {
    try {
        const paths = await generateDraftResponse(opportunityId);
        return { success: true, paths };
    } catch (e: any) {
        console.error("Generate Docs Error:", e);
        return { success: false, error: e.message };
    }
}

export async function runDeepDiveAction(opportunityId: string) {
    try {
        const analysis = await analyzeRC(opportunityId);
        revalidatePath(`/opportunities/${opportunityId}`);
        return { success: true, analysis };
    } catch (e: any) {
        console.error("Deep Dive Error:", e);
        return { success: false, error: e.message };
    }
}
