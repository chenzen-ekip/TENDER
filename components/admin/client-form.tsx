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
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PlusCircle, Loader2 } from "lucide-react";
import { MultiSelect } from "@/components/ui/multi-select";
import { DEPARTMENTS } from "@/constants/departments";
import { DESCRIPTORS } from "@/constants/descriptors";

// Schema adapted for Frontend Form Management (Arrays)
const formSchema = z.object({
    name: z.string().min(2, "Nom requis (min 2)"),
    email: z.string().email("Email valide requis"),
    sector: z.string().min(1, "Secteur requis"),
    certifications: z.string().optional(),
    keywords: z.array(z.string()).min(1, "Au moins 1 mot-clé requis"),
    departments: z.array(z.string()).min(1, "Au moins 1 département requis"),
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
        keywords: initialData.keywords.map((k: any) => k.word),
        departments: initialData.departments.map((d: any) => d.code),
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
            formData.append("marketType", values.marketType);
            formData.append("minBudget", values.minBudget.toString());
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

    // Transform options for MultiSelect
    const deptOptions = DEPARTMENTS.map(d => ({ value: d.code, label: `${d.code} - ${d.name}` }));
    // Descriptors are already in good format but allow searching by simple label
    const keywordOptions = DESCRIPTORS.map(d => ({ value: d.value, label: d.label })); // value is the rigorous keyword

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
                            <h3 className="text-lg font-medium border-b pb-2">Infos Client</h3>
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
                                            <FormLabel>Adresse Email</FormLabel>
                                            <FormControl>
                                                <Input placeholder="contact@acme.com" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                        {/* Section 2: Search Config */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium border-b pb-2">Ciblage Précis</h3>
                            <div className="grid grid-cols-1 gap-4">
                                <FormField
                                    control={form.control}
                                    name="keywords"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Métiers (Descripteurs BOAMP)</FormLabel>
                                            <FormControl>
                                                <MultiSelect
                                                    options={keywordOptions}
                                                    selected={field.value}
                                                    onChange={field.onChange}
                                                    placeholder="Rechercher un métier (ex: Peinture, Nettoyage...)"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="departments"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Zone Géographique</FormLabel>
                                            <FormControl>
                                                <MultiSelect
                                                    options={deptOptions}
                                                    selected={field.value}
                                                    onChange={field.onChange}
                                                    placeholder="Rechercher un département (ex: 75, Nord...)"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4 mt-4">
                                <FormField
                                    control={form.control}
                                    name="minBudget"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Budget Min (€)</FormLabel>
                                            <FormControl>
                                                <Input type="number" {...field} value={field.value as string | number} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="sector"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Secteur (Info)</FormLabel>
                                            <FormControl>
                                                <Input placeholder="BTP" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
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

                        <div className="flex justify-end pt-4">
                            <Button type="submit" disabled={isPending}>
                                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isEdit ? "Mettre à jour" : "Créer le Client"}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
