import Link from "next/link";
import { format, endOfDay, startOfDay, startOfMonth, startOfWeek, subDays } from "date-fns";
import { Calendar, Clock, Package, TrendingUp, Users } from "@/lib/admin-icons";
import { adminDashboardUrl } from "@/lib/admin-url";
import { bookingPublicUrl } from "@/lib/booking";
import { buildIncomeSummary } from "@/lib/business-income";
import { DEFAULT_TIMEZONE } from "@/lib/constants";
import { getSiteUrl } from "@/lib/site-url";
import { createClient } from "@/lib/supabase/server";
import { asJoined, formatPrice, utcToLocalParts } from "@/lib/utils";
import { ShareBookingCard } from "@/components/booking/share-booking-card";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";

const statusStyle: Record<string, string> = {
    pending: "bg-amber-500/25 text-amber-300 font-semibold",
    confirmed: "bg-emerald-500/25 text-emerald-300 font-semibold",
    cancelled: "bg-red-500/25 text-red-300 font-semibold",
    completed: "bg-white/10 text-(--admin-muted) font-semibold",
    no_show: "bg-red-500/25 text-red-300 font-semibold",
};

type ServiceRow = { id?: string; name?: string; price?: number } | null;

type AppointmentRow = {
    id: string;
    customer_id?: string | null;
    start_at: string;
    status: string;
    services: ServiceRow | ServiceRow[];
    profiles?: { full_name: string | null } | { full_name: string | null }[] | null;
    appointment_addons?: { price: number | null }[] | { price: number | null } | null;
};

export default async function BusinessOverviewPage({
    params,
}: {
    params: Promise<{ businessId: string }>;
}) {
    const { businessId } = await params;
    const supabase = await createClient();

    const now = new Date();
    const nowIso = now.toISOString();
    const todayStart = startOfDay(now).toISOString();
    const todayEnd = endOfDay(now).toISOString();
    const monthStart = startOfMonth(now).toISOString();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 }).toISOString();
    const previousWeekStart = startOfWeek(subDays(now, 7), {
        weekStartsOn: 1,
    }).toISOString();
    const previousWeekEnd = subDays(startOfWeek(now, { weekStartsOn: 1 }), 1).toISOString();

    const [
        { data: business },
        siteUrl,
        { count: serviceCount },
        { count: todayCount },
        { data: todayAppts },
        { data: upcomingAppts },
        { data: incomeAppts },
        { data: monthAppts },
    ] = await Promise.all([
        supabase
            .from("businesses")
            .select("name, slug, currency, timezone")
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
            .lte("start_at", todayEnd),
        supabase
            .from("appointments")
            .select(
                "id, start_at, status, services ( name ), profiles ( full_name )"
            )
            .eq("business_id", businessId)
            .gte("start_at", todayStart)
            .lte("start_at", todayEnd)
            .order("start_at", { ascending: true }),
        supabase
            .from("appointments")
            .select(
                "id, start_at, status, services ( name ), profiles ( full_name )"
            )
            .eq("business_id", businessId)
            .gte("start_at", nowIso)
            .in("status", ["pending", "confirmed"])
            .order("start_at", { ascending: true })
            .limit(5),
        supabase
            .from("appointments")
            .select("start_at, status, services ( price ), appointment_addons ( price )")
            .eq("business_id", businessId)
            .gte("start_at", monthStart)
            .lte("start_at", todayEnd)
            .eq("status", "completed"),
        supabase
            .from("appointments")
            .select(
                "id, customer_id, start_at, status, services ( id, name, price ), appointment_addons ( price )"
            )
            .eq("business_id", businessId)
            .gte("start_at", monthStart)
            .lte("start_at", todayEnd),
    ]);

    const currency = business?.currency ?? "LKR";
    const timezone = business?.timezone ?? DEFAULT_TIMEZONE;
    const incomeSummary = buildIncomeSummary(incomeAppts ?? [], timezone);
    const shareUrl = business?.slug ? bookingPublicUrl(business.slug, siteUrl) : "";
    const adminAppUrl = adminDashboardUrl(businessId, siteUrl);

    const scheduleRows = (todayAppts ?? []) as AppointmentRow[];
    const upcomingRows = (upcomingAppts ?? []) as AppointmentRow[];
    const monthRows = (monthAppts ?? []) as AppointmentRow[];

    const todayStatusCounts = scheduleRows.reduce(
        (acc, row) => {
            acc.total += 1;
            if (row.status === "pending") acc.pending += 1;
            if (row.status === "confirmed") acc.confirmed += 1;
            if (row.status === "completed") acc.completed += 1;
            if (row.status === "cancelled") acc.cancelled += 1;
            return acc;
        },
        { total: 0, pending: 0, confirmed: 0, completed: 0, cancelled: 0 }
    );

    const thisWeekRows = monthRows.filter((row) => row.start_at >= weekStart);
    const previousWeekRows = monthRows.filter(
        (row) => row.start_at >= previousWeekStart && row.start_at <= previousWeekEnd
    );

    const thisWeekCompleted = thisWeekRows.filter(
        (row) => row.status === "completed"
    ).length;
    const previousWeekCompleted = previousWeekRows.filter(
        (row) => row.status === "completed"
    ).length;
    const weeklyDelta = thisWeekCompleted - previousWeekCompleted;

    const uniqueCustomers = new Set(
        monthRows
            .map((row) => row.customer_id)
            .filter((value): value is string => Boolean(value))
    );

    const servicePerformance = new Map<
        string,
        { name: string; revenue: number; count: number }
    >();

    for (const row of monthRows) {
        if (row.status !== "completed") continue;
        const service = asJoined(row.services as ServiceRow | ServiceRow[]);
        if (!service?.id) continue;

        const addonRows = Array.isArray(row.appointment_addons)
            ? row.appointment_addons
            : row.appointment_addons
                ? [row.appointment_addons]
                : [];

        const revenue =
            Number(service.price ?? 0) +
            addonRows.reduce((sum, addon) => sum + Number(addon.price ?? 0), 0);

        const existing = servicePerformance.get(service.id);
        if (existing) {
            existing.count += 1;
            existing.revenue += revenue;
        } else {
            servicePerformance.set(service.id, {
                name: service.name ?? "Service",
                revenue,
                count: 1,
            });
        }
    }

    const topServices = [...servicePerformance.values()]
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 4);

    const completionRate =
        monthRows.length > 0
            ? Math.round(
                (monthRows.filter((row) => row.status === "completed").length /
                    monthRows.length) *
                100
            )
            : 0;

    const cancellationRate =
        monthRows.length > 0
            ? Math.round(
                (monthRows.filter((row) => row.status === "cancelled").length /
                    monthRows.length) *
                100
            )
            : 0;

    return (
        <div className="space-y-6">
            <PageHeader
                title="Overview"
                description="Operational intelligence for bookings, revenue, and service performance"
                action={
                    <div className="hidden items-center gap-4 lg:flex">
                        <div className="rounded-xl border border-(--admin-border) bg-(--admin-elevated) px-5 py-3 text-right">
                            <p className="text-xl font-black text-(--admin-accent)">
                                {formatPrice(incomeSummary.today, currency)}
                            </p>
                            <p className="text-[11px] font-medium text-(--admin-muted)">Income today</p>
                        </div>
                        <div className="rounded-xl border border-(--admin-border) bg-(--admin-elevated) px-5 py-3 text-right">
                            <p className="text-xl font-black text-(--admin-accent)">{todayCount ?? 0}</p>
                            <p className="text-[11px] font-medium text-(--admin-muted)">Appointments</p>
                        </div>
                        <div className="rounded-xl border border-(--admin-border) bg-(--admin-elevated) px-5 py-3 text-right">
                            <p className="text-xl font-black text-(--admin-accent)">
                                {weeklyDelta >= 0 ? `+${weeklyDelta}` : weeklyDelta}
                            </p>
                            <p className="text-[11px] font-medium text-(--admin-muted)">Weekly completion trend</p>
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
                    href={`/dashboard/${businessId}/services`}
                />
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
                <StatCard
                    label="Customers this month"
                    value={uniqueCustomers.size}
                    icon={Users}
                    href={`/dashboard/${businessId}/customers`}
                />
                <StatCard
                    label="Completion rate"
                    value={`${completionRate}%`}
                    icon={Clock}
                    href={`/dashboard/${businessId}/appointments`}
                />
                <StatCard
                    label="Cancellation rate"
                    value={`${cancellationRate}%`}
                    icon={TrendingUp}
                    href={`/dashboard/${businessId}/appointments`}
                />
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
                <div className="admin-card p-5 lg:col-span-2">
                    <div className="flex items-center justify-between gap-2">
                        <h2 className="text-base font-bold text-(--admin-navy)">Today status snapshot</h2>
                        <p className="text-xs text-(--admin-muted)">{format(now, "EEE, MMM d")}</p>
                    </div>
                    <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                        {[
                            { key: "pending", label: "Pending", value: todayStatusCounts.pending },
                            { key: "confirmed", label: "Confirmed", value: todayStatusCounts.confirmed },
                            { key: "completed", label: "Completed", value: todayStatusCounts.completed },
                            { key: "cancelled", label: "Cancelled", value: todayStatusCounts.cancelled },
                        ].map((item) => (
                            <div
                                key={item.key}
                                className="rounded-xl border border-(--admin-border) bg-(--admin-elevated) px-3 py-3"
                            >
                                <p className="text-[11px] font-bold uppercase tracking-wider text-(--admin-muted)">{item.label}</p>
                                <p className="mt-1 text-2xl font-black tracking-tight text-(--admin-navy)">{item.value}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="admin-card p-5">
                    <h2 className="text-base font-bold text-(--admin-navy)">Quick actions</h2>
                    <div className="mt-4 space-y-2">
                        {[
                            {
                                label: "Open today appointments",
                                href: `/dashboard/${businessId}/appointments?time=today`,
                            },
                            { label: "Add or edit services", href: `/dashboard/${businessId}/services` },
                            {
                                label: "Check customer history",
                                href: `/dashboard/${businessId}/customers`,
                            },
                            { label: "View full reporting", href: `/dashboard/${businessId}/income` },
                        ].map((action) => (
                            <Link
                                key={action.href}
                                href={action.href}
                                className="flex items-center justify-between rounded-xl border border-(--admin-border) bg-(--admin-elevated) px-3 py-2.5 text-sm font-medium text-(--admin-navy) transition hover:border-(--admin-accent)"
                            >
                                {action.label}
                                <span className="text-(--admin-accent)">→</span>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
                <div className="admin-card overflow-hidden lg:col-span-2">
                    <div className="flex items-center justify-between gap-3 border-b border-(--admin-border) px-6 py-5">
                        <h2 className="text-lg font-bold text-(--admin-navy)">Today&apos;s schedule</h2>
                        <Link
                            href={`/dashboard/${businessId}/appointments?time=today`}
                            className="text-sm font-medium text-(--admin-accent) hover:underline"
                        >
                            View all
                        </Link>
                    </div>
                    <div className="divide-y divide-(--admin-border)">
                        {scheduleRows.length > 0 ? (
                            scheduleRows.map((appt) => {
                                const service = asJoined(appt.services as ServiceRow | ServiceRow[]);
                                const profile = asJoined(appt.profiles);
                                const local = utcToLocalParts(appt.start_at, timezone);

                                return (
                                    <Link
                                        key={appt.id}
                                        href={`/dashboard/${businessId}/appointments?time=today&id=${appt.id}`}
                                        className="flex flex-col gap-3 px-6 py-4 transition-colors hover:bg-(--admin-elevated) sm:flex-row sm:items-center sm:justify-between"
                                    >
                                        <div className="min-w-0">
                                            <p className="font-semibold text-(--admin-navy)">{service?.name}</p>
                                            <p className="text-sm text-(--admin-muted)">
                                                {profile?.full_name ?? "Customer"} · {local.time}
                                            </p>
                                        </div>
                                        <span
                                            className={`w-fit rounded-full px-3 py-1 text-xs font-medium capitalize ${statusStyle[appt.status] ?? "bg-(--admin-bg) text-(--admin-muted)"
                                                }`}
                                        >
                                            {appt.status.replace("_", " ")}
                                        </span>
                                    </Link>
                                );
                            })
                        ) : (
                            <p className="px-6 py-10 text-center text-sm text-(--admin-muted)">
                                No appointments scheduled for today.
                            </p>
                        )}
                    </div>
                </div>

                <div className="admin-card overflow-hidden">
                    <div className="border-b border-(--admin-border) px-5 py-4">
                        <h2 className="text-base font-bold text-(--admin-navy)">Up next</h2>
                        <p className="text-xs text-(--admin-muted)">Next confirmed/pending bookings</p>
                    </div>
                    <div className="divide-y divide-(--admin-border)">
                        {upcomingRows.length > 0 ? (
                            upcomingRows.map((appt) => {
                                const service = asJoined(appt.services as ServiceRow | ServiceRow[]);
                                const profile = asJoined(appt.profiles);
                                const local = utcToLocalParts(appt.start_at, timezone);

                                return (
                                    <Link
                                        key={appt.id}
                                        href={`/dashboard/${businessId}/appointments?id=${appt.id}`}
                                        className="block px-5 py-3 transition hover:bg-(--admin-elevated)"
                                    >
                                        <p className="truncate text-sm font-semibold text-(--admin-navy)">{service?.name}</p>
                                        <p className="mt-0.5 text-xs text-(--admin-muted)">
                                            {profile?.full_name ?? "Customer"}
                                        </p>
                                        <p className="mt-1 text-xs font-medium text-(--admin-accent)">
                                            {local.date} · {local.time}
                                        </p>
                                    </Link>
                                );
                            })
                        ) : (
                            <p className="px-5 py-8 text-center text-sm text-(--admin-muted)">
                                No upcoming appointments.
                            </p>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
                <div className="admin-card overflow-hidden lg:col-span-2">
                    <div className="flex items-center justify-between border-b border-(--admin-border) px-6 py-5">
                        <h2 className="text-lg font-bold text-(--admin-navy)">Top services this month</h2>
                        <Link
                            href={`/dashboard/${businessId}/income`}
                            className="text-sm font-medium text-(--admin-accent) hover:underline"
                        >
                            Reporting
                        </Link>
                    </div>
                    <div className="divide-y divide-(--admin-border)">
                        {topServices.length > 0 ? (
                            topServices.map((service, index) => (
                                <div
                                    key={`${service.name}-${index}`}
                                    className="flex items-center justify-between px-6 py-4"
                                >
                                    <div>
                                        <p className="font-semibold text-(--admin-navy)">{service.name}</p>
                                        <p className="text-xs text-(--admin-muted)">{service.count} completed bookings</p>
                                    </div>
                                    <p className="text-sm font-bold text-(--admin-accent)">
                                        {formatPrice(service.revenue, currency)}
                                    </p>
                                </div>
                            ))
                        ) : (
                            <p className="px-6 py-10 text-center text-sm text-(--admin-muted)">
                                No completed services yet this month.
                            </p>
                        )}
                    </div>
                </div>

                <div className="admin-card p-5">
                    <h2 className="text-base font-bold text-(--admin-navy)">Business pulse</h2>
                    <div className="mt-4 space-y-3">
                        <div className="rounded-xl border border-(--admin-border) bg-(--admin-elevated) px-3 py-3">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-(--admin-muted)">Weekly completed</p>
                            <p className="mt-1 text-2xl font-black text-(--admin-navy)">{thisWeekCompleted}</p>
                            <p className="text-xs text-(--admin-muted)">
                                {weeklyDelta >= 0 ? `+${weeklyDelta}` : weeklyDelta} vs last week
                            </p>
                        </div>
                        <div className="rounded-xl border border-(--admin-border) bg-(--admin-elevated) px-3 py-3">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-(--admin-muted)">Month-to-date revenue</p>
                            <p className="mt-1 text-2xl font-black text-(--admin-navy)">
                                {formatPrice(incomeSummary.month, currency)}
                            </p>
                            <p className="text-xs text-(--admin-muted)">{business?.name ?? "Business"}</p>
                        </div>
                    </div>
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
