import { AdminNav } from "@/components/admin/admin-nav";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-slate-50">
            <AdminNav />
            <main className="max-w-7xl mx-auto">
                {children}
            </main>
        </div>
    );
}
