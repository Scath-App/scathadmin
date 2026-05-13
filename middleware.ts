import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Example basic protection - we can check for token in cookies if we switched to it
  // Since we're using localStorage for Zustand by default, Next.js middleware can't read it easily.
  // We'll rely on a client-side layout guard for the true check.
  // However, we can redirect from root to login or dashboard.

  if (pathname === "/") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
