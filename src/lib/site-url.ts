import { headers } from "next/headers";

function isLocalHost(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.startsWith("192.168.") ||
    hostname.startsWith("10.") ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
  );
}

/**
 * Public origin for the current request — booking links, QR codes, auth redirects.
 * Derived from request headers (supports localhost, LAN IPs, and production proxies).
 * Set NEXT_PUBLIC_SITE_URL only when you need a fixed canonical URL (optional).
 */
export async function getSiteUrl(): Promise<string> {
  const override = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (override) {
    return override.replace(/\/$/, "");
  }

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (host) {
    const hostname = host.split(":")[0] ?? host;
    const proto =
      h.get("x-forwarded-proto") ?? (isLocalHost(hostname) ? "http" : "https");
    return `${proto}://${host}`.replace(/\/$/, "");
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`.replace(/\/$/, "");
  }

  return "http://localhost:3000";
}

/** Build an absolute URL from a site origin and path */
export function absoluteUrl(siteUrl: string, path: string): string {
  const base = siteUrl.replace(/\/$/, "");
  return path.startsWith("/") ? `${base}${path}` : `${base}/${path}`;
}
