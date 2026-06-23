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

/** Only protected and auth routes need middleware session handling. */
export function middlewareNeedsAuth(request: NextRequest): boolean {
  const { pathname } = request.nextUrl;
  return isProtectedRoute(pathname) || isAuthRoute(pathname);
}
