import { cache } from "react";
import { unstable_cache } from "next/cache";
import { createAnonClient } from "@/lib/supabase/anon";
import type {
  BookedSlot,
  PublicBusinessContext,
} from "@/lib/booking";

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
    business: ctx.business,
    services: ctx.services ?? [],
    hours: ctx.hours ?? [],
  };
}

const getCachedPublicBusiness = (ref: string) =>
  unstable_cache(
    () => fetchPublicBusiness(ref),
    ["public-business", ref],
    { revalidate: 30 }
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
