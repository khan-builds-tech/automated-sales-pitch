import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApi = pathname.startsWith("/api");

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = verifySession(token);

  if (!session) {
    if (isApi) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (session.status !== "approved") {
    if (isApi) {
      return NextResponse.json({ error: "Not approved" }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/pending", request.url));
  }

  const isAdminArea =
    pathname.startsWith("/admin") || pathname.startsWith("/api/admin");
  if (isAdminArea && session.role !== "admin") {
    if (isApi) {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!login|pending|api/auth|_next/static|_next/image|favicon\\.ico).*)",
  ],
};
