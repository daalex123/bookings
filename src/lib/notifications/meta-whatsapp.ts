import { toE164 } from "@/lib/notifications/phone-e164";

type MetaWhatsAppConfig = {
  token: string | undefined;
  phoneNumberId: string | undefined;
  apiVersion: string;
  language: string;
  useText: boolean;
  templates: {
    newBooking: string;
    cancelled: string;
    confirmed: string;
  };
};

function getMetaConfig(): MetaWhatsAppConfig {
  return {
    token: process.env.WHATSAPP_ACCESS_TOKEN,
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
    apiVersion: process.env.WHATSAPP_API_VERSION ?? "v22.0",
    language: process.env.WHATSAPP_TEMPLATE_LANGUAGE ?? "en",
    useText: process.env.WHATSAPP_USE_TEXT_MESSAGES === "true",
    templates: {
      newBooking:
        process.env.WHATSAPP_TEMPLATE_NEW_BOOKING ?? "booknow_new_booking",
      cancelled:
        process.env.WHATSAPP_TEMPLATE_BOOKING_CANCELLED ??
        "booknow_booking_cancelled",
      confirmed:
        process.env.WHATSAPP_TEMPLATE_BOOKING_CONFIRMED ??
        "booknow_booking_confirmed",
    },
  };
}

export function isWhatsAppConfigured(): boolean {
  const { token, phoneNumberId } = getMetaConfig();
  if (!token || !phoneNumberId) return false;
  if (isLikelyPhoneNumberNotId(phoneNumberId)) {
    console.error(
      "[notifications] WHATSAPP_PHONE_NUMBER_ID looks like a phone number (" +
        phoneNumberId +
        "). Use the numeric Phone number ID from Meta → WhatsApp → API Setup " +
        "(e.g. 7794189252778687), not the +1 display number."
    );
    return false;
  }
  return true;
}

/** Meta Phone number ID is a long numeric string, not E.164. */
function isLikelyPhoneNumberNotId(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.startsWith("+")) return true;
  if (/^0\d{7,14}$/.test(trimmed)) return true;
  // Display numbers are short; real IDs are typically 15+ digits
  if (/^\d{10,14}$/.test(trimmed)) return true;
  return false;
}

function toRecipient(phone: string): string | null {
  const e164 = toE164(phone);
  if (!e164) return null;
  return e164.replace(/^\+/, "");
}

function truncateParam(value: string, max = 900): string {
  const trimmed = value.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

async function postMessage(payload: Record<string, unknown>): Promise<boolean> {
  const { token, phoneNumberId, apiVersion } = getMetaConfig();
  if (!token || !phoneNumberId) {
    console.warn("[notifications] Meta WhatsApp not configured — skipping");
    return false;
  }

  if (isLikelyPhoneNumberNotId(phoneNumberId)) {
    console.error(
      "[notifications] WHATSAPP_PHONE_NUMBER_ID must be the numeric ID from " +
        "Meta API Setup, not the WhatsApp phone number. See README → Meta WhatsApp setup."
    );
    return false;
  }

  const response = await fetch(
    `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(
      "[notifications] Meta WhatsApp failed:",
      response.status,
      errorBody
    );
    return false;
  }

  return true;
}

export async function sendMetaWhatsAppText(
  to: string,
  body: string
): Promise<boolean> {
  const recipient = toRecipient(to);
  if (!recipient) {
    console.warn("[notifications] Invalid phone number for WhatsApp:", to);
    return false;
  }

  return postMessage({
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: recipient,
    type: "text",
    text: { body },
  });
}

export async function sendMetaWhatsAppTemplate(
  to: string,
  templateName: string,
  bodyParameters: string[]
): Promise<boolean> {
  const recipient = toRecipient(to);
  if (!recipient) {
    console.warn("[notifications] Invalid phone number for WhatsApp:", to);
    return false;
  }

  const { language } = getMetaConfig();
  const parameters = bodyParameters.map((text) => ({
    type: "text",
    text: truncateParam(text),
  }));

  return postMessage({
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: recipient,
    type: "template",
    template: {
      name: templateName,
      language: { code: language },
      components: [{ type: "body", parameters }],
    },
  });
}

export async function sendMetaWhatsAppTemplateOrText(
  to: string,
  templateName: string,
  bodyParameters: string[],
  textFallback: string
): Promise<boolean> {
  const { useText } = getMetaConfig();
  if (useText) {
    return sendMetaWhatsAppText(to, textFallback);
  }
  return sendMetaWhatsAppTemplate(to, templateName, bodyParameters);
}

export function getMetaWhatsAppTemplateNames() {
  return getMetaConfig().templates;
}
