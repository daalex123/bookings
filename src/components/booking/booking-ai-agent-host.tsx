import { headers } from "next/headers";
import { getActiveBusinessPath } from "@/lib/business-context";
import { businessAuthPath, safeRedirectPath } from "@/lib/business-context";
import { getPublicBusiness } from "@/lib/booking-data";
import { isAiConfigured } from "@/lib/ai/nim-client";
import { getCurrentUser } from "@/lib/supabase/auth";
import { BookingAiAgent } from "@/components/booking/booking-ai-agent";

function bookingRefFromPath(path: string): string | null {
  const slugMatch = path.match(/^\/b\/([^/]+)/);
  if (slugMatch) return slugMatch[1];
  const tokenMatch = path.match(/^\/book\/([^/]+)/);
  if (tokenMatch) return tokenMatch[1];
  return null;
}

export async function BookingAiAgentHost() {
  if (!isAiConfigured()) return null;

  const headersList = await headers();
  const pathname = headersList.get("x-pathname") ?? "";
  const homePath = (await getActiveBusinessPath()) ?? "/";
  const bookingRef =
    bookingRefFromPath(pathname) ?? bookingRefFromPath(homePath);

  if (!bookingRef) return null;

  const [ctx, user] = await Promise.all([
    getPublicBusiness(bookingRef),
    getCurrentUser(),
  ]);

  if (!ctx?.business || !ctx.services.length) return null;

  const redirectTo = safeRedirectPath(pathname || homePath);
  const loginHref = `${businessAuthPath(homePath, "login")}?redirect=${encodeURIComponent(redirectTo)}`;

  return (
    <BookingAiAgent
      bookingRef={bookingRef}
      businessName={ctx.business.name}
      loginHref={loginHref}
      isGuest={!user}
    />
  );
}
