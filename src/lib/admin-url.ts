import { absoluteUrl } from "@/lib/site-url";

/** Absolute URL to a business admin dashboard — used for admin app QR codes. */
export function adminDashboardUrl(businessId: string, siteUrl: string): string {
  return absoluteUrl(siteUrl, `/dashboard/${businessId}`);
}
