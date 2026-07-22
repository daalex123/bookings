import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, Calendar, TrendingUp } from "lucide-react";

export default async function AdminPage() {
    const user = await getCurrentUser();
    if (!user) return null;

    const supabase = await createClient();

    // Fetch platform-wide statistics
    const [businessesCount, usersCount, appointmentsCount] = await Promise.all([
        supabase
            .from("businesses")
            .select("*", { count: "exact", head: true }),
        supabase
            .from("profiles")
            .select("*", { count: "exact", head: true }),
        supabase
            .from("appointments")
            .select("*", { count: "exact", head: true }),
    ]);

    const stats = [
        {
            name: "Total Businesses",
            value: businessesCount.count ?? 0,
            icon: Building2,
            color: "text-blue-400",
            bgColor: "bg-blue-500/10",
        },
        {
            name: "Total Users",
            value: usersCount.count ?? 0,
            icon: Users,
            color: "text-purple-400",
            bgColor: "bg-purple-500/10",
        },
        {
            name: "Total Appointments",
            value: appointmentsCount.count ?? 0,
            icon: Calendar,
            color: "text-emerald-400",
            bgColor: "bg-emerald-500/10",
        },
    ];

    // Fetch recent businesses
    const { data: recentBusinesses } = await supabase
        .from("businesses")
        .select("id, name, slug, created_at")
        .order("created_at", { ascending: false })
        .limit(5);

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-zinc-100">
                    Platform Overview
                </h1>
                <p className="mt-2 text-zinc-400">
                    Welcome to the super admin dashboard. Manage all businesses and users.
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {stats.map((stat) => (
                    <Card
                        key={stat.name}
                        className="border-zinc-800 bg-zinc-900/50 backdrop-blur-sm"
                    >
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-zinc-400">
                                {stat.name}
                            </CardTitle>
                            <div className={`rounded-lg p-2 ${stat.bgColor}`}>
                                <stat.icon className={`h-5 w-5 ${stat.color}`} />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-zinc-100">
                                {stat.value.toLocaleString()}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Recent Businesses */}
            <Card className="border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="text-xl text-zinc-100">
                        Recently Created Businesses
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {recentBusinesses && recentBusinesses.length > 0 ? (
                            recentBusinesses.map((business) => (
                                <div
                                    key={business.id}
                                    className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950/50 p-4"
                                >
                                    <div>
                                        <h3 className="font-medium text-zinc-100">
                                            {business.name}
                                        </h3>
                                        <p className="text-sm text-zinc-500">/{business.slug}</p>
                                    </div>
                                    <div className="text-sm text-zinc-400">
                                        {new Date(business.created_at).toLocaleDateString()}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-zinc-500">No businesses yet</p>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
