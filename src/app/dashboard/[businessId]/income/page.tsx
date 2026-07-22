import { endOfDay, startOfDay, subDays } from "date-fns";
import {
  buildIncomeReport,
  parseIncomePeriodDays,
} from "@/lib/business-income";
import { DEFAULT_TIMEZONE } from "@/lib/constants";
import { PageHeader } from "@/components/dashboard/page-header";
import { IncomeReportPage } from "@/components/dashboard/income-report-page";
import { formatPrice } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";

const INCOME_SELECT = `id, start_at, end_at, customer_id, status,
  services ( id, name, price, cost_price, duration_minutes ),
  profiles ( full_name ),
  appointment_addons ( price, cost_price, services ( name, cost_price ) )`;

export default async function IncomePage({
  params,
  searchParams,
}: {
  params: Promise<{ businessId: string }>;
  searchParams: Promise<{ days?: string }>;
}) {
  const { businessId } = await params;
  const { days: daysParam } = await searchParams;
  const periodDays = parseIncomePeriodDays(daysParam);

  const supabase = await createClient();
  const todayEnd = endOfDay(new Date()).toISOString();
  const periodStart = startOfDay(
    subDays(new Date(), periodDays - 1)
  ).toISOString();

  const [
    { data: business },
    { data: periodAppts },
    { data: allTimeAppts },
    { data: businessHours },
  ] =
    await Promise.all([
      supabase
        .from("businesses")
        .select("currency, timezone")
        .eq("id", businessId)
        .single(),
      supabase
        .from("appointments")
        .select(INCOME_SELECT)
        .eq("business_id", businessId)
        .gte("start_at", periodStart)
        .lte("start_at", todayEnd)
        .order("start_at", { ascending: false }),
      supabase
        .from("appointments")
        .select(INCOME_SELECT)
        .eq("business_id", businessId)
        .lte("start_at", todayEnd),
      supabase
        .from("business_hours")
        .select("day_of_week, open_time, close_time, is_closed")
        .eq("business_id", businessId),
    ]);

  const currency = business?.currency ?? "LKR";
  const timezone = business?.timezone ?? DEFAULT_TIMEZONE;
  const report = buildIncomeReport(
    periodAppts ?? [],
    allTimeAppts ?? [],
    timezone,
    periodDays,
    businessHours ?? []
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reporting"
        description="Revenue, utilization, cancellation, and profit analytics"
        action={
          <div className="text-right">
            <p className="text-2xl font-bold text-[#1e2235]">
              {formatPrice(report.summary.periodTotal, currency)}
            </p>
            <p className="text-xs text-[#8b92a5]">Last {periodDays} days</p>
          </div>
        }
      />

      <IncomeReportPage
        businessId={businessId}
        report={report}
        currency={currency}
        periodDays={periodDays}
      />
    </div>
  );
}
