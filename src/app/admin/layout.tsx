import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, isSuperAdmin } from "@/lib/supabase/auth";
import { AdminThemeToggle } from "@/components/dashboard/admin-theme-toggle";
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
        <div id="admin-app-shell" className="admin-app-shell admin-theme booking-theme flex min-h-screen">
            {/* Sidebar */}
            <aside className="w-64 border-r border-(--admin-border) bg-(--admin-surface)">
                <div className="flex h-16 items-center gap-2 border-b border-(--admin-border) px-6">
                    <Shield className="h-6 w-6 text-emerald-400" />
                    <span className="text-lg font-bold text-(--admin-navy)">Admin Panel</span>
                </div>

                <nav className="space-y-1 p-4">
                    {navigation.map((item) => (
                        <Link
                            key={item.name}
                            href={item.href}
                            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-(--admin-muted) transition-colors hover:bg-(--admin-elevated) hover:text-(--admin-navy)"
                        >
                            <item.icon className="h-5 w-5" />
                            {item.name}
                        </Link>
                    ))}
                </nav>

                <div className="absolute bottom-4 left-4 right-4">
                    <div className="mb-2 flex justify-center">
                        <AdminThemeToggle compact />
                    </div>
                    <Link
                        href="/dashboard"
                        className="flex items-center gap-2 rounded-lg border border-(--admin-border) bg-(--admin-elevated) px-3 py-2 text-sm text-(--admin-muted) hover:bg-(--admin-surface) hover:text-(--admin-navy)"
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
