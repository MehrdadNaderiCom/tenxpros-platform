import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const authSecret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? process.env.SESSION_SECRET;

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // In production the site runs behind an HTTPS proxy, so the session cookie is
  // named `__Secure-authjs.session-token`. getToken must be told to use the secure
  // cookie name, otherwise it reads the wrong cookie, returns null, and every
  // protected route redirects to /login even for a valid session.
  const token = await getToken({
    req: request,
    secret: authSecret,
    secureCookie: process.env.NODE_ENV === "production",
  });

  if (pathname.startsWith("/portal")) {
    if (!token) return redirectToLogin(request);
    if (!["PARTICIPANT", "COACH", "ADMIN"].includes(String(token.role))) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  if (pathname.startsWith("/admin")) {
    if (!token) return redirectToLogin(request);
    if (token.role !== "ADMIN") {
      return NextResponse.rewrite(new URL("/404", request.url));
    }
  }

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
