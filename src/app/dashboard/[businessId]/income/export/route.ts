import { endOfDay, startOfDay, subDays } from "date-fns";
import { NextRequest, NextResponse } from "next/server";
import {
    buildIncomeReport,
    parseIncomePeriodDays,
} from "@/lib/business-income";
import { DEFAULT_TIMEZONE } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";

const INCOME_SELECT = `id, start_at, end_at, customer_id, status,
  services ( id, name, price, cost_price, duration_minutes ),
  profiles ( full_name ),
  appointment_addons ( price, cost_price, services ( name, cost_price ) )`;

type ExportType = "overview" | "revenue" | "profit" | "journal";

function expectedAmount(row: {
    services:
    | { price: number }
    | { price: number }[]
    | null;
    appointment_addons?:
    | { price: number }[]
    | { price: number }
    | null;
}): number {
    const service = Array.isArray(row.services) ? row.services[0] : row.services;
    const servicePrice = Number(service?.price ?? 0);

    const addons = Array.isArray(row.appointment_addons)
        ? row.appointment_addons
        : row.appointment_addons
            ? [row.appointment_addons]
            : [];

    const addonTotal = addons.reduce((sum, addon) => sum + Number(addon.price ?? 0), 0);
    return servicePrice + addonTotal;
}

function asCsv(rows: Array<Record<string, string | number>>): string {
    if (rows.length === 0) return "";
    const headers = Object.keys(rows[0]);

    const escape = (value: string | number) => {
        const text = String(value ?? "");
        if (text.includes(",") || text.includes("\"") || text.includes("\n")) {
            return `"${text.replace(/\"/g, '""')}"`;
        }
        return text;
    };

    const lines = [headers.join(",")];
    for (const row of rows) {
        lines.push(headers.map((key) => escape(row[key] ?? "")).join(","));
    }
    return lines.join("\n");
}

function normalizeType(raw: string | null): ExportType | "receivables" {
    if (
        raw === "overview" ||
        raw === "revenue" ||
        raw === "profit" ||
        raw === "journal" ||
        raw === "receivables"
    ) {
        return raw;
    }
    return "overview";
}

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ businessId: string }> }
) {
    const { businessId } = await context.params;
    const search = request.nextUrl.searchParams;
    const days = parseIncomePeriodDays(search.get("days") ?? undefined);
    const type = normalizeType(search.get("type"));

    const supabase = await createClient();

    const todayEnd = endOfDay(new Date()).toISOString();
    const periodStart = startOfDay(subDays(new Date(), days - 1)).toISOString();

    const [
        { data: business },
        { data: periodAppts },
        { data: allTimeAppts },
        { data: businessHours },
    ] = await Promise.all([
        supabase
            .from("businesses")
            .select("id, currency, timezone, name")
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

    if (!business?.id) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const timezone = business.timezone ?? DEFAULT_TIMEZONE;

    const report = buildIncomeReport(
        periodAppts ?? [],
        allTimeAppts ?? [],
        timezone,
        days,
        businessHours ?? []
    );

    let rows: Array<Record<string, string | number>> = [];
    const filenameBase = `${business.name?.replace(/\s+/g, "-").toLowerCase() ?? "business"}-report-${type}-${days}d`;

    if (type === "overview") {
        rows = [
            {
                business: business.name ?? "Business",
                period_days: days,
                revenue: report.summary.periodTotal.toFixed(2),
                cost: report.kpis.cost.toFixed(2),
                profit: report.kpis.profit.toFixed(2),
                fill_rate_percent: report.kpis.fillRate.toFixed(2),
                cancellation_rate_percent: report.kpis.cancellationRate.toFixed(2),
                repeat_customer_rate_percent: report.kpis.repeatCustomerRate.toFixed(2),
                addon_attach_rate_percent: report.kpis.addonAttachRate.toFixed(2),
                profit_margin_percent: report.kpis.profitMargin.toFixed(2),
            },
        ];
    }

    if (type === "revenue") {
        rows = report.lineItems.map((item) => ({
            appointment_id: item.id,
            date: item.startAt,
            customer: item.customerName,
            service: item.serviceName,
            addons: item.addonNames.join(" | "),
            status: item.status,
            revenue: item.revenue.toFixed(2),
        }));
    }

    if (type === "profit") {
        rows = report.lineItems.map((item) => ({
            appointment_id: item.id,
            date: item.startAt,
            customer: item.customerName,
            service: item.serviceName,
            revenue: item.revenue.toFixed(2),
            cost: item.cost.toFixed(2),
            profit: item.profit.toFixed(2),
            margin_percent: item.revenue > 0 ? ((item.profit / item.revenue) * 100).toFixed(2) : "0.00",
        }));
    }

    if (type === "journal") {
        rows = report.lineItems.flatMap((item) => {
            const base = {
                entry_ref: `APPT-${item.id}`,
                date: item.startAt,
                description: `${item.serviceName} - ${item.customerName}`,
            };

            const journalRows: Array<Record<string, string | number>> = [
                {
                    ...base,
                    account: "Accounts Receivable",
                    debit: item.revenue.toFixed(2),
                    credit: "0.00",
                },
                {
                    ...base,
                    account: "Service Revenue",
                    debit: "0.00",
                    credit: item.revenue.toFixed(2),
                },
            ];

            if (item.cost > 0) {
                journalRows.push(
                    {
                        ...base,
                        account: "Cost of Services",
                        debit: item.cost.toFixed(2),
                        credit: "0.00",
                    },
                    {
                        ...base,
                        account: "Service Inventory/Payable",
                        debit: "0.00",
                        credit: item.cost.toFixed(2),
                    }
                );
            }

            return journalRows;
        });
    }

    if (type === "receivables") {
        rows = (periodAppts ?? [])
            .filter((row) => row.status === "pending" || row.status === "confirmed")
            .map((row) => ({
                appointment_id: row.id ?? "",
                date: row.start_at,
                status: row.status,
                expected_revenue: expectedAmount(row as { services: { price: number } | { price: number }[] | null; appointment_addons?: { price: number }[] | { price: number } | null }).toFixed(2),
            }));
    }

    const csv = asCsv(rows);

    return new NextResponse(csv, {
        status: 200,
        headers: {
            "content-type": "text/csv; charset=utf-8",
            "content-disposition": `attachment; filename="${filenameBase}.csv"`,
            "cache-control": "no-store",
        },
    });
}
