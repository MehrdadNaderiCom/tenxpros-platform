import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import {
  buildContentSecurityPolicy,
  generateContentSecurityPolicyNonce,
} from "@/lib/security-headers";

const authSecret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? process.env.SESSION_SECRET;

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const secureRequest = forwardedProto === "https" || request.nextUrl.protocol === "https:";
  const nonce = generateContentSecurityPolicyNonce();
  const contentSecurityPolicy = buildContentSecurityPolicy(nonce, {
    development: process.env.NODE_ENV === "development",
    // The public production request is HTTPS. Omitting this directive for a
    // direct local HTTP smoke test avoids rewriting its own assets to HTTPS.
    upgradeInsecureRequests: secureRequest,
  });
  const requestHeaders = new Headers(request.headers);

  // Always overwrite client-supplied values. Next.js reads the CSP request
  // header during dynamic rendering and applies this nonce to its own scripts.
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", contentSecurityPolicy);

  const protectedPath =
    pathname === "/portal" ||
    pathname.startsWith("/portal/") ||
    pathname === "/admin" ||
    pathname.startsWith("/admin/");

  if (protectedPath) {
    // In production the site runs behind an HTTPS proxy, so the session cookie
    // is named `__Secure-authjs.session-token`. Public requests never pay the
    // cost of decoding an auth token after the CSP matcher is broadened.
    const token = await getToken({
      req: request,
      secret: authSecret,
      secureCookie: secureRequest,
    });
    if (!token) {
      return withContentSecurityPolicy(
        redirectToLogin(request),
        contentSecurityPolicy,
      );
    }
  }

  // Middleware is only a coarse authentication gate. It cannot consult Prisma
  // in the Edge runtime, so it must never make an authorization decision from a
  // potentially stale role claim. Server templates, route handlers and actions
  // enforce the current database role before reading protected data.

  return withContentSecurityPolicy(
    NextResponse.next({ request: { headers: requestHeaders } }),
    contentSecurityPolicy,
  );
}

function withContentSecurityPolicy(
  response: NextResponse,
  contentSecurityPolicy: string,
): NextResponse {
  response.headers.set("Content-Security-Policy", contentSecurityPolicy);
  return response;
}

function redirectToLogin(request: NextRequest) {
  const url = new URL("/login", request.url);
  url.searchParams.set("callbackUrl", request.nextUrl.pathname);
  return NextResponse.redirect(url);
}

export const config = {
  // API and immutable framework assets do not render HTML and receive the
  // catch-all static headers from next.config.mjs instead.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
