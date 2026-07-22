import Link from "next/link";
import { format } from "date-fns";
import { Suspense } from "react";
import type { IncomeReport } from "@/lib/business-income";
import { IncomeChart } from "@/components/dashboard/income-chart";
import { IncomePeriodTabs } from "@/components/dashboard/income-period-tabs";
import {
  DonutChart,
  HorizontalBarChart,
} from "@/components/dashboard/reporting-charts";
import type { IncomePeriodDays } from "@/lib/business-income";
import { formatPrice } from "@/lib/utils";
import { cn } from "@/lib/utils";

const statusStyle: Record<string, string> = {
  pending: "bg-teal-50 text-teal-700",
  confirmed: "bg-emerald-50 text-emerald-700",
  completed: "bg-[#f0f2f5] text-[#8b92a5]",
};

const exportPillClass =
  "rounded-full border border-white/15 bg-zinc-900/60 px-3 py-1.5 text-xs font-semibold text-zinc-200 transition-colors hover:border-amber-300/55 hover:bg-amber-400/20 hover:text-amber-100";

const POSITIVE_WHEN_UP = new Set([
  "Revenue",
  "Profit",
  "Fill rate",
  "Repeat customer rate",
  "Add-on attach rate",
]);

function getAlertTone(alert: {
  metric: string;
  direction: "up" | "down";
  isBaselineEstimated: boolean;
}): "positive" | "negative" | "neutral" {
  if (alert.isBaselineEstimated) return "neutral";

  const upIsPositive = POSITIVE_WHEN_UP.has(alert.metric);
  const isPositive =
    (alert.direction === "up" && upIsPositive) ||
    (alert.direction === "down" && !upIsPositive);

  return isPositive ? "positive" : "negative";
}

export function IncomeReportPage({
  businessId,
  report,
  currency,
  periodDays,
}: {
  businessId: string;
  report: IncomeReport;
  currency: string;
  periodDays: IncomePeriodDays;
}) {
  const { summary, daily, byService, lineItems } = report;
  const {
    kpis,
    statusDonut,
    serviceDonut,
    busiestWindows,
    trendAlerts,
  } = report;

  const metrics = [
    { label: "Today", value: summary.today },
    { label: "This week", value: summary.week },
    { label: "This month", value: summary.month },
    { label: `Last ${periodDays} days`, value: summary.periodTotal },
    { label: "Profit", value: kpis.profit },
    { label: "All time", value: summary.allTime },
  ];

  const exportBase = `/dashboard/${businessId}/income/export?days=${periodDays}`;

  const kpiPercentages = [
    { label: "Fill rate", value: kpis.fillRate },
    { label: "Cancellation rate", value: kpis.cancellationRate },
    { label: "Repeat customer rate", value: kpis.repeatCustomerRate },
    { label: "Add-on attach rate", value: kpis.addonAttachRate },
    { label: "Profit margin", value: kpis.profitMargin },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {metrics.map((metric) => (
          <div key={metric.label} className="admin-card p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-[#8b92a5]">
              {metric.label}
            </p>
            <p className="mt-2 text-2xl font-bold text-[#1e2235]">
              {formatPrice(metric.value, currency)}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {kpiPercentages.map((metric) => (
          <div key={metric.label} className="admin-card p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-[#8b92a5]">
              {metric.label}
            </p>
            <p className="mt-2 text-2xl font-bold text-[#1e2235]">
              {metric.value.toFixed(1)}%
            </p>
          </div>
        ))}
      </div>

      {trendAlerts.length > 0 && (
        <div className="admin-card p-5">
          <h2 className="text-base font-bold text-[#1e2235]">Trend alerts</h2>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {trendAlerts.map((alert) => (
              <div
                key={alert.metric}
                className={cn(
                  "rounded-xl border bg-zinc-900/70 px-4 py-3",
                  getAlertTone(alert) === "positive" && "border-emerald-500/35",
                  getAlertTone(alert) === "negative" && "border-red-500/35",
                  getAlertTone(alert) === "neutral" && "border-amber-500/35"
                )}
              >
                <p className="text-sm font-semibold text-white">{alert.metric}</p>
                <p
                  className={cn(
                    "mt-1 text-sm font-semibold",
                    getAlertTone(alert) === "positive" && "text-emerald-300",
                    getAlertTone(alert) === "negative" && "text-red-300",
                    getAlertTone(alert) === "neutral" && "text-amber-300"
                  )}
                >
                  {alert.isBaselineEstimated
                    ? `${alert.direction === "up" ? "Increased" : "Decreased"} from zero baseline`
                    : `${alert.direction === "up" ? "Increased" : "Decreased"} by ${alert.deltaPercent.toFixed(1)}%`}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <DonutChart
          title="Appointment status mix"
          subtitle={`Status distribution for last ${periodDays} days`}
          slices={statusDonut}
        />
        <DonutChart
          title="Revenue mix by service"
          subtitle={`Revenue contribution for last ${periodDays} days`}
          slices={serviceDonut}
        />
      </div>

      <div className="admin-card overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-[#1e2235]/8 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#1e2235]">Income trend</h2>
            <p className="mt-1 text-sm text-[#8b92a5]">
              Daily revenue for the selected period
            </p>
          </div>
          <Suspense
            fallback={
              <div className="h-10 w-48 animate-pulse rounded-full bg-[#f0f2f5]" />
            }
          >
            <IncomePeriodTabs businessId={businessId} activeDays={periodDays} />
          </Suspense>
        </div>
        <div className="px-6 py-5">
          <IncomeChart daily={daily} currency={currency} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <HorizontalBarChart
          title="Top services by revenue"
          subtitle="Bar chart by service revenue"
          points={byService.slice(0, 8).map((row) => ({
            label: row.serviceName,
            value: Number(row.revenue.toFixed(2)),
          }))}
        />
        <HorizontalBarChart
          title="Busiest time windows"
          subtitle="Most-booked day/hour slots"
          points={busiestWindows}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="admin-card overflow-hidden">
          <div className="border-b border-[#1e2235]/8 px-6 py-5">
            <h2 className="text-lg font-bold text-[#1e2235]">By service</h2>
            <p className="mt-1 text-sm text-[#8b92a5]">
              Revenue in the last {periodDays} days
            </p>
          </div>
          {byService.length > 0 ? (
            <div className="divide-y divide-[#1e2235]/6">
              {byService.map((row) => (
                <div
                  key={row.serviceId}
                  className="flex items-center justify-between gap-4 px-6 py-4"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-[#1e2235]">
                      {row.serviceName}
                    </p>
                    <p className="text-sm text-[#8b92a5]">
                      {row.appointmentCount} appointment
                      {row.appointmentCount === 1 ? "" : "s"}
                    </p>
                  </div>
                  <p className="shrink-0 font-semibold text-[#1e2235]">
                    {formatPrice(row.revenue, currency)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="px-6 py-10 text-center text-sm text-[#8b92a5]">
              No billable appointments in this period.
            </p>
          )}
        </div>

        <div className="admin-card overflow-hidden">
          <div className="border-b border-[#1e2235]/8 px-6 py-5">
            <h2 className="text-lg font-bold text-[#1e2235]">How it&apos;s calculated</h2>
          </div>
          <div className="space-y-3 px-6 py-5 text-sm text-[#8b92a5]">
            <p>
              Income is the service price plus any add-on prices for each
              appointment.
            </p>
            <p>
              Only <strong className="text-[#1e2235]">completed</strong>{" "}
              appointments are included in income totals.
            </p>
            <p>
              Pending, confirmed, cancelled, and no-show bookings are excluded.
            </p>
            <p>
              Profit is calculated as <strong className="text-[#1e2235]">Revenue - Cost</strong> from service and additional service cost values.
            </p>
          </div>
        </div>
      </div>

      <div className="admin-card overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-[#1e2235]/8 px-6 py-5">
          <div>
            <h2 className="text-lg font-bold text-[#1e2235]">Reporting exports</h2>
            <p className="mt-1 text-sm text-[#8b92a5]">
              Download accounting-ready reports (CSV)
            </p>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Link href={`${exportBase}&type=overview`} className={exportPillClass}>
              KPI overview CSV
            </Link>
            <Link href={`${exportBase}&type=revenue`} className={exportPillClass}>
              Revenue report CSV
            </Link>
            <Link href={`${exportBase}&type=profit`} className={exportPillClass}>
              Profit report CSV
            </Link>
            <Link href={`${exportBase}&type=journal`} className={exportPillClass}>
              Accounting journal CSV
            </Link>
            <Link href={`${exportBase}&type=receivables`} className={exportPillClass}>
              Receivables CSV
            </Link>
          </div>
        </div>
      </div>

      <div className="admin-card overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-[#1e2235]/8 px-6 py-5">
          <div>
            <h2 className="text-lg font-bold text-[#1e2235]">Appointment income</h2>
            <p className="mt-1 text-sm text-[#8b92a5]">
              {lineItems.length} billable booking
              {lineItems.length === 1 ? "" : "s"} in the last {periodDays} days
            </p>
          </div>
        </div>
        {lineItems.length > 0 ? (
          <div className="divide-y divide-[#1e2235]/6">
            {lineItems.map((item) => (
              <Link
                key={item.id}
                href={`/dashboard/${businessId}/appointments?id=${item.id}`}
                className="flex flex-col gap-3 px-6 py-4 transition-colors hover:bg-zinc-800/80 hover:ring-1 hover:ring-inset hover:ring-amber-400/30 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-[#1e2235]">
                    {item.serviceName}
                  </p>
                  <p className="text-sm text-[#8b92a5]">
                    {item.customerName} ·{" "}
                    {format(new Date(item.startAt), "PPP p")}
                  </p>
                  {item.addonNames.length > 0 && (
                    <p className="mt-1 text-sm text-[#8b92a5]">
                      + {item.addonNames.join(", ")}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-medium capitalize",
                      statusStyle[item.status] ?? "bg-[#f0f2f5] text-[#8b92a5]"
                    )}
                  >
                    {item.status.replace("_", " ")}
                  </span>
                  <span className="text-xs text-[#8b92a5]">
                    Cost: {formatPrice(item.cost, currency)}
                  </span>
                  <span className="font-semibold text-[#1e2235]">
                    {formatPrice(item.revenue, currency)}
                  </span>
                  <span className="font-semibold text-emerald-700">
                    Profit: {formatPrice(item.profit, currency)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="px-6 py-10 text-center text-sm text-[#8b92a5]">
            No billable appointments in this period.
          </p>
        )}
      </div>
    </div>
  );
}
