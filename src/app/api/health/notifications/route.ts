import { NextResponse } from "next/server";
import { hasAdminClient, createAdminClient } from "@/lib/supabase/admin";
import { isWhatsAppConfigured } from "@/lib/notifications/whatsapp";
import { sendMetaWhatsAppTemplate } from "@/lib/notifications/meta-whatsapp";

export const dynamic = "force-dynamic";

async function checkMetaToken() {
  const token = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  const apiVersion = process.env.WHATSAPP_API_VERSION?.trim() ?? "v25.0";
  if (!token) return { valid: false, error: "WHATSAPP_ACCESS_TOKEN missing" };

  const res = await fetch(
    `https://graph.facebook.com/${apiVersion}/debug_token?input_token=${encodeURIComponent(token)}&access_token=${encodeURIComponent(token)}`,
    { cache: "no-store" }
  );
  const json = await res.json();
  const data = json.data;
  if (!data?.is_valid) {
    return { valid: false, error: data?.error?.message ?? "invalid token" };
  }

  const expiresAt = data.expires_at;
  const expired =
    typeof expiresAt === "number" && expiresAt > 0 && expiresAt * 1000 < Date.now();

  return {
    valid: !expired,
    type: data.type as string,
    expiresAt: expiresAt === 0 ? "never" : new Date(expiresAt * 1000).toISOString(),
    expired,
    scopes: (data.scopes as string[] | undefined) ?? [],
  };
}

async function checkMetaPhoneNumber() {
  const token = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  const apiVersion = process.env.WHATSAPP_API_VERSION?.trim() ?? "v25.0";
  if (!token || !phoneNumberId) {
    return { ok: false, error: "token or phone number id missing" };
  }

  const res = await fetch(
    `https://graph.facebook.com/${apiVersion}/${phoneNumberId}?fields=id,display_phone_number`,
    { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
  );
  const json = await res.json();
  if (!res.ok) {
    return { ok: false, error: json.error?.message ?? res.statusText };
  }
  return { ok: true, id: json.id, displayPhoneNumber: json.display_phone_number };
}

/** GET — config + live Meta API checks (no secrets exposed). */
export async function GET() {
  const [tokenCheck, phoneCheck] = await Promise.all([
    checkMetaToken(),
    checkMetaPhoneNumber(),
  ]);

  const whatsapp = {
    accessTokenSet: Boolean(process.env.WHATSAPP_ACCESS_TOKEN?.trim()),
    phoneNumberIdSet: Boolean(process.env.WHATSAPP_PHONE_NUMBER_ID?.trim()),
    configured: isWhatsAppConfigured(),
    deliveryMode: process.env.WHATSAPP_DELIVERY_MODE?.trim() ?? "hello_world",
    apiVersion: process.env.WHATSAPP_API_VERSION?.trim() ?? "v25.0",
    token: tokenCheck,
    phoneNumber: phoneCheck,
  };

  const metaLiveOk = tokenCheck.valid === true && phoneCheck.ok === true;

  return NextResponse.json({
    supabaseServiceRole: hasAdminClient(),
    resend: Boolean(process.env.RESEND_API_KEY?.trim()),
    emailFrom: Boolean(process.env.EMAIL_FROM?.trim()),
    whatsapp,
    ready: hasAdminClient() && isWhatsAppConfigured() && metaLiveOk,
    hint: !metaLiveOk
      ? "Fix Meta token or phone number ID on Vercel, then redeploy."
      : undefined,
  });
}

/**
 * POST — send test hello_world from Vercel (debug).
 * Body: { "to": "94777444690", "secret": "your NOTIFICATIONS_TEST_SECRET" }
 */
export async function POST(request: Request) {
  const secret = process.env.NOTIFICATIONS_TEST_SECRET?.trim();
  if (!secret) {
    return NextResponse.json(
      { error: "Set NOTIFICATIONS_TEST_SECRET on Vercel to enable test sends" },
      { status: 503 }
    );
  }

  let body: { to?: string; secret?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.secret !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const to = body.to?.trim();
  if (!to) {
    return NextResponse.json({ error: "Missing to" }, { status: 400 });
  }

  const result = await sendMetaWhatsAppTemplate(to, "hello_world", []);
  return NextResponse.json({
    ok: result.ok,
    status: result.status,
    meta: result.ok ? undefined : result.body,
  });
}

/** PATCH — list businesses with WhatsApp numbers (debug). */
export async function PATCH(request: Request) {
  const secret = process.env.NOTIFICATIONS_TEST_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ error: "NOTIFICATIONS_TEST_SECRET not set" }, { status: 503 });
  }

  let body: { secret?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (body.secret !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasAdminClient()) {
    return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY missing" }, { status: 503 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("businesses")
    .select("id, name, contact_whatsapp")
    .not("contact_whatsapp", "is", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ businesses: data ?? [] });
}
