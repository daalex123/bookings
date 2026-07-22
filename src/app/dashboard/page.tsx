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

  return (
    <div className="space-y-8">
      <PageHeader
        title="Businesses"
        description="Manage your businesses, services, and appointments from one place."
      />

      {superAdmin && (
        <div className="rounded-lg border border-emerald-800/50 bg-emerald-500/10 p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-emerald-500/20 p-2">
              <Building2 className="h-5 w-5 text-emerald-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-emerald-300">
                Super Admin Access
              </h3>
              <p className="mt-1 text-sm text-emerald-400/80">
                You have platform administrator privileges.{" "}
                <Link
                  href="/admin"
                  className="font-medium underline underline-offset-2 hover:text-emerald-300"
                >
                  Go to Admin Panel →
                </Link>
              </p>
            </div>
          </div>
        </div>
      )}

      {memberships && memberships.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--admin-muted)]">
            Your businesses
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {memberships.map((m) => {
              const biz = asJoined(m.businesses);
              if (!biz) return null;
              return (
                <div key={biz.id} className="admin-card p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--admin-accent-bg)] text-[var(--admin-accent)]">
                      <Building2 className="h-5 w-5" strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-[var(--admin-navy)]">
                        {biz.name}
                      </p>
                      <p className="text-sm capitalize text-[var(--admin-muted)]">{m.role}</p>
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
          <Plus className="h-5 w-5 text-[var(--admin-muted)]" />
          <h2 className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--admin-muted)]">
            Create a business
          </h2>
        </div>
        <div className="admin-card max-w-2xl p-6">
          <h3 className="text-lg font-bold text-[var(--admin-navy)]">New business</h3>
          <p className="mt-1 text-sm text-[var(--admin-muted)]">
            Set up your business to start accepting appointments
          </p>
          <CreateBusinessForm action={createBusiness} />
        </div>
      </section>
    </div>
  );
}
