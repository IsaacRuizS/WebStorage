import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { clearSessionCookie, getSession, revokeSession } from "@/lib/auth/session";
import { logActivity } from "@/lib/activity";
import { getClientIp } from "@/lib/request";

export async function POST(request: Request) {
  const session = await getSession();
  if (session) {
    await revokeSession(session.sid);
    await logActivity({
      userId: new ObjectId(session.sub),
      action: "logout",
      ip: getClientIp(request),
    });
  }

  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
