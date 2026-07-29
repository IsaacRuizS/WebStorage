import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/token";
import type { SessionPayload } from "@/types/session";

const PUBLIC_PREFIXES = ["/auth", "/share"];
const GUEST_ONLY_PATHS = ["/auth/login", "/auth/register", "/auth/forgot-password"];
const CHANGE_PASSWORD_PATH = "/auth/change-password";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const payload = token ? await readSessionPayload(token) : null;

  if (!payload) {
    return isPublic ? NextResponse.next() : redirectTo("/auth/login", request);
  }

  // Con contraseña temporal el usuario no puede navegar a ningún otro lado
  if (payload.must_change_password && pathname !== CHANGE_PASSWORD_PATH) {
    return redirectTo(CHANGE_PASSWORD_PATH, request);
  }

  if (GUEST_ONLY_PATHS.includes(pathname)) {
    return redirectTo("/", request);
  }

  return NextResponse.next();
}

function redirectTo(pathname: string, request: NextRequest) {
  return NextResponse.redirect(new URL(pathname, request.url));
}

// Solo valida la firma, la vigencia real de la sesión se revisa contra la base de datos
async function readSessionPayload(token: string): Promise<SessionPayload | null> {
  try {
    return await verifySessionToken(token);
  } catch {
    return null;
  }
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
