import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/auth";
import { deleteBusinessAsSuperAdmin } from "@/lib/actions";
import { DeleteBusinessButton } from "@/components/dashboard/delete-business-button";
import { Building2, ExternalLink, Calendar, Users } from "lucide-react";

export default async function AdminBusinessesPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();

  async function deleteBusiness(formData: FormData) {
    "use server";
    return deleteBusinessAsSuperAdmin(formData);
  }

  const { data: businesses } = await supabase
    .from("businesses")
    .select(
      `
      id,
      name,
      slug,
      created_at,
      logo_url,
      business_members(count),
      appointments(count)
    `
    )
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-100">
          All Businesses
        </h1>
        <p className="mt-2 text-zinc-400">
          Manage all businesses on the platform
        </p>
      </div>

      {!businesses || businesses.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900/40 py-16">
          <Building2 className="h-12 w-12 text-zinc-600" />
          <p className="mt-4 text-zinc-400">No businesses yet</p>
        </div>
      ) : (
        <ul className="divide-y divide-zinc-800 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40">
          {businesses.map((business) => {
            const memberCount = Array.isArray(business.business_members)
              ? business.business_members.length
              : ((business.business_members as { count?: number } | null)
                  ?.count ?? 0);
            const appointmentCount = Array.isArray(business.appointments)
              ? business.appointments.length
              : ((business.appointments as { count?: number } | null)?.count ??
                0);

            return (
              <li
                key={business.id}
                className="flex flex-col gap-4 p-4 transition-colors hover:bg-zinc-900/80 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-5 sm:py-4"
              >
                <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-emerald-500/10 text-emerald-400">
                    {business.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={business.logo_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Building2 className="h-5 w-5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <h2 className="truncate text-base font-semibold text-zinc-100">
                        {business.name}
                      </h2>
                      <span className="truncate text-sm text-zinc-500">
                        /{business.slug}
                      </span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500">
                      <span className="inline-flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5" />
                        {memberCount} staff
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        {appointmentCount} bookings
                      </span>
                      <span>
                        Created{" "}
                        {new Date(business.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2 sm:justify-end">
                  <Link
                    href={`/dashboard/${business.id}`}
                    className="inline-flex h-9 items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm font-medium text-zinc-200 transition-colors hover:border-zinc-600 hover:bg-zinc-900 hover:text-white"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Dashboard
                  </Link>
                  <div className="w-[7.5rem]">
                    <DeleteBusinessButton
                      action={deleteBusiness}
                      businessId={business.id}
                      businessName={business.name}
                    />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
