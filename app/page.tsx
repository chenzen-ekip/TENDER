import { db } from "@/lib/db";
import { ClientForm } from "@/components/admin/client-form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function Home() {
  const clients = await db.client.findMany({
    where: { active: true },
    include: {
      searchConfig: true,
      sniperRules: true,
      keywords: true,
      departments: true,
      _count: {
        select: { opportunities: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Clients & Configuration</h1>
        <ClientForm />
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Secteur</TableHead>
              <TableHead>Ciblage</TableHead>
              <TableHead>Règles IA</TableHead>
              <TableHead>Opportunités</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                  Aucun client configuré.
                </TableCell>
              </TableRow>
            ) : (
              clients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell className="font-medium">
                    {client.name}
                    <div className="text-xs text-muted-foreground">{client.whatsapp_phone}</div>
                  </TableCell>
                  <TableCell>{client.sector}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-2 max-w-[300px]">
                      <div className="flex flex-wrap gap-1">
                        {client.keywords.slice(0, 3).map((k: any) => (
                          <Badge key={k.id} variant="outline" className="text-[10px] px-1 py-0">{k.word}</Badge>
                        ))}
                        {client.keywords.length > 3 && <span className="text-[10px] text-muted-foreground">+{client.keywords.length - 3}</span>}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {client.departments.slice(0, 5).map((d: any) => (
                          <Badge key={d.id} variant="secondary" className="text-[10px] px-1 py-0">{d.code}</Badge>
                        ))}
                        {client.departments.length === 0 && <span className="text-[10px] text-muted-foreground">National</span>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {client.sniperRules ? (
                      <div className="text-xs">
                        {client.sniperRules.forbiddenKeywords && (
                          <div className="text-red-500">No: {client.sniperRules.forbiddenKeywords}</div>
                        )}
                        <div>Min Profit: {client.sniperRules.minProfitability}%</div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{client._count.opportunities}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {/* Add Edit/Delete buttons here later */}
                    <Button variant="ghost" size="sm">Gérer</Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
