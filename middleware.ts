import { NextRequest, NextResponse } from "next/server";
import { READER_COOKIE, READER_COOKIE_MAX_AGE } from "@/lib/reader-cookie";

/**
 * Issues the anonymous reader identity cookie and makes it visible to
 * downstream route handlers/server components on the same request (middleware
 * Set-Cookie alone would only reach the browser, one round-trip late).
 */
export function middleware(request: NextRequest) {
  const existing = request.cookies.get(READER_COOKIE)?.value;
  const readerId = existing ?? crypto.randomUUID();

  const requestHeaders = new Headers(request.headers);
  if (!existing) {
    const priorCookie = request.headers.get("cookie");
    requestHeaders.set(
      "cookie",
      priorCookie
        ? `${priorCookie}; ${READER_COOKIE}=${readerId}`
        : `${READER_COOKIE}=${readerId}`,
    );
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } });

  if (!existing) {
    response.cookies.set(READER_COOKIE, readerId, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: READER_COOKIE_MAX_AGE,
      secure: process.env.NODE_ENV === "production",
    });
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon).*)"],
};
