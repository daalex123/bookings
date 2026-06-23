import Link from "next/link";
import { Building2, Plus } from "@/lib/admin-icons";
import { createBusiness } from "@/lib/actions";
import { asJoined } from "@/lib/utils";
import { getCurrentUser, isSuperAdmin } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { CreateBusinessForm } from "@/components/dashboard/create-business-form";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const superAdmin = await isSuperAdmin();

  const { data: memberships } = await supabase
    .from("business_members")
    .select("role, businesses ( id, name, slug )")
    .eq("user_id", user.id);

  const memberBusinessIds = new Set(
    (memberships ?? [])
      .map((m) => asJoined(m.businesses)?.id)
      .filter((id): id is string => Boolean(id))
  );

  const { data: allBusinesses } = superAdmin
    ? await supabase
        .from("businesses")
        .select("id, name, slug")
        .order("name")
    : { data: null };

  const otherBusinesses =
    superAdmin && allBusinesses
      ? allBusinesses.filter((biz) => !memberBusinessIds.has(biz.id))
      : [];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Businesses"
        description={
          superAdmin
            ? "Super admin access to all businesses on the platform."
            : "Manage your businesses, services, and appointments from one place."
        }
      />

      {superAdmin && otherBusinesses.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[#8b92a5]">
            All businesses
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {otherBusinesses.map((biz) => (
              <div
                key={biz.id}
                className="admin-card border border-[#1e2235]/10 p-5 transition-shadow hover:shadow-lg"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#1e2235] text-white">
                    <Building2 className="h-5 w-5" strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-[#1e2235]">
                      {biz.name}
                    </p>
                    <p className="text-sm text-[#8b92a5]">Super admin access</p>
                  </div>
                </div>
                <Link href={`/dashboard/${biz.id}`} className="mt-4 block">
                  <Button className="w-full rounded-full">Open dashboard</Button>
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {memberships && memberships.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[#8b92a5]">
            Your businesses
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {memberships.map((m) => {
              const biz = asJoined(m.businesses);
              if (!biz) return null;
              return (
                <div key={biz.id} className="admin-card p-5 transition-shadow hover:shadow-lg">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f0f2f5] text-[#1e2235]">
                      <Building2 className="h-5 w-5" strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-[#1e2235]">
                        {biz.name}
                      </p>
                      <p className="text-sm capitalize text-[#8b92a5]">{m.role}</p>
                    </div>
                  </div>
                  <Link href={`/dashboard/${biz.id}`} className="mt-4 block">
                    <Button className="w-full rounded-full">Open dashboard</Button>
                  </Link>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Plus className="h-5 w-5 text-[#8b92a5]" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[#8b92a5]">
            Create a business
          </h2>
        </div>
        <div className="admin-card max-w-2xl p-6">
          <h3 className="text-lg font-bold text-[#1e2235]">New business</h3>
          <p className="mt-1 text-sm text-[#8b92a5]">
            Set up your business to start accepting appointments
          </p>
          <CreateBusinessForm action={createBusiness} />
        </div>
      </section>
    </div>
  );
}
