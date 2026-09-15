import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ACCESS_COOKIE, ACCESS_COOKIE_VALUE } from "@/lib/access";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/brand") ||
    pathname.startsWith("/hooks") ||
    pathname.startsWith("/scripts") ||
    pathname.startsWith("/rules") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  if (pathname === "/unlock" || pathname === "/api/auth") {
    return NextResponse.next();
  }

  if (pathname === "/api/events" && request.method === "POST") {
    return NextResponse.next();
  }

  if (request.cookies.get(ACCESS_COOKIE)?.value === ACCESS_COOKIE_VALUE) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = request.nextUrl.clone();
  url.pathname = "/unlock";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
