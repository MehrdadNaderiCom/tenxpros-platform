import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const authSecret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? process.env.SESSION_SECRET;

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // In production the site runs behind an HTTPS proxy, so the session cookie is
  // named `__Secure-authjs.session-token`. getToken must be told to use the secure
  // cookie name. Derive this from the actual/proxied request protocol rather than
  // NODE_ENV so a production build can also be verified safely over local HTTP.
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const secureCookie = forwardedProto === "https" || request.nextUrl.protocol === "https:";
  const token = await getToken({
    req: request,
    secret: authSecret,
    secureCookie,
  });

  if (pathname.startsWith("/portal")) {
    if (!token) return redirectToLogin(request);
  }

  if (pathname.startsWith("/admin")) {
    if (!token) return redirectToLogin(request);
  }

  // Middleware is only a coarse authentication gate. It cannot consult Prisma
  // in the Edge runtime, so it must never make an authorization decision from a
  // potentially stale role claim. Server templates, route handlers and actions
  // enforce the current database role before reading protected data.

  return NextResponse.next();
}

function redirectToLogin(request: NextRequest) {
  const url = new URL("/login", request.url);
  url.searchParams.set("callbackUrl", request.nextUrl.pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/portal/:path*", "/admin/:path*"],
};
