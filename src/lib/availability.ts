import { addDays, addMinutes, format } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import type { Appointment, BusinessHour } from "@/types/database";
import { DEFAULT_TIMEZONE } from "@/lib/constants";

function rangesOverlap(
  startA: Date,
  endA: Date,
  startB: Date,
  endB: Date
): boolean {
  return startA < endB && endA > startB;
}

/** Wall-clock time on a calendar date in the business timezone → UTC instant */
export function localTimeToUtc(
  dateStr: string,
  timeStr: string,
  timezone: string
): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hour, minute] = timeStr.slice(0, 5).split(":").map(Number);
  const wallClock = new Date(year, month - 1, day, hour, minute, 0, 0);
  return fromZonedTime(wallClock, timezone);
}

/** Day of week (0=Sun) for a calendar date in the business timezone */
export function dayOfWeekInTimezone(
  dateStr: string,
  timezone: string
): number {
  const utc = localTimeToUtc(dateStr, "12:00", timezone);
  return toZonedTime(utc, timezone).getDay();
}

/** Today's calendar date (yyyy-MM-dd) in the business timezone */
export function todayInTimezone(timezone: string): string {
  const zoned = toZonedTime(new Date(), timezone);
  return format(zoned, "yyyy-MM-dd");
}

/**
 * Generate bookable slots for a service on a given date.
 * Each slot spans durationMinutes; starts advance by slotIntervalMinutes.
 */
export function generateTimeSlots(
  dateStr: string,
  durationMinutes: number,
  slotIntervalMinutes: number,
  businessHours: BusinessHour[],
  existingAppointments: { start_at: string; end_at: string; status: string }[],
  timezone: string = DEFAULT_TIMEZONE
): string[] {
  const dayOfWeek = dayOfWeekInTimezone(dateStr, timezone);
  const hours = businessHours.find((h) => h.day_of_week === dayOfWeek);

  if (!hours || hours.is_closed) return [];

  const dayStart = localTimeToUtc(dateStr, hours.open_time, timezone);
  const dayEnd = localTimeToUtc(dateStr, hours.close_time, timezone);
  const now = new Date();

  const activeAppointments = existingAppointments.filter(
    (a) => a.status !== "cancelled"
  );

  const stepMinutes = Math.max(5, Math.min(slotIntervalMinutes, 480));
  const slots: string[] = [];
  let cursor = dayStart;

  while (addMinutes(cursor, durationMinutes) <= dayEnd) {
    const slotEnd = addMinutes(cursor, durationMinutes);
    const overlaps = activeAppointments.some((appt) => {
      const apptStart = new Date(appt.start_at);
      const apptEnd = new Date(appt.end_at);
      return rangesOverlap(cursor, slotEnd, apptStart, apptEnd);
    });

    if (!overlaps && cursor > now) {
      const zoned = toZonedTime(cursor, timezone);
      slots.push(format(zoned, "HH:mm"));
    }

    cursor = addMinutes(cursor, stepMinutes);
  }

  return slots;
}

export function slotToTimestamps(
  dateStr: string,
  time: string,
  durationMinutes: number,
  timezone: string = DEFAULT_TIMEZONE
): { start_at: string; end_at: string } {
  const start = localTimeToUtc(dateStr, time, timezone);
  const end = addMinutes(start, durationMinutes);
  return {
    start_at: start.toISOString(),
    end_at: end.toISOString(),
  };
}

/** UTC range covering a full calendar day in the business timezone */
export function dayBoundsInTimezone(
  dateStr: string,
  timezone: string
): { start: Date; end: Date } {
  const start = localTimeToUtc(dateStr, "00:00", timezone);
  const [year, month, day] = dateStr.split("-").map(Number);
  const nextDateStr = format(addDays(new Date(year, month - 1, day), 1), "yyyy-MM-dd");
  const end = localTimeToUtc(nextDateStr, "00:00", timezone);
  return { start, end };
}

export const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export type { Appointment, BusinessHour };
