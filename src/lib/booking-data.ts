import { cache } from "react";
import { unstable_cache } from "next/cache";
import { createAnonClient } from "@/lib/supabase/anon";
import {
  DEFAULT_ADMIN_BACKGROUND_COLOR,
  DEFAULT_BACKGROUND_COLOR,
  DEFAULT_BRAND_COLOR,
} from "@/lib/constants";
import type {
  BookedSlot,
  PublicBusinessContext,
} from "@/lib/booking";

export function publicBusinessCacheTag(ref: string): string {
  return `public-business-${ref}`;
}

async function fetchPublicBusiness(
  ref: string
): Promise<PublicBusinessContext | null> {
  const supabase = createAnonClient();
  const { data, error } = await supabase.rpc("get_public_business", {
    p_token: ref,
  });

  if (error || !data) return null;

  const ctx = data as PublicBusinessContext;
  if (!ctx.business) return null;

  return {
    business: {
      ...ctx.business,
      brand_color: ctx.business.brand_color || DEFAULT_BRAND_COLOR,
      background_color:
        ctx.business.background_color || DEFAULT_BACKGROUND_COLOR,
      admin_background_color:
        ctx.business.admin_background_color || DEFAULT_ADMIN_BACKGROUND_COLOR,
    },
    services: (ctx.services ?? []).map((s) => ({
      ...s,
      show_price: s.show_price !== false,
    })),
    addons: (ctx.addons ?? []).map((a) => ({
      ...a,
      show_price: a.show_price !== false,
    })),
    hours: ctx.hours ?? [],
  };
}

const getCachedPublicBusiness = (ref: string) =>
  unstable_cache(
    () => fetchPublicBusiness(ref),
    ["public-business", ref],
    { revalidate: 30, tags: [publicBusinessCacheTag(ref)] }
  )();

/** Load booking page data by slug or secure token (cached per ref for 30s). */
export const getPublicBusiness = cache(async (ref: string) => {
  return getCachedPublicBusiness(ref);
});

export async function getPublicBookedSlots(
  ref: string,
  dayStart: Date,
  dayEnd: Date
): Promise<BookedSlot[]> {
  const supabase = createAnonClient();
  const { data, error } = await supabase.rpc("get_public_booked_slots", {
    p_token: ref,
    p_start: dayStart.toISOString(),
    p_end: dayEnd.toISOString(),
  });

  if (error || !data) return [];
  return data as BookedSlot[];
}
