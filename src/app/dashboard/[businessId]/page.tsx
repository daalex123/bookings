import { format, startOfDay, endOfDay } from "date-fns";
import { Calendar, Package } from "@/lib/admin-icons";
import { adminDashboardUrl } from "@/lib/admin-url";
import { asJoined } from "@/lib/utils";
import { bookingPublicUrl } from "@/lib/booking";
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

  const [{ data: business }, siteUrl] = await Promise.all([
    supabase
      .from("businesses")
      .select("slug")
      .eq("id", businessId)
      .single(),
    getSiteUrl(),
  ]);

  const shareUrl = business?.slug ? bookingPublicUrl(business.slug, siteUrl) : "";
  const adminAppUrl = adminDashboardUrl(businessId, siteUrl);

  const todayStart = startOfDay(new Date()).toISOString();
  const todayEnd = endOfDay(new Date()).toISOString();

  const [{ count: serviceCount }, { count: todayCount }, { data: todayAppts }] =
    await Promise.all([
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
        .order("created_at", { ascending: false }),
    ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Overview"
        description="Today's snapshot for your business"
        action={
          <div className="flex gap-6 text-right">
            <div>
              <p className="text-2xl font-bold text-[#1e2235]">{todayCount ?? 0}</p>
              <p className="text-xs text-[#8b92a5]">Today</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-[#1e2235]">{serviceCount ?? 0}</p>
              <p className="text-xs text-[#8b92a5]">Services</p>
            </div>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          label="Appointments today"
          value={todayCount ?? 0}
          icon={Calendar}
        />
        <StatCard
          label="Active services"
          value={serviceCount ?? 0}
          icon={Package}
        />
      </div>

      <ShareBookingCard
        url={adminAppUrl}
        title="Admin mobile app"
        description="Staff can scan this QR code to open the full business dashboard on their phone. Sign in once, then add to home screen for app-like access."
        downloadFileName="admin-app-qr.png"
        variant="dark"
      />

      {shareUrl && (
        <ShareBookingCard
          url={shareUrl}
          title="Share your booking page"
          description="Customers can scan this QR code to book appointments at your business."
          variant="dark"
        />
      )}

      <div className="admin-card overflow-hidden">
        <div className="border-b border-[#1e2235]/8 px-6 py-5">
          <h2 className="text-lg font-bold text-[#1e2235]">Today&apos;s schedule</h2>
        </div>
        <div className="divide-y divide-[#1e2235]/6">
          {todayAppts && todayAppts.length > 0 ? (
            todayAppts.map((appt) => {
              const service = asJoined(appt.services);
              const profile = asJoined(appt.profiles);
              return (
                <div
                  key={appt.id}
                  className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-[#1e2235]">
                      {service?.name}
                    </p>
                    <p className="text-sm text-[#8b92a5]">
                      {profile?.full_name ?? "Customer"} ·{" "}
                      {format(new Date(appt.start_at), "p")}
                    </p>
                  </div>
                  <span
                    className={`w-fit rounded-full px-3 py-1 text-xs font-medium capitalize ${statusStyle[appt.status] ?? "bg-[#f0f2f5] text-[#8b92a5]"}`}
                  >
                    {appt.status.replace("_", " ")}
                  </span>
                </div>
              );
            })
          ) : (
            <p className="px-6 py-10 text-center text-sm text-[#8b92a5]">
              No appointments scheduled for today.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
