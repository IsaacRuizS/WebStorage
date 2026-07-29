import { NextResponse } from "next/server";
import { clearSessionCookie, getSession, revokeSession } from "@/lib/auth/session";

export async function POST() {
  const session = await getSession();
  if (session) {
    await revokeSession(session.sid);
  }

  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
