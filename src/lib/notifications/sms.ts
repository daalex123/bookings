import { normalizePhone } from "@/lib/phone";

function toE164(phone: string): string | null {
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

export async function sendSms(to: string, body: string): Promise<boolean> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;

  if (!sid || !token || !from) {
    console.warn("[notifications] Twilio not configured — skipping SMS");
    return false;
  }

  const e164 = toE164(to);
  if (!e164) {
    console.warn("[notifications] Invalid phone number for SMS:", to);
    return false;
  }

  const auth = Buffer.from(`${sid}:${token}`).toString("base64");
  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: e164,
        From: from,
        Body: body,
      }),
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("[notifications] SMS failed:", response.status, errorBody);
    return false;
  }

  return true;
}
