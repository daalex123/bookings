import { toE164 } from "@/lib/notifications/phone-e164";

type MetaWhatsAppConfig = {
  token: string | undefined;
  phoneNumberId: string | undefined;
  apiVersion: string;
  language: string;
  deliveryMode: "alert" | "structured" | "text" | "hello_world";
  alertTemplate: string;
  templates: {
    newBooking: string;
    cancelled: string;
    confirmed: string;
  };
};

function getDeliveryMode(): MetaWhatsAppConfig["deliveryMode"] {
  const mode = process.env.WHATSAPP_DELIVERY_MODE?.trim();
  if (
    mode === "structured" ||
    mode === "alert" ||
    mode === "text" ||
    mode === "hello_world"
  ) {
    return mode;
  }
  return "hello_world";
}

function getMetaConfig(): MetaWhatsAppConfig {
  return {
    token: process.env.WHATSAPP_ACCESS_TOKEN?.trim(),
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID?.trim(),
    apiVersion: process.env.WHATSAPP_API_VERSION ?? "v25.0",
    language: process.env.WHATSAPP_TEMPLATE_LANGUAGE ?? "en_US",
    deliveryMode: getDeliveryMode(),
    alertTemplate: process.env.WHATSAPP_ALERT_TEMPLATE ?? "booknow_alert",
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

/** Meta Phone number ID is a long numeric string, not E.164 or an access token. */
function isLikelyPhoneNumberNotId(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.startsWith("+")) return true;
  if (trimmed.startsWith("EAA") || trimmed.startsWith("EAAG")) return true;
  if (/^0\d{7,14}$/.test(trimmed)) return true;
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

async function postMessage(
  payload: Record<string, unknown>
): Promise<{ ok: boolean; status: number; body: string }> {
  const { token, phoneNumberId, apiVersion } = getMetaConfig();
  if (!token || !phoneNumberId) {
    console.warn("[notifications] Meta WhatsApp not configured — skipping");
    return { ok: false, status: 0, body: "not configured" };
  }

  if (isLikelyPhoneNumberNotId(phoneNumberId)) {
    console.error(
      "[notifications] WHATSAPP_PHONE_NUMBER_ID must be the numeric ID from " +
      "Meta API Setup, not the WhatsApp phone number. See README → Meta WhatsApp setup."
    );
    return { ok: false, status: 0, body: "invalid phone number id" };
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

  const body = await response.text();
  if (!response.ok) {
    const hint = body.includes('"code":190') || response.status === 401
      ? " — regenerate WHATSAPP_ACCESS_TOKEN in Meta → WhatsApp → API Setup and restart the server"
      : body.includes("131047") || body.includes("24 hour")
        ? " — recipient must message your WhatsApp test number within the last 24 hours for plain text"
        : body.includes("131030")
          ? " — add recipient to Meta API Setup test list"
          : "";
    console.error(
      "[notifications] Meta WhatsApp failed:",
      response.status,
      body,
      payload.type === "template"
        ? `(template: ${(payload.template as { name?: string })?.name})`
        : "",
      hint
    );
  } else {
    let statusNote = "";
    try {
      const parsed = JSON.parse(body) as {
        messages?: Array<{ message_status?: string }>;
      };
      const status = parsed.messages?.[0]?.message_status;
      if (status) statusNote = ` (${status})`;
    } catch {
      /* ignore */
    }
    console.info(
      "[notifications] Meta WhatsApp sent:",
      payload.type,
      "to",
      payload.to + statusNote
    );
  }
  return { ok: response.ok, status: response.status, body };
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

  const result = await postMessage({
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: recipient,
    type: "text",
    text: { body },
  });
  return result.ok;
}

export async function sendMetaWhatsAppTemplate(
  to: string,
  templateName: string,
  bodyParameters: string[]
): Promise<{ ok: boolean; status: number; body: string }> {
  const recipient = toRecipient(to);
  if (!recipient) {
    console.warn("[notifications] Invalid phone number for WhatsApp:", to);
    return { ok: false, status: 0, body: "invalid recipient" };
  }

  const { language } = getMetaConfig();
  const template: Record<string, unknown> = {
    name: templateName,
    language: { code: language },
  };

  if (bodyParameters.length > 0) {
    template.components = [
      {
        type: "body",
        parameters: bodyParameters.map((text) => ({
          type: "text",
          text: truncateParam(text),
        })),
      },
    ];
  }

  const result = await postMessage({
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: recipient,
    type: "template",
    template,
  });
  return result;
}

function isMissingTemplateError(body: string): boolean {
  return body.includes("132001") || body.includes("does not exist in");
}

export async function sendMetaWhatsAppTemplateOrText(
  to: string,
  templateName: string,
  bodyParameters: string[],
  textFallback: string
): Promise<boolean> {
  const { deliveryMode, alertTemplate } = getMetaConfig();

  if (deliveryMode === "hello_world") {
    const ping = await sendMetaWhatsAppTemplate(to, "hello_world", []);
    if (!ping.ok) return false;

    const includeDetails =
      process.env.WHATSAPP_HELLO_WORLD_SEND_DETAILS !== "false";
    if (includeDetails) {
      const details = await sendMetaWhatsAppText(to, textFallback);
      if (details) {
        console.info(
          "[notifications] hello_world sent (no 24h window needed) + booking details text queued"
        );
      } else {
        console.info(
          "[notifications] hello_world sent — details text needs 24h window (template messages do not)"
        );
      }
      return true;
    }

    console.info(
      "[notifications] hello_world sent (no 24h window) — check dashboard for details"
    );
    return true;
  }

  if (deliveryMode === "text") {
    const ok = await sendMetaWhatsAppText(to, textFallback);
    if (ok) {
      console.info(
        "[notifications] Plain-text WhatsApp queued — delivers only if this number " +
        "messaged your platform WhatsApp within the last 24 hours (Meta rule, no template)"
      );
    }
    return ok;
  }

  if (deliveryMode === "structured") {
    const templateResult = await sendMetaWhatsAppTemplate(
      to,
      templateName,
      bodyParameters
    );
    if (templateResult.ok) return true;
    if (isMissingTemplateError(templateResult.body)) {
      console.warn(
        `[notifications] Template "${templateName}" unavailable — trying alert template`
      );
      const alertResult = await sendMetaWhatsAppTemplate(to, alertTemplate, [
        textFallback,
      ]);
      if (alertResult.ok) return true;
      if (isMissingTemplateError(alertResult.body)) {
        const ping = await sendMetaWhatsAppTemplate(to, "hello_world", []);
        return ping.ok;
      }
    }
    return false;
  }

  // alert mode (default): one-variable template with full booking text — delivers reliably
  const alertResult = await sendMetaWhatsAppTemplate(to, alertTemplate, [
    textFallback,
  ]);
  if (alertResult.ok) return true;

  if (isMissingTemplateError(alertResult.body)) {
    console.warn(
      `[notifications] Alert template "${alertTemplate}" not found — trying hello_world`
    );
    const ping = await sendMetaWhatsAppTemplate(to, "hello_world", []);
    if (ping.ok) {
      console.warn(
        "[notifications] Sent hello_world ping only — create template " +
        `"${alertTemplate}" in Meta for full booking details, or plain text requires 24h window`
      );
      return true;
    }
    console.warn("[notifications] Falling back to plain text (may not deliver)");
    return sendMetaWhatsAppText(to, textFallback);
  }

  return false;
}

export function getMetaWhatsAppTemplateNames() {
  return getMetaConfig().templates;
}
