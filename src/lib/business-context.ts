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
