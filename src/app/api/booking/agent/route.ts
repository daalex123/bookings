import { NextResponse } from "next/server";
import { z } from "zod";
import { runBookingAgent } from "@/lib/ai/booking-agent";
import { isAiConfigured } from "@/lib/ai/nim-client";
import { getPublicBusiness } from "@/lib/booking-data";
import { createClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  bookingRef: z.string().min(1),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(4000),
      })
    )
    .min(1)
    .max(40),
});

export async function POST(request: Request) {
  if (!isAiConfigured()) {
    return NextResponse.json(
      { error: "AI assistant is not configured" },
      { status: 503 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Please sign in to use the booking assistant" },
      { status: 401 }
    );
  }

  let body: z.infer<typeof bodySchema>;
  try {
    const json = await request.json();
    body = bodySchema.parse(json);
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const ctx = await getPublicBusiness(body.bookingRef);
  if (!ctx) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  if (!ctx.services.length) {
    return NextResponse.json(
      { error: "No bookable services available" },
      { status: 400 }
    );
  }

  try {
    const result = await runBookingAgent(
      body.bookingRef,
      ctx,
      user.id,
      body.messages
    );

    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("[booking-agent]", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Assistant is temporarily unavailable",
      },
      { status: 502 }
    );
  }
}
