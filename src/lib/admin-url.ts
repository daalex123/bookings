import { absoluteUrl } from "@/lib/urls";

const BUSINESS_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Absolute URL to a business admin dashboard — used for admin app QR codes. */
export function adminDashboardUrl(businessId: string, siteUrl: string): string {
  return absoluteUrl(siteUrl, `/dashboard/${businessId}`);
}

export function dashboardBusinessId(pathname: string): string | null {
  const match = pathname.match(/^\/dashboard\/([^/]+)/);
  const id = match?.[1];
  if (!id || !BUSINESS_UUID.test(id)) return null;
  return id;
}
