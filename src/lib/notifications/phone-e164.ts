import { normalizePhone } from "@/lib/phone";

export function toE164(phone: string): string | null {
  const normalized = normalizePhone(phone);
  if (!normalized) return null;

  if (normalized.startsWith("+")) return normalized;

  const countryCode = process.env.SMS_DEFAULT_COUNTRY_CODE ?? "94";
  const digits = normalized.replace(/\D/g, "");

  if (digits.startsWith(countryCode)) {
    return `+${digits}`;
  }

  const local = digits.replace(/^0+/, "");
  return `+${countryCode}${local}`;
}
