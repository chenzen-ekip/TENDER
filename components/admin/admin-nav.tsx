import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, Inbox, Briefcase } from "lucide-react";

export function AdminNav() {
    const pathname = usePathname();

    const links = [
        { href: "/admin/clients", label: "Clients", icon: Users },
        { href: "/admin/pending-requests", label: "Demandes DCE", icon: Inbox },
    ];

    return (
        <nav className="bg-white border-b border-slate-200 sticky top-0 z-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link href="/admin/clients" className="flex items-center gap-2">
                        <Briefcase className="h-6 w-6 text-indigo-600" />
                        <span className="font-bold text-xl tracking-tight text-slate-900">
                            TENDER <span className="text-indigo-600">ADMIN</span>
                        </span>
                    </Link>

                    {/* Navigation Links */}
                    <div className="flex items-center gap-1">
                        {links.map((link) => {
                            const Icon = link.icon;
                            const isActive = pathname === link.href;

                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className={`
                                        flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors
                                        ${isActive
                                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                        }
                                    `}
                                >
                                    <Icon className="h-4 w-4" />
                                    {link.label}
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </div>
        </nav>
    );
}
