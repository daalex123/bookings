import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, ExternalLink, Calendar, Users } from "lucide-react";

export default async function AdminBusinessesPage() {
    const user = await getCurrentUser();
    if (!user) return null;

    const supabase = await createClient();

    // Fetch all businesses with member counts and appointment counts
    const { data: businesses } = await supabase
        .from("businesses")
        .select(`
      id,
      name,
      slug,
      created_at,
      business_members(count),
      appointments(count)
    `)
        .order("created_at", { ascending: false });

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-zinc-100">
                        All Businesses
                    </h1>
                    <p className="mt-2 text-zinc-400">
                        Manage all businesses on the platform
                    </p>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {businesses && businesses.length > 0 ? (
                    businesses.map((business) => {
                        const memberCount = Array.isArray(business.business_members)
                            ? business.business_members.length
                            : (business.business_members as any)?.count ?? 0;
                        const appointmentCount = Array.isArray(business.appointments)
                            ? business.appointments.length
                            : (business.appointments as any)?.count ?? 0;

                        return (
                            <Card
                                key={business.id}
                                className="group border-zinc-800 bg-zinc-900/50 backdrop-blur-sm transition-all hover:border-zinc-700 hover:shadow-lg hover:shadow-emerald-500/10"
                            >
                                <CardHeader>
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <CardTitle className="text-lg text-zinc-100">
                                                {business.name}
                                            </CardTitle>
                                            <p className="mt-1 text-sm text-zinc-500">
                                                /{business.slug}
                                            </p>
                                        </div>
                                        <div className="rounded-lg bg-emerald-500/10 p-2">
                                            <Building2 className="h-5 w-5 text-emerald-400" />
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2 text-zinc-400">
                                            <Users className="h-4 w-4" />
                                            <span>{memberCount} staff</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-zinc-400">
                                            <Calendar className="h-4 w-4" />
                                            <span>{appointmentCount} bookings</span>
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <Link href={`/dashboard/${business.id}`} className="flex-1">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="w-full border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
                                            >
                                                <ExternalLink className="mr-2 h-4 w-4" />
                                                View Dashboard
                                            </Button>
                                        </Link>
                                    </div>

                                    <div className="text-xs text-zinc-500">
                                        Created {new Date(business.created_at).toLocaleDateString()}
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })
                ) : (
                    <div className="col-span-full">
                        <Card className="border-zinc-800 bg-zinc-900/50">
                            <CardContent className="flex flex-col items-center justify-center py-12">
                                <Building2 className="h-12 w-12 text-zinc-600" />
                                <p className="mt-4 text-zinc-400">No businesses yet</p>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>
        </div>
    );
}
