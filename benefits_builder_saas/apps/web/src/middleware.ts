// Next.js Middleware - Authentication Gate
// Protects all routes except login page
// Enforces role-based access control for reps and clients

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { validateSession } from "./lib/auth";

const SESSION_COOKIE_NAME = "bb_session";

// Routes that don't require authentication
const PUBLIC_ROUTES = [
  "/login",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/quickbooks/callback",  // QuickBooks OAuth callback
];

// Routes that reps CAN access (all other routes are blocked for reps)
const REP_ALLOWED_ROUTES = [
  "/companies",
  "/proposals",
  "/api/companies",
  "/api/proposals",
  "/api/employees",
  "/api/auth",
];

// Check if a route is allowed for reps
function isRepAllowedRoute(pathname: string): boolean {
  return REP_ALLOWED_ROUTES.some(route =>
    pathname === route || pathname.startsWith(route + "/")
  );
}

// Check if a route is allowed for clients (company owners/executives)
// Clients can ONLY access their single assigned company and its employees
function isClientAllowedRoute(pathname: string, assignedCompanyId: string | null): boolean {
  if (!assignedCompanyId) return false;

  // Auth routes always allowed
  if (pathname.startsWith("/api/auth")) return true;

  // Allow access to their specific company page and sub-routes
  if (pathname === `/companies/${assignedCompanyId}` ||
      pathname.startsWith(`/companies/${assignedCompanyId}/`)) {
    return true;
  }

  // Allow employee API access for their company
  if (pathname.startsWith("/api/employees")) return true;

  // Allow companies API access (will be filtered server-side)
  if (pathname === "/api/companies" || pathname === `/api/companies/${assignedCompanyId}`) {
    return true;
  }

  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (PUBLIC_ROUTES.includes(pathname)) {
    return NextResponse.next();
  }

  // Allow public assets
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/static")
  ) {
    return NextResponse.next();
  }

  // Check for session cookie
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) {
    // No session, redirect to login
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Validate session
  const user = await validateSession(sessionToken);

  if (!user) {
    // Invalid session, redirect to login
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    const response = NextResponse.redirect(loginUrl);

    // Clear invalid session cookie
    response.cookies.delete(SESSION_COOKIE_NAME);

    return response;
  }

  // Role-based access control for clients (company owners/executives)
  // They can ONLY see their single assigned company
  if (user.role === "client") {
    if (!isClientAllowedRoute(pathname, user.assigned_company_id || null)) {
      // Redirect clients to their company page
      if (user.assigned_company_id) {
        return NextResponse.redirect(new URL(`/companies/${user.assigned_company_id}`, request.url));
      }
      // No assigned company, redirect to login with error
      return NextResponse.redirect(new URL("/login?error=no_company", request.url));
    }
  }

  // Role-based access control for reps
  if (user.role === "rep") {
    // Check if this route is allowed for reps
    if (!isRepAllowedRoute(pathname)) {
      // Redirect reps to companies page if they try to access unauthorized routes
      return NextResponse.redirect(new URL("/companies", request.url));
    }
  }

  // Valid session and authorized, continue
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
