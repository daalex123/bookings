import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  BUSINESS_CONTEXT_COOKIE,
  BUSINESS_CONTEXT_COOKIE_OPTIONS,
  businessPathFromPathname,
  safeRedirectPath,
} from "@/lib/business-context";
import {
  hasSupabaseAuthCookie,
  isAuthRoute,
  isProtectedRoute,
  isPublicAnonymousPath,
} from "@/lib/supabase/middleware-auth";

function applyBusinessContextCookie(
  request: NextRequest,
  response: NextResponse
): NextResponse {
  const { pathname } = request.nextUrl;

  if (pathname === "/") {
    if (request.cookies.has(BUSINESS_CONTEXT_COOKIE)) {
      response.cookies.delete(BUSINESS_CONTEXT_COOKIE);
    }
    return response;
  }

  const businessPath = businessPathFromPathname(pathname);
  if (businessPath) {
    response.cookies.set(
      BUSINESS_CONTEXT_COOKIE,
      businessPath,
      BUSINESS_CONTEXT_COOKIE_OPTIONS
    );
  }

  return response;
}

function isBookingExperience(request: NextRequest): boolean {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/b/") || pathname.startsWith("/book/")) return true;
  if (
    request.cookies.has(BUSINESS_CONTEXT_COOKIE) &&
    (pathname === "/my-appointments" || pathname === "/account")
  ) {
    return true;
  }
  return false;
}

function isDashboardExperience(pathname: string): boolean {
  return pathname.startsWith("/dashboard");
}

function withRouteHeaders(
  request: NextRequest,
  response: NextResponse
): NextResponse {
  if (isBookingExperience(request)) {
    response.headers.set("x-booking-route", "1");
  }
  if (isDashboardExperience(request.nextUrl.pathname)) {
    response.headers.set("x-dashboard-route", "1");
  }
  return response;
}

function fastResponse(request: NextRequest): NextResponse {
  return withRouteHeaders(
    request,
    applyBusinessContextCookie(request, NextResponse.next({ request }))
  );
}

export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Anonymous visitors on public pages: skip Supabase entirely (~200–500ms saved).
  if (
    isPublicAnonymousPath(pathname) &&
    !hasSupabaseAuthCookie(request)
  ) {
    if (isProtectedRoute(pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }
    return fastResponse(request);
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getSession reads the cookie locally; getUser hits the Auth API every time.
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user ?? null;

  if (user && isAuthRoute(pathname)) {
    const url = request.nextUrl.clone();
    const redirectParam = url.searchParams.get("redirect");
    const activeBusiness = request.cookies.get(BUSINESS_CONTEXT_COOKIE)?.value;
    const destination = safeRedirectPath(
      redirectParam ?? activeBusiness ?? null
    );
    url.pathname = destination;
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (!user && isProtectedRoute(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  return withRouteHeaders(
    request,
    applyBusinessContextCookie(request, supabaseResponse)
  );
}
