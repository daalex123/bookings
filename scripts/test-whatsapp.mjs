/**
 * Quick WhatsApp connectivity test (Meta Cloud API).
 * Usage: npm run whatsapp:test
 * Optional: npm run whatsapp:test -- 94771234567
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  try {
    const content = readFileSync(path, "utf8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    console.error("Could not read .env.local");
    process.exit(1);
  }
}

loadEnvLocal();

const token = process.env.WHATSAPP_ACCESS_TOKEN;
const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
const apiVersion = process.env.WHATSAPP_API_VERSION ?? "v25.0";
const mode = process.argv.includes("--template") ? "template" : "text";
const to = process.argv.find((a) => /^\d+$/.test(a)) ?? "94777444690";

if (!token || !phoneNumberId) {
  console.error("Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID in .env.local");
  process.exit(1);
}

if (phoneNumberId.startsWith("EAA")) {
  console.error("WHATSAPP_PHONE_NUMBER_ID looks like a token — swap env vars.");
  process.exit(1);
}

const base = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}`;

const verify = await fetch(`${base}?fields=id,display_phone_number`, {
  headers: { Authorization: `Bearer ${token}` },
});
const verifyJson = await verify.json();
console.log("Sender:", verify.ok ? verifyJson : verifyJson);

const sampleText = `📅 New booking — Test Salon

Customer: John Doe
Phone: 0777444690
Service: Haircut (30 min)
When: Friday, 27 June 2026, 2:00 PM – 2:30 PM
Price: LKR 2,500`;

const payload =
  mode === "template"
    ? {
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: { name: "hello_world", language: { code: "en_US" } },
      }
    : {
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: sampleText },
      };

const send = await fetch(`${base}/messages`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(payload),
});
const sendJson = await send.json();
console.log(`Send (${mode}) to`, to + ":", send.ok ? "OK" : "FAILED", sendJson);

process.exit(send.ok ? 0 : 1);
