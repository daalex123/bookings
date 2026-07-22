import {
  eachDayOfInterval,
  endOfDay,
  format,
  getDay,
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
  end_at?: string;
  customer_id?: string;
  status: string;
  services:
  | { id?: string; name?: string; price: number; cost_price?: number; duration_minutes?: number }
  | { id?: string; name?: string; price: number; cost_price?: number; duration_minutes?: number }[]
  | null;
  profiles?: { full_name: string | null } | { full_name: string | null }[] | null;
  appointment_addons?:
  | {
    price: number;
    cost_price?: number;
    services?: { name: string; cost_price?: number } | { name: string; cost_price?: number }[] | null;
  }[]
  | {
    price: number;
    cost_price?: number;
    services?: { name: string; cost_price?: number } | { name: string; cost_price?: number }[] | null;
  }
  | null;
};

export type BusinessHoursRow = {
  day_of_week: number;
  open_time: string;
  close_time: string;
  is_closed: boolean;
};

export type IncomeSummary = {
  today: number;
  week: number;
  month: number;
  periodTotal: number;
  allTime: number;
};

export type ReportKpis = {
  fillRate: number;
  cancellationRate: number;
  repeatCustomerRate: number;
  addonAttachRate: number;
  profit: number;
  cost: number;
  profitMargin: number;
  appointmentCount: number;
};

export type TrendAlert = {
  metric: string;
  direction: "up" | "down";
  deltaPercent: number;
  currentValue: number;
  previousValue: number;
  isBaselineEstimated: boolean;
};

export type DonutSlice = {
  label: string;
  value: number;
  color: string;
};

export type BarPoint = {
  label: string;
  value: number;
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
  revenue: number;
  cost: number;
  profit: number;
};

export type IncomeReport = {
  summary: IncomeSummary;
  kpis: ReportKpis;
  daily: IncomeDailyPoint[];
  byService: IncomeServiceBreakdown[];
  statusDonut: DonutSlice[];
  serviceDonut: DonutSlice[];
  busiestWindows: BarPoint[];
  trendAlerts: TrendAlert[];
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

export function appointmentCost(row: IncomeAppointmentRow): number {
  if (!COUNTABLE_STATUSES.has(row.status)) return 0;

  const service = asJoined(row.services);
  const serviceCost = Number(service?.cost_price ?? 0);

  const addons = Array.isArray(row.appointment_addons)
    ? row.appointment_addons
    : row.appointment_addons
      ? [row.appointment_addons]
      : [];

  const addonCost = addons.reduce((sum, addon) => {
    const directCost = Number(addon.cost_price ?? 0);
    if (directCost > 0) return sum + directCost;
    const addonService = asJoined(addon.services);
    return sum + Number(addonService?.cost_price ?? 0);
  }, 0);

  return serviceCost + addonCost;
}

function appointmentDurationMinutes(row: IncomeAppointmentRow): number {
  const service = asJoined(row.services);
  const serviceDuration = Number(service?.duration_minutes ?? 0);
  if (serviceDuration > 0) return serviceDuration;
  if (!row.end_at) return 0;
  const start = new Date(row.start_at).getTime();
  const end = new Date(row.end_at).getTime();
  const diff = Math.max(0, end - start);
  return Math.round(diff / 60000);
}

function zonedDayKey(iso: string, timezone: string): string {
  return format(toZonedTime(new Date(iso), timezone), "yyyy-MM-dd");
}

function toLineItem(row: IncomeAppointmentRow): IncomeLineItem | null {
  const revenue = appointmentRevenue(row);
  const cost = appointmentCost(row);
  if (!row.id || revenue <= 0) return null;

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
    revenue,
    cost,
    profit: revenue - cost,
  };
}

function parseTimeMinutes(value: string): number {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

function availableMinutesForDay(date: Date, businessHours: BusinessHoursRow[]): number {
  const day = getDay(date);
  const row = businessHours.find((item) => item.day_of_week === day);
  if (!row || row.is_closed) return 0;
  const open = parseTimeMinutes(row.open_time);
  const close = parseTimeMinutes(row.close_time);
  return Math.max(0, close - open);
}

function percent(value: number, total: number): number {
  if (total <= 0) return 0;
  return (value / total) * 100;
}

function buildTrendAlert(
  metric: string,
  currentValue: number,
  previousValue: number,
  direction: "up" | "down"
): TrendAlert | null {
  if (previousValue <= 0 && currentValue <= 0) return null;
  const isBaselineEstimated = previousValue <= 0;
  const baseline = isBaselineEstimated ? Math.max(currentValue, 1) : previousValue;
  const rawDeltaPercent = ((currentValue - previousValue) / baseline) * 100;
  const deltaPercent = Math.min(Math.abs(rawDeltaPercent), 500);
  if (Math.abs(deltaPercent) < 10) return null;

  return {
    metric,
    direction,
    deltaPercent,
    currentValue,
    previousValue,
    isBaselineEstimated,
  };
}

export function buildIncomeReport(
  periodRows: IncomeAppointmentRow[],
  allTimeRows: IncomeAppointmentRow[],
  timezone: string,
  days: number = DEFAULT_INCOME_PERIOD_DAYS,
  businessHours: BusinessHoursRow[] = []
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

  const statusCounts = new Map<string, number>();
  const serviceRevenueMap = new Map<string, number>();
  const windowCounts = new Map<string, number>();
  const completedByCustomer = new Map<string, number>();

  let totalCost = 0;
  let completedCount = 0;
  let cancelledCount = 0;
  let withAddonCount = 0;
  let bookedMinutes = 0;

  const totalAvailableMinutes = chartDays.reduce(
    (sum, day) => sum + availableMinutesForDay(day, businessHours),
    0
  );

  const serviceMap = new Map<string, IncomeServiceBreakdown>();
  const lineItems: IncomeLineItem[] = [];

  for (const row of periodRows) {
    const amount = appointmentRevenue(row);
    const cost = appointmentCost(row);
    const dayKey = zonedDayKey(row.start_at, timezone);

    statusCounts.set(row.status, (statusCounts.get(row.status) ?? 0) + 1);

    if (row.status === "cancelled") cancelledCount += 1;
    if (row.status !== "cancelled") {
      bookedMinutes += appointmentDurationMinutes(row);
      const dt = toZonedTime(new Date(row.start_at), timezone);
      const label = format(dt, "EEE HH:00");
      windowCounts.set(label, (windowCounts.get(label) ?? 0) + 1);
    }

    if (amount > 0) {
      totalCost += cost;
    }

    if (amount <= 0) continue;

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

    serviceRevenueMap.set(serviceName, (serviceRevenueMap.get(serviceName) ?? 0) + amount);

    completedCount += 1;
    if (Array.isArray(row.appointment_addons) ? row.appointment_addons.length > 0 : Boolean(row.appointment_addons)) {
      withAddonCount += 1;
    }

    if (row.customer_id) {
      completedByCustomer.set(
        row.customer_id,
        (completedByCustomer.get(row.customer_id) ?? 0) + 1
      );
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

  const statusDonut: DonutSlice[] = [
    { label: "Completed", value: statusCounts.get("completed") ?? 0, color: "#10b981" },
    { label: "Confirmed", value: statusCounts.get("confirmed") ?? 0, color: "#3b82f6" },
    { label: "Pending", value: statusCounts.get("pending") ?? 0, color: "#f59e0b" },
    { label: "Cancelled", value: statusCounts.get("cancelled") ?? 0, color: "#ef4444" },
    { label: "No show", value: statusCounts.get("no_show") ?? 0, color: "#64748b" },
  ].filter((slice) => slice.value > 0);

  const serviceSlices = [...serviceRevenueMap.entries()]
    .sort((a, b) => b[1] - a[1]);
  const topServiceSlices = serviceSlices.slice(0, 4).map(([label, value], index) => ({
    label,
    value,
    color: ["#f59e0b", "#3b82f6", "#22c55e", "#a855f7"][index] ?? "#64748b",
  }));
  const othersTotal = serviceSlices.slice(4).reduce((sum, [, value]) => sum + value, 0);
  const serviceDonut = othersTotal > 0
    ? [...topServiceSlices, { label: "Other", value: othersTotal, color: "#94a3b8" }]
    : topServiceSlices;

  const busiestWindows = [...windowCounts.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  const uniqueCustomers = completedByCustomer.size;
  const repeatCustomers = [...completedByCustomer.values()].filter((count) => count > 1).length;

  const kpis: ReportKpis = {
    fillRate: percent(bookedMinutes, totalAvailableMinutes),
    cancellationRate: percent(cancelledCount, periodRows.length),
    repeatCustomerRate: percent(repeatCustomers, uniqueCustomers),
    addonAttachRate: percent(withAddonCount, completedCount),
    cost: totalCost,
    profit: summary.periodTotal - totalCost,
    profitMargin: percent(summary.periodTotal - totalCost, summary.periodTotal),
    appointmentCount: periodRows.length,
  };

  const trendAlerts: TrendAlert[] = [];
  const previousDaysStart = startOfDay(subDays(chartStart, days));
  const previousDaysEnd = endOfDay(subDays(chartStart, 1));
  const previousRows = allTimeRows.filter((row) => {
    const dt = new Date(row.start_at);
    return dt >= previousDaysStart && dt <= previousDaysEnd;
  });

  const previousRevenue = previousRows.reduce((sum, row) => sum + appointmentRevenue(row), 0);
  const previousCancelled = previousRows.filter((row) => row.status === "cancelled").length;
  const previousCancellationRate = percent(previousCancelled, previousRows.length);

  const revenueAlert = buildTrendAlert("Revenue", summary.periodTotal, previousRevenue, "up");
  if (revenueAlert) trendAlerts.push(revenueAlert);
  const cancelAlert = buildTrendAlert(
    "Cancellation rate",
    kpis.cancellationRate,
    previousCancellationRate,
    "down"
  );
  if (cancelAlert) trendAlerts.push(cancelAlert);

  lineItems.sort(
    (a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime()
  );

  return {
    summary,
    kpis,
    daily,
    byService,
    statusDonut,
    serviceDonut,
    busiestWindows,
    trendAlerts,
    lineItems,
  };
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
