import { toE164 } from "@/lib/notifications/phone-e164";

/** Sends an SMS via TextBee (Android SMS gateway). Used for both customer and business SMS. */
async function sendTextBeeSms(to: string, message: string): Promise<boolean> {
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
    console.warn("[notifications] Invalid phone number for SMS:", to);
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

/** Send SMS to a customer (booking confirmations, status updates). */
export async function sendSms(to: string, body: string): Promise<boolean> {
  return sendTextBeeSms(to, body);
}

/** Send SMS to a business owner/admin (new booking + status alerts). */
export async function sendBusinessAdminSms(
  to: string,
  message: string
): Promise<boolean> {
  return sendTextBeeSms(to, message);
}
