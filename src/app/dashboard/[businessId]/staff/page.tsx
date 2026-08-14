import { PageHeader } from "@/components/dashboard/page-header";
import { createClient } from "@/lib/supabase/server";
import { StaffList } from "@/components/dashboard/staff-list";

export default async function StaffPage({
    params,
}: {
    params: Promise<{ businessId: string }>;
}) {
    const { businessId } = await params;
    const supabase = await createClient();

    const [membersResult, servicesResult, staffServicesResult] = await Promise.all([
        supabase
            .from("business_members")
            .select(
                `id, role, created_at, staff_name, staff_phone, avatar_url,
         profiles ( id, full_name, phone, avatar_url )`
            )
            .eq("business_id", businessId)
            .order("created_at", { ascending: true }),
        supabase
            .from("services")
            .select("id, name")
            .eq("business_id", businessId)
            .eq("is_active", true)
            .order("name"),
        supabase
            .from("staff_services")
            .select("member_id, service_id"),
    ]);

    const members = membersResult.data ?? [];
    const services = servicesResult.data ?? [];

    // Build a map of member_id -> service_id[]
    const memberIds = new Set(members.map((m) => m.id));
    const staffServicesMap: Record<string, string[]> = {};
    (staffServicesResult.data ?? []).forEach((ss) => {
        if (!memberIds.has(ss.member_id)) return;
        if (!staffServicesMap[ss.member_id]) staffServicesMap[ss.member_id] = [];
        staffServicesMap[ss.member_id].push(ss.service_id);
    });

    return (
        <div className="space-y-6">
            <PageHeader
                title="Staff"
                description="Manage your team members and assign them to services"
            />
            <StaffList
                businessId={businessId}
                members={members}
                services={services}
                staffServicesMap={staffServicesMap}
            />
        </div>
    );
}
