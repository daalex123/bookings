import Link from "next/link";
import { format } from "date-fns";
import { Suspense } from "react";
import type { IncomeReport } from "@/lib/business-income";
import { IncomeChart } from "@/components/dashboard/income-chart";
import { IncomePeriodTabs } from "@/components/dashboard/income-period-tabs";
import type { IncomePeriodDays } from "@/lib/business-income";
import { formatPrice } from "@/lib/utils";
import { cn } from "@/lib/utils";

const statusStyle: Record<string, string> = {
  pending: "bg-teal-50 text-teal-700",
  confirmed: "bg-emerald-50 text-emerald-700",
  completed: "bg-[#f0f2f5] text-[#8b92a5]",
};

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

  const metrics = [
    { label: "Today", value: summary.today },
    { label: "This week", value: summary.week },
    { label: "This month", value: summary.month },
    { label: `Last ${periodDays} days`, value: summary.periodTotal },
    { label: "All time", value: summary.allTime },
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
          </div>
        </div>
      </div>

      <div className="admin-card overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-[#1e2235]/8 px-6 py-5">
          <div>
            <h2 className="text-lg font-bold text-[#1e2235]">
              Appointment income
            </h2>
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
                className="flex flex-col gap-3 px-6 py-4 transition-colors hover:bg-[#f8f9fb] sm:flex-row sm:items-center sm:justify-between"
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
                  <span className="font-semibold text-[#1e2235]">
                    {formatPrice(item.amount, currency)}
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
