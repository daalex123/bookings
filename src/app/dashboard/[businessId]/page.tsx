import Link from "next/link";
import { format, startOfDay, endOfDay, startOfMonth } from "date-fns";
import { Calendar, Package, TrendingUp } from "@/lib/admin-icons";
import { adminDashboardUrl } from "@/lib/admin-url";
import { buildIncomeSummary } from "@/lib/business-income";
import { asJoined, formatPrice } from "@/lib/utils";
import { bookingPublicUrl } from "@/lib/booking";
import { DEFAULT_TIMEZONE } from "@/lib/constants";
import { getSiteUrl } from "@/lib/site-url";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { ShareBookingCard } from "@/components/booking/share-booking-card";
import { createClient } from "@/lib/supabase/server";

const statusStyle: Record<string, string> = {
  pending: "bg-teal-50 text-teal-700",
  confirmed: "bg-emerald-50 text-emerald-700",
  cancelled: "bg-red-50 text-red-600",
  completed: "bg-[#f0f2f5] text-[#8b92a5]",
  no_show: "bg-red-50 text-red-600",
};

export default async function BusinessOverviewPage({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = await params;
  const supabase = await createClient();

  const todayStart = startOfDay(new Date()).toISOString();
  const todayEnd = endOfDay(new Date()).toISOString();
  const monthStart = startOfMonth(new Date()).toISOString();

  const [
    { data: business },
    siteUrl,
    { count: serviceCount },
    { count: todayCount },
    { data: todayAppts },
    { data: incomeAppts },
  ] = await Promise.all([
    supabase
      .from("businesses")
      .select("slug, currency, timezone")
      .eq("id", businessId)
      .single(),
    getSiteUrl(),
    supabase
      .from("services")
      .select("*", { count: "exact", head: true })
      .eq("business_id", businessId)
      .eq("is_active", true),
    supabase
      .from("appointments")
      .select("*", { count: "exact", head: true })
      .eq("business_id", businessId)
      .gte("start_at", todayStart)
      .lte("start_at", todayEnd)
      .not("status", "eq", "cancelled"),
    supabase
      .from("appointments")
      .select(
        `id, start_at, status, services ( name ), profiles ( full_name )`
      )
      .eq("business_id", businessId)
      .gte("start_at", todayStart)
      .lte("start_at", todayEnd)
      .not("status", "eq", "cancelled")
      .order("start_at", { ascending: true }),
    supabase
      .from("appointments")
      .select(
        `start_at, status, services ( price ), appointment_addons ( price )`
      )
      .eq("business_id", businessId)
      .gte("start_at", monthStart)
      .lte("start_at", todayEnd)
      .eq("status", "completed"),
  ]);

  const currency = business?.currency ?? "LKR";
  const timezone = business?.timezone ?? DEFAULT_TIMEZONE;
  const incomeSummary = buildIncomeSummary(incomeAppts ?? [], timezone);
  const shareUrl = business?.slug ? bookingPublicUrl(business.slug, siteUrl) : "";
  const adminAppUrl = adminDashboardUrl(businessId, siteUrl);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Overview"
        description="Today's snapshot for your business"
        action={
          <div className="hidden lg:flex items-center gap-5">
            <div className="rounded-xl bg-white/80 backdrop-blur-sm border border-[var(--admin-border)] px-5 py-3 text-right shadow-sm">
              <p className="text-xl font-black text-[var(--admin-navy)]">
                {formatPrice(incomeSummary.today, currency)}
              </p>
              <p className="text-[11px] font-medium text-[var(--admin-muted)]">Income today</p>
            </div>
            <div className="rounded-xl bg-white/80 backdrop-blur-sm border border-[var(--admin-border)] px-5 py-3 text-right shadow-sm">
              <p className="text-xl font-black text-[var(--admin-navy)]">{todayCount ?? 0}</p>
              <p className="text-[11px] font-medium text-[var(--admin-muted)]">Appointments</p>
            </div>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Income today"
          value={formatPrice(incomeSummary.today, currency)}
          icon={TrendingUp}
          href={`/dashboard/${businessId}/income`}
        />
        <StatCard
          label="Income this month"
          value={formatPrice(incomeSummary.month, currency)}
          icon={TrendingUp}
          href={`/dashboard/${businessId}/income`}
        />
        <StatCard
          label="Appointments today"
          value={todayCount ?? 0}
          icon={Calendar}
          href={`/dashboard/${businessId}/appointments?time=today`}
        />
        <StatCard
          label="Active services"
          value={serviceCount ?? 0}
          icon={Package}
        />
      </div>

      <div className="admin-card overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--admin-border)] px-6 py-5">
          <h2 className="text-lg font-bold text-[var(--admin-navy)]">Today&apos;s schedule</h2>
          <Link
            href={`/dashboard/${businessId}/appointments?time=today`}
            className="text-sm font-medium text-booking-accent hover:underline"
          >
            View all
          </Link>
        </div>
        <div className="divide-y divide-[var(--admin-border)]">
          {todayAppts && todayAppts.length > 0 ? (
            todayAppts.map((appt) => {
              const service = asJoined(appt.services);
              const profile = asJoined(appt.profiles);
              return (
                <Link
                  key={appt.id}
                  href={`/dashboard/${businessId}/appointments?time=today&id=${appt.id}`}
                  className="flex flex-col gap-3 px-6 py-4 transition-colors hover:bg-white/5 sm:flex-row sm:items-center sm:justify-between lg:hover:bg-[var(--admin-accent-bg)]"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-[var(--admin-navy)]">
                      {service?.name}
                    </p>
                    <p className="text-sm text-[var(--admin-muted)]">
                      {profile?.full_name ?? "Customer"} ·{" "}
                      {format(new Date(appt.start_at), "p")}
                    </p>
                  </div>
                  <span
                    className={`w-fit rounded-full px-3 py-1 text-xs font-medium capitalize ${statusStyle[appt.status] ?? "bg-[var(--admin-bg)] text-[var(--admin-muted)]"}`}
                  >
                    {appt.status.replace("_", " ")}
                  </span>
                </Link>
              );
            })
          ) : (
            <p className="px-6 py-10 text-center text-sm text-[var(--admin-muted)]">
              No appointments scheduled for today.
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <ShareBookingCard
          url={adminAppUrl}
          title="Admin mobile app"
          description="Scan to open the business dashboard on a phone."
          downloadFileName="admin-app-qr.png"
          variant="dark"
          compact
        />

        {shareUrl && (
          <ShareBookingCard
            url={shareUrl}
            title="Customer booking page"
            description="Share so customers can book appointments."
            variant="dark"
            compact
          />
        )}
      </div>
    </div>
  );
}
