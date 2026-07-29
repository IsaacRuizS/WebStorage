import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/token";

const PUBLIC_PREFIXES = ["/auth", "/share"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const isAuthenticated = token ? await isValidToken(token) : false;

  if (!isAuthenticated && !isPublic) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  if (isAuthenticated && pathname.startsWith("/auth")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

// Solo valida la firma, la vigencia real de la sesión se revisa contra la base de datos
async function isValidToken(token: string) {
  try {
    await verifySessionToken(token);
    return true;
  } catch {
    return false;
  }
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
