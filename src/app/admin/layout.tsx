import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, isSuperAdmin } from "@/lib/supabase/auth";
import { Shield, Building2, Users, Settings, LayoutDashboard } from "lucide-react";

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const user = await getCurrentUser();

    if (!user) {
        redirect("/login?redirect=/admin");
    }

    const superAdmin = await isSuperAdmin();

    if (!superAdmin) {
        redirect("/dashboard");
    }

    const navigation = [
        { name: "Overview", href: "/admin", icon: LayoutDashboard },
        { name: "Businesses", href: "/admin/businesses", icon: Building2 },
        { name: "Users", href: "/admin/users", icon: Users },
        { name: "Settings", href: "/admin/settings", icon: Settings },
    ];

    return (
        <div className="flex min-h-screen bg-zinc-950">
            {/* Sidebar */}
            <aside className="w-64 border-r border-zinc-800 bg-zinc-900/50">
                <div className="flex h-16 items-center gap-2 border-b border-zinc-800 px-6">
                    <Shield className="h-6 w-6 text-emerald-400" />
                    <span className="text-lg font-bold text-zinc-100">Admin Panel</span>
                </div>

                <nav className="space-y-1 p-4">
                    {navigation.map((item) => (
                        <Link
                            key={item.name}
                            href={item.href}
                            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
                        >
                            <item.icon className="h-5 w-5" />
                            {item.name}
                        </Link>
                    ))}
                </nav>

                <div className="absolute bottom-4 left-4 right-4">
                    <Link
                        href="/dashboard"
                        className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
                    >
                        <LayoutDashboard className="h-4 w-4" />
                        <span>Business Dashboard</span>
                    </Link>
                </div>
            </aside>

            {/* Main content */}
            <main className="flex-1 overflow-y-auto">
                <div className="mx-auto max-w-7xl p-6 sm:p-8">
                    {children}
                </div>
            </main>
        </div>
    );
}
