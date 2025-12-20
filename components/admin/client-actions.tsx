"use client";

import { useTransition } from "react";
import { ClientForm } from "./client-form";
import { Button } from "@/components/ui/button";
import { Trash2, Pencil } from "lucide-react";
import { deleteClientAction } from "@/app/actions/client";

interface ClientActionsProps {
    client: any; // Using any to avoid complex Prisma type imports on client for now, or define strict type if prefered
}

export function ClientActions({ client }: ClientActionsProps) {
    const [isPending, startTransition] = useTransition();

    const handleDelete = () => {
        if (confirm(`Êtes-vous sûr de vouloir supprimer le client "${client.name}" ?`)) {
            startTransition(async () => {
                await deleteClientAction(client.id);
            });
        }
    };

    return (
        <div className="flex items-center justify-end gap-2">
            {/* Edit Button (Trigger for ClientForm Modal) */}
            <ClientForm initialData={client}>
                <Button variant="ghost" size="icon" title="Modifier">
                    <Pencil className="h-4 w-4 text-blue-500" />
                </Button>
            </ClientForm>

            {/* Delete Button */}
            <Button
                variant="ghost"
                size="icon"
                title="Supprimer"
                onClick={handleDelete}
                disabled={isPending}
            >
                <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
        </div>
    );
}
