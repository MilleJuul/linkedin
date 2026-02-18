import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { nextUrl } = req;

  const isAuthRoute = nextUrl.pathname.startsWith("/login");
  const isApiRoute = nextUrl.pathname.startsWith("/api");
  const isNext = nextUrl.pathname.startsWith("/_next");
  const isPublicFile =
    nextUrl.pathname === "/favicon.ico" || nextUrl.pathname === "/";

  // Lad offentlige routes igennem
  if (isAuthRoute || isApiRoute || isNext || isPublicFile) {
    return NextResponse.next();
  }

  // NextAuth v5 session cookie (typisk navn)
  const hasSession =
    req.cookies.get("__Secure-authjs.session-token") ||
    req.cookies.get("authjs.session-token") ||
    req.cookies.get("__Secure-next-auth.session-token") ||
    req.cookies.get("next-auth.session-token");

  if (!hasSession) {
    const loginUrl = new URL("/login", nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
