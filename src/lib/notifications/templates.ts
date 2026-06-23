import { formatInTimeZone } from "date-fns-tz";
import { formatPrice } from "@/lib/utils";
import { DEFAULT_TIMEZONE } from "@/lib/constants";

export type BookingDetails = {
  appointmentId: string;
  businessId: string;
  businessName: string;
  businessSlug: string;
  timezone: string;
  currency: string;
  serviceName: string;
  servicePrice: number;
  addonNames: string[];
  addonTotal: number;
  durationMinutes: number;
  startAt: string;
  endAt: string;
  notes: string | null;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
};

function formatServiceLine(details: BookingDetails): string {
  const base = `${details.serviceName} (${details.durationMinutes} min)`;
  if (details.addonNames.length === 0) return base;
  return `${base} + ${details.addonNames.join(", ")}`;
}

function formatTotalPrice(details: BookingDetails): string {
  return formatPrice(details.servicePrice + details.addonTotal, details.currency);
}

export function formatBookingDateTime(
  iso: string,
  timezone: string
): string {
  return formatInTimeZone(
    new Date(iso),
    timezone || DEFAULT_TIMEZONE,
    "EEEE, d MMMM yyyy 'at' h:mm a"
  );
}

export function formatBookingTimeRange(details: BookingDetails): string {
  const tz = details.timezone || DEFAULT_TIMEZONE;
  const date = formatInTimeZone(new Date(details.startAt), tz, "EEEE, d MMMM yyyy");
  const start = formatInTimeZone(new Date(details.startAt), tz, "h:mm a");
  const end = formatInTimeZone(new Date(details.endAt), tz, "h:mm a");
  return `${date}, ${start} – ${end}`;
}

export function customerConfirmationEmail(details: BookingDetails): {
  subject: string;
  html: string;
  text: string;
} {
  const when = formatBookingTimeRange(details);
  const price = formatTotalPrice(details);
  const serviceLine = formatServiceLine(details);
  const subject = `Booking confirmed at ${details.businessName}`;

  const text = [
    `Hi ${details.customerName},`,
    "",
    `Your appointment is confirmed.`,
    "",
    `Business: ${details.businessName}`,
    `Service: ${serviceLine}`,
    `When: ${when}`,
    `Price: ${price}`,
    details.notes ? `Notes: ${details.notes}` : null,
    "",
    "Thank you for booking with BookNow.",
  ]
    .filter(Boolean)
    .join("\n");

  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:520px;color:#1e2235">
      <h2 style="margin:0 0 16px">Booking confirmed</h2>
      <p>Hi ${escapeHtml(details.customerName)},</p>
      <p>Your appointment at <strong>${escapeHtml(details.businessName)}</strong> is confirmed.</p>
      <table style="width:100%;border-collapse:collapse;margin:20px 0">
        <tr><td style="padding:8px 0;color:#8b92a5">Service</td><td style="padding:8px 0"><strong>${escapeHtml(details.serviceName)}</strong> (${details.durationMinutes} min)${details.addonNames.length ? `<br><span style="color:#8b92a5;font-size:14px">+ ${escapeHtml(details.addonNames.join(", "))}</span>` : ""}</td></tr>
        <tr><td style="padding:8px 0;color:#8b92a5">When</td><td style="padding:8px 0">${escapeHtml(when)}</td></tr>
        <tr><td style="padding:8px 0;color:#8b92a5">Price</td><td style="padding:8px 0">${escapeHtml(price)}</td></tr>
        ${details.notes ? `<tr><td style="padding:8px 0;color:#8b92a5">Notes</td><td style="padding:8px 0">${escapeHtml(details.notes)}</td></tr>` : ""}
      </table>
      <p style="color:#8b92a5;font-size:14px">Thank you for booking with BookNow.</p>
    </div>
  `;

  return { subject, html, text };
}

export function businessBookingEmail(details: BookingDetails): {
  subject: string;
  html: string;
  text: string;
} {
  const when = formatBookingTimeRange(details);
  const price = formatTotalPrice(details);
  const serviceLine = formatServiceLine(details);
  const subject = `New booking: ${details.serviceName} — ${details.customerName}`;

  const text = [
    `New appointment booked at ${details.businessName}.`,
    "",
    `Customer: ${details.customerName}`,
    details.customerEmail ? `Email: ${details.customerEmail}` : null,
    details.customerPhone ? `Phone: ${details.customerPhone}` : null,
    `Service: ${serviceLine}`,
    `When: ${when}`,
    `Price: ${price}`,
    details.notes ? `Notes: ${details.notes}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:520px;color:#1e2235">
      <h2 style="margin:0 0 16px">New booking</h2>
      <p>You have a new appointment at <strong>${escapeHtml(details.businessName)}</strong>.</p>
      <table style="width:100%;border-collapse:collapse;margin:20px 0">
        <tr><td style="padding:8px 0;color:#8b92a5">Customer</td><td style="padding:8px 0"><strong>${escapeHtml(details.customerName)}</strong></td></tr>
        ${details.customerEmail ? `<tr><td style="padding:8px 0;color:#8b92a5">Email</td><td style="padding:8px 0">${escapeHtml(details.customerEmail)}</td></tr>` : ""}
        ${details.customerPhone ? `<tr><td style="padding:8px 0;color:#8b92a5">Phone</td><td style="padding:8px 0">${escapeHtml(details.customerPhone)}</td></tr>` : ""}
        <tr><td style="padding:8px 0;color:#8b92a5">Service</td><td style="padding:8px 0">${escapeHtml(details.serviceName)} (${details.durationMinutes} min)${details.addonNames.length ? `<br><span style="color:#8b92a5;font-size:14px">+ ${escapeHtml(details.addonNames.join(", "))}</span>` : ""}</td></tr>
        <tr><td style="padding:8px 0;color:#8b92a5">When</td><td style="padding:8px 0">${escapeHtml(when)}</td></tr>
        <tr><td style="padding:8px 0;color:#8b92a5">Price</td><td style="padding:8px 0">${escapeHtml(price)}</td></tr>
        ${details.notes ? `<tr><td style="padding:8px 0;color:#8b92a5">Notes</td><td style="padding:8px 0">${escapeHtml(details.notes)}</td></tr>` : ""}
      </table>
    </div>
  `;

  return { subject, html, text };
}

export function customerConfirmationSms(details: BookingDetails): string {
  const when = formatBookingTimeRange(details);
  return `BookNow: Your ${details.serviceName} at ${details.businessName} is confirmed for ${when}.`;
}

export function businessBookingSms(details: BookingDetails): string {
  const when = formatBookingDateTime(details.startAt, details.timezone);
  const phone = details.customerPhone ? ` (${details.customerPhone})` : "";
  return `BookNow: New booking — ${details.customerName}${phone}, ${details.serviceName}, ${when}.`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
