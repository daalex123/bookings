import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Mail, Calendar, Shield } from "lucide-react";

export default async function AdminUsersPage() {
    const user = await getCurrentUser();
    if (!user) return null;

    const supabase = await createClient();

    // Fetch all users with their profile data
    const { data: profiles } = await supabase
        .from("profiles")
        .select(`
      id,
      full_name,
      phone,
      created_at
    `)
        .order("created_at", { ascending: false });

    // Fetch super admins
    const { data: superAdmins } = await supabase
        .from("super_admins")
        .select("user_id");

    const superAdminIds = new Set(superAdmins?.map((sa) => sa.user_id) ?? []);

    // Fetch business memberships count per user
    const { data: memberships } = await supabase
        .from("business_members")
        .select("user_id");

    const membershipCounts = new Map<string, number>();
    memberships?.forEach((m) => {
        membershipCounts.set(m.user_id, (membershipCounts.get(m.user_id) ?? 0) + 1);
    });

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-zinc-100">
                    All Users
                </h1>
                <p className="mt-2 text-zinc-400">
                    View all registered users on the platform
                </p>
            </div>

            <Card className="border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="text-xl text-zinc-100">
                        User List ({profiles?.length ?? 0})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {profiles && profiles.length > 0 ? (
                            profiles.map((profile) => {
                                const isSuperAdmin = superAdminIds.has(profile.id);
                                const businessCount = membershipCounts.get(profile.id) ?? 0;

                                return (
                                    <div
                                        key={profile.id}
                                        className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950/50 p-4 transition-colors hover:border-zinc-700"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800">
                                                <User className="h-5 w-5 text-zinc-400" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-medium text-zinc-100">
                                                        {profile.full_name || "Unnamed User"}
                                                    </h3>
                                                    {isSuperAdmin && (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400">
                                                            <Shield className="h-3 w-3" />
                                                            Super Admin
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-4 text-sm text-zinc-500">
                                                    {profile.phone && (
                                                        <span className="flex items-center gap-1">
                                                            <Mail className="h-3 w-3" />
                                                            {profile.phone}
                                                        </span>
                                                    )}
                                                    {businessCount > 0 && (
                                                        <span>{businessCount} business{businessCount !== 1 ? "es" : ""}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-sm text-zinc-400">
                                            <div className="flex items-center gap-1">
                                                <Calendar className="h-3 w-3" />
                                                {new Date(profile.created_at).toLocaleDateString()}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <p className="text-center text-sm text-zinc-500 py-8">
                                No users found
                            </p>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
