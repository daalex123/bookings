import { cookies } from "next/headers";

export const BUSINESS_CONTEXT_COOKIE = "bn_active_business";

export const BUSINESS_CONTEXT_COOKIE_OPTIONS = {
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
  sameSite: "lax" as const,
};

/** Only allow same-site relative paths as redirect targets */
export function safeRedirectPath(
  path: string | null | undefined,
  fallback = "/"
): string {
  if (!path || !path.startsWith("/") || path.startsWith("//")) {
    return fallback;
  }
  return path;
}

export function businessAuthPath(
  businessPath: string,
  type: "login" | "register"
): string {
  return `${businessPath}/${type}`;
}

export function isBusinessAuthPath(pathname: string): boolean {
  return /^\/(?:b\/[^/]+|book\/[^/]+)\/(login|register)$/.test(pathname);
}

export function authPathForContext(
  businessPath: string | null | undefined,
  type: "login" | "register"
): string {
  if (businessPath) {
    return businessAuthPath(businessPath, type);
  }
  return `/${type}`;
}

/** Build login/register URL, preferring business-scoped paths when possible */
export function authUrl(
  type: "login" | "register",
  redirectTo: string,
  extra?: Record<string, string>
): string {
  const pathOnly = redirectTo.split("?")[0];
  const businessPath = businessPathFromPathname(pathOnly);
  const base = authPathForContext(businessPath, type);
  const params = new URLSearchParams({ redirect: redirectTo, ...extra });
  return `${base}?${params}`;
}

/** Derive the persisted business path from a request pathname */
export function businessPathFromPathname(pathname: string): string | null {
  const slugMatch = pathname.match(/^\/b\/([^/]+)(?:\/|$)/);
  if (slugMatch) {
    return `/b/${slugMatch[1]}`;
  }

  const bookMatch = pathname.match(/^\/book\/([^/]+)(?:\/|$)/);
  if (bookMatch) {
    return `/book/${bookMatch[1]}`;
  }

  return null;
}

export async function getActiveBusinessPath(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(BUSINESS_CONTEXT_COOKIE)?.value ?? null;
}
