"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { createClientAction, updateClientAction } from "@/app/actions/client";
// ... imports ...
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PlusCircle, Loader2 } from "lucide-react";

// Schema adapted for Frontend Form Management (Arrays)
const formSchema = z.object({
    name: z.string().min(2, "Nom requis (min 2)"),
    email: z.string().email("Email valide requis"),
    sector: z.string().min(1, "Secteur requis"),
    certifications: z.string().optional(),

    // Enrichment (Phase 2)
    siret: z.string().optional(),
    annualRevenue: z.coerce.number().optional(),
    employeeCount: z.coerce.number().optional(),
    references: z.string().optional(),

    keywords: z.array(z.string()).default([]),
    departments: z.array(z.string()).default([]),
    searchUrl: z.string().url("URL invalide").optional().or(z.literal("")),
    marketType: z.string(),
    minBudget: z.coerce.number(),
    mustHaveCerts: z.string().optional(),
    forbiddenKeywords: z.string().optional(),
    minProfitability: z.coerce.number(),
});

interface ClientFormProps {
    initialData?: any; // Start loose, refine if needed
    children?: React.ReactNode; // Custom trigger
}

export function ClientForm({ initialData, children }: ClientFormProps) {
    const [open, setOpen] = useState(false);
    const [isPending, startTransition] = useTransition();

    const isEdit = !!initialData;

    // Default values logic
    const defaultValues = isEdit ? {
        name: initialData.name,
        email: initialData.email || "",
        sector: initialData.sector || "",
        certifications: initialData.certifications || "",

        siret: initialData.siret || "",
        searchUrl: initialData.searchUrl || "",
        annualRevenue: initialData.annualRevenue || 0,
        employeeCount: initialData.employeeCount || 0,
        references: initialData.references || "",

        keywords: initialData.keywords?.map((k: any) => k.word) || [],
        departments: initialData.departments?.map((d: any) => d.code) || [],
        marketType: initialData.searchConfig?.marketType || "Services",
        minBudget: initialData.searchConfig?.minBudget || 0,
        mustHaveCerts: initialData.sniperRules?.mustHaveCertifications || "",
        forbiddenKeywords: initialData.sniperRules?.forbiddenKeywords || "",
        minProfitability: initialData.sniperRules?.minProfitability || 10,
    } : {
        name: "",
        email: "",
        sector: "Nettoyage",
        certifications: "",

        siret: "",
        searchUrl: "",
        annualRevenue: 0,
        employeeCount: 0,
        references: "",

        keywords: [],
        departments: [],
        marketType: "Services",
        minBudget: 0,
        mustHaveCerts: "",
        forbiddenKeywords: "",
        minProfitability: 10,
    };

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema) as any,
        defaultValues,
    });

    // Reset form when opening dialog with new data (if feasible) or just rely on key
    // For simplicity in list mapping, we usually let the component remount or use key.

    async function onSubmit(values: z.infer<typeof formSchema>) {
        startTransition(async () => {
            const formData = new FormData();

            // Standard fields
            formData.append("name", values.name);
            formData.append("email", values.email);
            formData.append("sector", values.sector);
            formData.append("certifications", values.certifications || "");

            // Enrichment fields
            if (values.siret) formData.append("siret", values.siret);
            if (values.annualRevenue) formData.append("annualRevenue", values.annualRevenue.toString());
            if (values.employeeCount) formData.append("employeeCount", values.employeeCount.toString());
            if (values.references) formData.append("references", values.references);

            formData.append("marketType", values.marketType);
            formData.append("minBudget", values.minBudget.toString());
            formData.append("searchUrl", values.searchUrl || "");
            formData.append("mustHaveCerts", values.mustHaveCerts || "");
            formData.append("forbiddenKeywords", values.forbiddenKeywords || "");
            formData.append("minProfitability", values.minProfitability.toString());

            // Array fields -> Convert to CSV string for the Server Action
            formData.append("keywords", values.keywords.join(","));
            formData.append("departments", values.departments.join(","));

            let result;
            if (isEdit) {
                result = await updateClientAction(initialData.id, {}, formData);
            } else {
                result = await createClientAction({}, formData);
            }

            if (result.success) {
                setOpen(false);
                if (!isEdit) form.reset(); // Don't reset on edit, keeps values
            } else {
                console.error(result.message);
                alert(result.message);
            }
        });
    }

    // URL based sourcing

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children ? children : (
                    <Button>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Ajouter un Client
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{isEdit ? "Modifier Client" : "Nouveau Client"}</DialogTitle>
                    <DialogDescription>
                        Configurez le client avec précision (Départements et Métiers BOAMP).
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                        {/* Section 1: Client Info */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium border-b pb-2">Identification</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Nom de l'entreprise</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Acme Inc." {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Adresse Email de notification</FormLabel>
                                            <FormControl>
                                                <Input placeholder="contact@acme.com" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                        {/* Section 2: Sourcing Radar */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium border-b pb-2">Sourcing Radar</h3>
                            <FormField
                                control={form.control}
                                name="searchUrl"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Lien de Recherche BOAMP (Radar automatique)</FormLabel>
                                        <FormControl>
                                            <Input placeholder="https://www.boamp.fr/pages/recherche/?..." {...field} />
                                        </FormControl>
                                        <FormDescription>
                                            Collez l'URL de recherche BOAMP déjà filtrée. Elle sera utilisée pour le sourcing horaire.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Section 3: AI Rules */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium border-b pb-2">Règles Sniper (IA)</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="forbiddenKeywords"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Mots-clés Interdits</FormLabel>
                                            <FormControl>
                                                <Input placeholder="travaux, construction" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="minProfitability"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Rentabilité Min (%)</FormLabel>
                                            <FormControl>
                                                <Input type="number" {...field} value={field.value as string | number} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                        <Button type="submit" className="w-full" disabled={isPending}>
                            {isPending ? "Enregistrement..." : (isEdit ? "Enregistrer les modifications" : "Créer le Client")}
                        </Button>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
