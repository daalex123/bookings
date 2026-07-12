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

const INCOME_SELECT = `id, start_at, status,
  services ( id, name, price ),
  profiles ( full_name ),
  appointment_addons ( price, services ( name ) )`;

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

  const [{ data: business }, { data: periodAppts }, { data: allTimeAppts }] =
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
        .eq("status", "completed")
        .order("start_at", { ascending: false }),
      supabase
        .from("appointments")
        .select(
          `start_at, status, services ( price ), appointment_addons ( price )`
        )
        .eq("business_id", businessId)
        .eq("status", "completed"),
    ]);

  const currency = business?.currency ?? "LKR";
  const timezone = business?.timezone ?? DEFAULT_TIMEZONE;
  const report = buildIncomeReport(
    periodAppts ?? [],
    allTimeAppts ?? [],
    timezone,
    periodDays
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Income"
        description="Revenue reporting and appointment income breakdown"
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
