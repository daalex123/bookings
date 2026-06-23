import type { NextRequest } from "next/server";
import { isBusinessAuthPath } from "@/lib/business-context";

const AUTH_ROUTES = ["/login", "/register"];
const PROTECTED_ROUTES = ["/dashboard", "/my-appointments", "/account"];

export function isAuthRoute(pathname: string): boolean {
  return (
    AUTH_ROUTES.some((route) => pathname === route) || isBusinessAuthPath(pathname)
  );
}

export function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTES.some((route) => pathname.startsWith(route));
}

export function hasSupabaseAuthCookie(request: NextRequest): boolean {
  return request.cookies
    .getAll()
    .some((cookie) => cookie.name.includes("auth-token"));
}

/** Public pages that never need middleware auth when the visitor is anonymous. */
export function isPublicAnonymousPath(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname.startsWith("/b/") ||
    pathname.startsWith("/book/") ||
    isAuthRoute(pathname) ||
    isBusinessAuthPath(pathname)
  );
}

export function middlewareNeedsAuth(request: NextRequest): boolean {
  const { pathname } = request.nextUrl;

  if (isProtectedRoute(pathname) || isAuthRoute(pathname)) {
    return true;
  }

  // Logged-in visitors on public booking pages: light session read only.
  if (hasSupabaseAuthCookie(request) && isPublicAnonymousPath(pathname)) {
    return true;
  }

  return false;
}
