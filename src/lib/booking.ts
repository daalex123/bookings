export type PublicBusiness = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  tagline: string | null;
  timezone: string;
  currency: string;
  logo_url: string | null;
  cover_image_url: string | null;
  brand_color: string;
  background_color: string;
  admin_background_color: string;
  booking_token: string;
  industry_category: string;
  booking_custom_fields: Array<{
    name: string;
    label: string;
    type: "text" | "number" | "email" | "tel" | "select" | "textarea";
    placeholder?: string;
    required?: boolean;
    options?: { value: string; label: string }[];
    description?: string;
  }> | null;
};

export type PublicService = {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  slot_interval_minutes: number;
  price: number;
  show_price: boolean;
  image_url: string | null;
  staff_names: string[];
};

export type PublicServiceAddon = {
  id: string;
  parent_service_id: string;
  name: string;
  description: string | null;
  price: number;
  show_price: boolean;
  image_url: string | null;
};

/** Whether customer-facing UI should display a service price. */
export function serviceShowsPrice(service: { show_price?: boolean }): boolean {
  return service.show_price !== false;
}

export type PublicBusinessHour = {
  day_of_week: number;
  open_time: string;
  close_time: string;
  is_closed: boolean;
};

export type PublicBusinessContext = {
  business: PublicBusiness;
  services: PublicService[];
  addons: PublicServiceAddon[];
  hours: PublicBusinessHour[];
};

export type BookedSlot = {
  start_at: string;
  end_at: string;
  status: string;
};

/** Friendly public URL: /b/my-salon */
export function bookingPagePathBySlug(slug: string): string {
  return `/b/${slug}`;
}

/** Private secure URL: /book/{token} */
export function bookingPagePathByToken(token: string): string {
  return `/book/${token}`;
}

/** Full public URL for the friendly slug booking page */
export function bookingPublicUrl(slug: string, siteUrl: string): string {
  const base = siteUrl.replace(/\/$/, "");
  return `${base}${bookingPagePathBySlug(slug)}`;
}

/** Schedule wizard path under the same URL style as the current page */
export function bookingFlowPath(basePath: string): string {
  if (basePath.startsWith("/b/")) {
    return `${basePath}/book`;
  }
  return `${basePath}/schedule`;
}

/** Booking flow URL with optional pre-selected service or date */
export function bookingFlowUrl(
  basePath: string,
  params?: { serviceId?: string; date?: string; time?: string }
): string {
  const flowPath = bookingFlowPath(basePath);
  const search = new URLSearchParams();
  if (params?.serviceId) search.set("service", params.serviceId);
  if (params?.date) search.set("date", params.date);
  if (params?.time) search.set("time", params.time);
  const query = search.toString();
  return query ? `${flowPath}?${query}` : flowPath;
}
