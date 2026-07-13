"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { todayInTimezone } from "@/lib/availability";
import type { AppointmentRow } from "@/components/dashboard/appointments-panel";
import {
  CalendarAppointmentTooltip,
  CalendarDayOverflowTooltip,
  CalendarDaySummaryTooltip,
} from "@/components/dashboard/calendar-appointment-tooltip";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const STATUS_DOT: Record<string, string> = {
  pending: "bg-amber-400",
  confirmed: "bg-emerald-400",
  cancelled: "bg-red-400",
  completed: "bg-gray-400",
  no_show: "bg-red-500",
};

function monthKeyFromDate(dateStr: string): string {
  return dateStr.slice(0, 7);
}

function shiftMonth(monthKey: string, delta: number): string {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(year, month - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function buildMonthGrid(monthKey: string): Array<{ date: string; inMonth: boolean }> {
  const [year, month] = monthKey.split("-").map(Number);
  const firstOfMonth = new Date(year, month - 1, 1);
  const lastOfMonth = new Date(year, month, 0);
  const leading = firstOfMonth.getDay();
  const daysInMonth = lastOfMonth.getDate();

  const cells: Array<{ date: string; inMonth: boolean }> = [];

  for (let i = leading - 1; i >= 0; i--) {
    const d = new Date(year, month - 1, -i);
    cells.push({
      date: format(d, "yyyy-MM-dd"),
      inMonth: false,
    });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({
      date: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      inMonth: true,
    });
  }

  while (cells.length % 7 !== 0) {
    const last = parseISO(cells[cells.length - 1]!.date);
    const next = new Date(last);
    next.setDate(next.getDate() + 1);
    cells.push({
      date: format(next, "yyyy-MM-dd"),
      inMonth: false,
    });
  }

  return cells;
}

export function AppointmentsCalendar({
  appointments,
  timezone,
  selectedDate,
  onSelectDate,
  onSelectAppointment,
  highlightAppointmentId,
  focusDate,
  variant = "admin",
  manageHref,
  fullBleed = false,
}: {
  appointments: AppointmentRow[];
  timezone: string;
  selectedDate: string | null;
  onSelectDate: (date: string | null) => void;
  onSelectAppointment: (id: string) => void;
  highlightAppointmentId?: string;
  focusDate?: string | null;
  variant?: "admin" | "booking";
  manageHref?: (appointmentId: string) => string;
  fullBleed?: boolean;
}) {
  const isBooking = variant === "booking";
  const isDark = true; // both admin and booking use dark theme
  const today = todayInTimezone(timezone);
  const [viewMonth, setViewMonth] = useState(() =>
    monthKeyFromDate(focusDate ?? selectedDate ?? today)
  );

  useEffect(() => {
    if (focusDate) {
      setViewMonth(monthKeyFromDate(focusDate));
    }
  }, [focusDate]);

  const byDate = useMemo(() => {
    const map = new Map<string, AppointmentRow[]>();
    for (const appt of appointments) {
      const list = map.get(appt.date) ?? [];
      list.push(appt);
      map.set(appt.date, list);
    }
    for (const list of map.values()) {
      list.sort(
        (a, b) =>
          new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
      );
    }
    return map;
  }, [appointments]);

  const grid = useMemo(() => buildMonthGrid(viewMonth), [viewMonth]);
  const monthLabel = format(parseISO(`${viewMonth}-01`), "MMMM yyyy");

  const selectedAppointments = selectedDate
    ? (byDate.get(selectedDate) ?? [])
    : [];

  return (
    <div
      className={cn(
        "space-y-4 sm:space-y-6",
        fullBleed &&
        "relative left-1/2 w-screen max-w-[100vw] -translate-x-1/2 px-1 sm:px-0"
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setViewMonth((m) => shiftMonth(m, -1))}
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-full border transition-colors",
            "border-white/10 text-white hover:bg-booking-surface"
          )}
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="text-center">
          <p
            className={cn(
              "text-lg font-bold",
              "text-white"
            )}
          >
            {monthLabel}
          </p>
          <button
            type="button"
            onClick={() => {
              setViewMonth(monthKeyFromDate(today));
              onSelectDate(today);
            }}
            className="text-xs font-medium text-booking-accent hover:underline"
          >
            Today
          </button>
        </div>
        <button
          type="button"
          onClick={() => setViewMonth((m) => shiftMonth(m, 1))}
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-full border transition-colors",
            "border-white/10 text-white hover:bg-booking-surface"
          )}
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="w-full">
        <div
          className={cn(
            "grid grid-cols-7 border-b",
            "border-white/10"
          )}
        >
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className={cn(
                "px-0.5 py-1.5 text-center text-[10px] font-semibold uppercase tracking-wide sm:px-2 sm:py-2 sm:text-xs",
                "text-[var(--admin-muted)]"
              )}
            >
              <span className="sm:hidden">{day.slice(0, 1)}</span>
              <span className="hidden sm:inline">{day}</span>
            </div>
          ))}
        </div>

        <div className="grid w-full grid-cols-7">
          {grid.map((cell) => {
            const dayAppointments = byDate.get(cell.date) ?? [];
            const isToday = cell.date === today;
            const isSelected = cell.date === selectedDate;

            return (
              <button
                key={cell.date}
                type="button"
                onClick={() =>
                  onSelectDate(cell.date === selectedDate ? null : cell.date)
                }
                className={cn(
                  "min-h-[4.5rem] border-b border-r p-0.5 text-left transition-colors last:border-r-0 sm:min-h-[6rem] sm:p-1.5 lg:min-h-[7rem] lg:p-2",
                  "border-white/10",
                  cell.inMonth
                    ? "bg-[var(--admin-surface)]"
                    : "bg-[var(--admin-bg)]",
                  isSelected && "bg-booking-accent/10 ring-1 ring-inset ring-booking-accent/40",
                  !isSelected && "hover:bg-[var(--admin-elevated)]"
                )}
              >
                <div className="flex items-center justify-between gap-1">
                  <span
                    className={cn(
                      "inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold sm:h-7 sm:w-7 sm:text-sm",
                      isToday
                        ? "bg-booking-accent text-booking-accent-fg"
                        : cell.inMonth
                          ? "text-white"
                          : "text-[var(--admin-muted)]"
                    )}
                  >
                    {Number(cell.date.slice(8, 10))}
                  </span>
                  {dayAppointments.length > 0 && (
                    <CalendarDaySummaryTooltip
                      appointments={dayAppointments}
                      variant={variant}
                      onActivate={() => onSelectDate(cell.date)}
                    >
                      <span
                        className={cn(
                          "rounded-full px-1 py-0.5 text-[9px] font-medium sm:px-1.5 sm:text-[10px]",
                          "bg-white/10 text-white"
                        )}
                      >
                        {dayAppointments.length}
                      </span>
                    </CalendarDaySummaryTooltip>
                  )}
                </div>

                <div className="mt-0.5 space-y-0.5 sm:mt-1.5 sm:space-y-1">
                  {dayAppointments.slice(0, 3).map((appt) => (
                    <CalendarAppointmentTooltip
                      key={appt.id}
                      appt={appt}
                      variant={variant}
                      className={cn(
                        "flex w-full cursor-pointer items-center gap-1 rounded px-0.5 py-0.5 text-left leading-tight sm:gap-1.5 sm:rounded-md sm:px-1.5 sm:py-1 sm:text-[11px]",
                        highlightAppointmentId === appt.id
                          ? "bg-booking-accent/25 ring-1 ring-booking-accent/50"
                          : "bg-[var(--admin-elevated)] hover:bg-white/10"
                      )}
                      onActivate={() => {
                        onSelectDate(cell.date);
                        onSelectAppointment(appt.id);
                      }}
                    >
                      <span
                        className={cn(
                          "h-1.5 w-1.5 shrink-0 rounded-full",
                          STATUS_DOT[appt.status] ?? "bg-[#8b92a5]"
                        )}
                      />
                      <span
                        className={cn(
                          "min-w-0 truncate font-medium max-sm:text-[9px]",
                          "text-white"
                        )}
                      >
                        <span className="hidden sm:inline">
                          {format(new Date(appt.start_at), "h:mm a")} ·{" "}
                        </span>
                        {appt.service_name}
                      </span>
                    </CalendarAppointmentTooltip>
                  ))}
                  {dayAppointments.length > 3 && (
                    <CalendarDayOverflowTooltip
                      appointments={dayAppointments}
                      hiddenCount={dayAppointments.length - 3}
                      variant={variant}
                      className={cn(
                        "cursor-pointer px-1 text-[10px] font-medium",
                        "text-[var(--admin-muted)]"
                      )}
                      onActivate={() => onSelectDate(cell.date)}
                    />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {selectedDate && (
        <div
          className={cn(
            "rounded-2xl border p-3 sm:p-4 lg:p-5",
            fullBleed && "mx-1 sm:mx-0",
            "border-white/10 bg-[var(--admin-bg)]/60"
          )}
        >
          <h3
            className={cn(
              "text-sm font-bold",
              "text-white"
            )}
          >
            {format(parseISO(selectedDate), "EEEE, MMMM d, yyyy")}
          </h3>
          <p
            className={cn(
              "mt-1 text-xs",
              "text-[var(--admin-muted)]"
            )}
          >
            {selectedAppointments.length === 0
              ? "No appointments on this day"
              : `${selectedAppointments.length} appointment${selectedAppointments.length === 1 ? "" : "s"}`}
          </p>

          {selectedAppointments.length > 0 && (
            <div className="mt-4 space-y-2">
              {selectedAppointments.map((appt) => {
                const cardClass = cn(
                  "flex w-full items-start justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-colors",
                  "border-white/10 bg-[var(--admin-elevated)] hover:border-white/20",
                  highlightAppointmentId === appt.id &&
                  "border-booking-accent/50 bg-booking-accent/10"
                );
                const content = (
                  <>
                    <div className="min-w-0">
                      <p className="font-semibold text-white">
                        {appt.service_name}
                      </p>
                      <p className="mt-0.5 text-sm text-[var(--admin-muted)]">
                        {appt.customer_name}
                        {appt.customer_phone ? ` · ${appt.customer_phone}` : ""}
                      </p>
                      <p className="mt-1 text-sm text-white">
                        {format(new Date(appt.start_at), "h:mm a")} –{" "}
                        {format(new Date(appt.end_at), "h:mm a")}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize",
                        appt.status === "pending" && "bg-amber-500/25 text-amber-300",
                        appt.status === "confirmed" && "bg-emerald-500/25 text-emerald-300",
                        appt.status === "cancelled" && "bg-red-500/25 text-red-300",
                        appt.status === "completed" && "bg-white/10 text-[var(--admin-muted)]",
                        appt.status === "no_show" && "bg-red-500/25 text-red-300"
                      )}
                    >
                      {appt.status.replace("_", " ")}
                    </span>
                  </>
                );

                if (manageHref) {
                  return (
                    <Link
                      key={appt.id}
                      href={manageHref(appt.id)}
                      className={cardClass}
                      onClick={() => onSelectAppointment(appt.id)}
                    >
                      {content}
                    </Link>
                  );
                }

                return (
                  <button
                    key={appt.id}
                    type="button"
                    onClick={() => onSelectAppointment(appt.id)}
                    className={cardClass}
                  >
                    {content}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
