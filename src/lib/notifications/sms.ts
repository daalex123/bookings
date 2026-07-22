import { toE164 } from "@/lib/notifications/phone-e164";

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

export async function sendBusinessAdminSms(
  to: string,
  message: string
): Promise<boolean> {
  const apiKey = process.env.TEXTBEE_API_KEY;
  const deviceId = process.env.TEXTBEE_DEVICE_ID;
  const simSubscriptionId = process.env.TEXTBEE_SIM_SUBSCRIPTION_ID;

  if (!apiKey || !deviceId) {
    console.warn(
      "[notifications] TextBee not configured — set TEXTBEE_API_KEY and TEXTBEE_DEVICE_ID"
    );
    return false;
  }

  const recipient = toE164(to);
  if (!recipient) {
    console.warn("[notifications] Invalid phone number for TextBee SMS:", to);
    return false;
  }

  const payload: {
    recipients: string[];
    message: string;
    simSubscriptionId?: number;
  } = {
    recipients: [recipient],
    message,
  };

  if (simSubscriptionId) {
    const parsed = Number(simSubscriptionId);
    if (Number.isFinite(parsed)) {
      payload.simSubscriptionId = parsed;
    }
  }

  const response = await fetch(
    `https://api.textbee.dev/api/v1/gateway/devices/${deviceId}/send-sms`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(
      "[notifications] TextBee SMS failed:",
      response.status,
      errorBody
    );
    return false;
  }

  return true;
}
