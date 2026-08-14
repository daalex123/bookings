import { clsx, type ClassValue } from "clsx";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { twMerge } from "tailwind-merge";
import { DEFAULT_CURRENCY, LOCALE_BY_CURRENCY } from "@/lib/constants";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function formatPrice(
  price: number,
  currency: string = DEFAULT_CURRENCY
): string {
  const locale = LOCALE_BY_CURRENCY[currency] ?? "en-US";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(price);
}

export function asJoined<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export function getInitials(name: string | null | undefined): string {
  const parts = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (parts.length === 0) return "?";
  return parts
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function utcToLocalParts(
  iso: string,
  timezone: string
): { date: string; time: string } {
  const zoned = toZonedTime(new Date(iso), timezone);
  return {
    date: format(zoned, "yyyy-MM-dd"),
    time: format(zoned, "HH:mm"),
  };
}

/**
 * Format duration in minutes to a human-readable string
 * Examples: 30 → "30 min", 60 → "1 hr", 90 → "1 hr 30 min"
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours} hr${hours > 1 ? "s" : ""}`;
  }

  return `${hours} hr${hours > 1 ? "s" : ""} ${remainingMinutes} min`;
}
