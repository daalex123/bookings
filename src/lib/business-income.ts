import {
  eachDayOfInterval,
  endOfDay,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
} from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { asJoined } from "@/lib/utils";
import { mapAddonNames } from "@/lib/appointment-addons";

export const INCOME_PERIOD_OPTIONS = [7, 14, 30, 90] as const;
export type IncomePeriodDays = (typeof INCOME_PERIOD_OPTIONS)[number];
export const DEFAULT_INCOME_PERIOD_DAYS: IncomePeriodDays = 7;

const COUNTABLE_STATUSES = new Set(["completed"]);

export type IncomeAppointmentRow = {
  id?: string;
  start_at: string;
  status: string;
  services:
    | { id?: string; name?: string; price: number }
    | { id?: string; name?: string; price: number }[]
    | null;
  profiles?: { full_name: string | null } | { full_name: string | null }[] | null;
  appointment_addons?:
    | { price: number; services?: { name: string } | { name: string }[] | null }[]
    | { price: number; services?: { name: string } | { name: string }[] | null }
    | null;
};

export type IncomeSummary = {
  today: number;
  week: number;
  month: number;
  periodTotal: number;
  allTime: number;
};

export type IncomeDailyPoint = {
  date: string;
  label: string;
  amount: number;
};

export type IncomeServiceBreakdown = {
  serviceId: string;
  serviceName: string;
  appointmentCount: number;
  revenue: number;
};

export type IncomeLineItem = {
  id: string;
  startAt: string;
  customerName: string;
  serviceName: string;
  addonNames: string[];
  status: string;
  amount: number;
};

export type IncomeReport = {
  summary: IncomeSummary;
  daily: IncomeDailyPoint[];
  byService: IncomeServiceBreakdown[];
  lineItems: IncomeLineItem[];
};

export function parseIncomePeriodDays(value: string | undefined): IncomePeriodDays {
  const parsed = Number(value);
  if (INCOME_PERIOD_OPTIONS.includes(parsed as IncomePeriodDays)) {
    return parsed as IncomePeriodDays;
  }
  return DEFAULT_INCOME_PERIOD_DAYS;
}

export function appointmentRevenue(row: IncomeAppointmentRow): number {
  if (!COUNTABLE_STATUSES.has(row.status)) return 0;

  const service = asJoined(row.services);
  const servicePrice = Number(service?.price ?? 0);

  const addons = Array.isArray(row.appointment_addons)
    ? row.appointment_addons
    : row.appointment_addons
      ? [row.appointment_addons]
      : [];

  const addonTotal = addons.reduce(
    (sum, addon) => sum + Number(addon.price ?? 0),
    0
  );

  return servicePrice + addonTotal;
}

function zonedDayKey(iso: string, timezone: string): string {
  return format(toZonedTime(new Date(iso), timezone), "yyyy-MM-dd");
}

function toLineItem(row: IncomeAppointmentRow): IncomeLineItem | null {
  const amount = appointmentRevenue(row);
  if (!row.id || amount <= 0) return null;

  const service = asJoined(row.services);
  const profile = asJoined(row.profiles);
  const addons = Array.isArray(row.appointment_addons)
    ? row.appointment_addons
    : row.appointment_addons
      ? [row.appointment_addons]
      : [];

  return {
    id: row.id,
    startAt: row.start_at,
    customerName: profile?.full_name ?? "Customer",
    serviceName: service?.name ?? "Service",
    addonNames: mapAddonNames(
      addons as { services: { name: string } | { name: string }[] | null }[]
    ),
    status: row.status,
    amount,
  };
}

export function buildIncomeReport(
  periodRows: IncomeAppointmentRow[],
  allTimeRows: IncomeAppointmentRow[],
  timezone: string,
  days: number = DEFAULT_INCOME_PERIOD_DAYS
): IncomeReport {
  const now = new Date();
  const zonedNow = toZonedTime(now, timezone);
  const todayKey = format(zonedNow, "yyyy-MM-dd");
  const weekStartKey = format(
    startOfWeek(zonedNow, { weekStartsOn: 1 }),
    "yyyy-MM-dd"
  );
  const monthStartKey = format(startOfMonth(zonedNow), "yyyy-MM-dd");

  const chartStart = startOfDay(subDays(zonedNow, days - 1));
  const chartEnd = endOfDay(zonedNow);
  const chartDays = eachDayOfInterval({ start: chartStart, end: chartEnd });

  const amountsByDay = new Map<string, number>();
  for (const day of chartDays) {
    amountsByDay.set(format(day, "yyyy-MM-dd"), 0);
  }

  const summary: IncomeSummary = {
    today: 0,
    week: 0,
    month: 0,
    periodTotal: 0,
    allTime: allTimeRows.reduce((sum, row) => sum + appointmentRevenue(row), 0),
  };

  const serviceMap = new Map<string, IncomeServiceBreakdown>();
  const lineItems: IncomeLineItem[] = [];

  for (const row of periodRows) {
    const amount = appointmentRevenue(row);
    if (amount <= 0) continue;

    const dayKey = zonedDayKey(row.start_at, timezone);
    if (amountsByDay.has(dayKey)) {
      amountsByDay.set(dayKey, (amountsByDay.get(dayKey) ?? 0) + amount);
      summary.periodTotal += amount;
    }

    if (dayKey === todayKey) summary.today += amount;
    if (dayKey >= weekStartKey) summary.week += amount;
    if (dayKey >= monthStartKey) summary.month += amount;

    const service = asJoined(row.services);
    const serviceId = service?.id ?? "unknown";
    const serviceName = service?.name ?? "Service";
    const existing = serviceMap.get(serviceId);
    if (existing) {
      existing.appointmentCount += 1;
      existing.revenue += amount;
    } else {
      serviceMap.set(serviceId, {
        serviceId,
        serviceName,
        appointmentCount: 1,
        revenue: amount,
      });
    }

    const lineItem = toLineItem(row);
    if (lineItem) lineItems.push(lineItem);
  }

  const daily = chartDays.map((day) => {
    const date = format(day, "yyyy-MM-dd");
    return {
      date,
      label: format(day, "MMM d"),
      amount: amountsByDay.get(date) ?? 0,
    };
  });

  const byService = [...serviceMap.values()].sort(
    (a, b) => b.revenue - a.revenue
  );

  lineItems.sort(
    (a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime()
  );

  return { summary, daily, byService, lineItems };
}

/** Summary-only report for overview cards (no chart breakdown). */
export function buildIncomeSummary(
  rows: IncomeAppointmentRow[],
  timezone: string
): Pick<IncomeSummary, "today" | "week" | "month"> {
  const report = buildIncomeReport(rows, rows, timezone, 1);
  return {
    today: report.summary.today,
    week: report.summary.week,
    month: report.summary.month,
  };
}
