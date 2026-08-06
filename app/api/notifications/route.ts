import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { notificationsCollection } from "@/lib/db/collections";
import { toObjectId } from "@/lib/db/bson";
import { getSession } from "@/lib/auth/session";

const RECENT_LIMIT = 30;

const markReadSchema = z.object({
  id: z.string().optional(),
  all: z.boolean().optional(),
});

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const userId = new ObjectId(session.sub);
  const notifications = await notificationsCollection();

  const recent = await notifications
    .find({ user_id: userId })
    .sort({ created_at: -1 })
    .limit(RECENT_LIMIT)
    .toArray();
  const unreadCount = await notifications.countDocuments({ user_id: userId, read: false });

  return NextResponse.json({
    notifications: recent.map((item) => ({
      id: item._id.toString(),
      type: item.type,
      message: item.message,
      link: item.link ?? null,
      read: item.read,
      created_at: item.created_at,
    })),
    unreadCount,
  });
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await request.json();
  const parsed = markReadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const userId = new ObjectId(session.sub);
  const notifications = await notificationsCollection();

  if (parsed.data.all) {
    await notifications.updateMany({ user_id: userId, read: false }, { $set: { read: true } });
    return NextResponse.json({ ok: true });
  }

  const notificationId = toObjectId(parsed.data.id);
  if (!notificationId) {
    return NextResponse.json({ error: "Notificación no encontrada" }, { status: 404 });
  }

  await notifications.updateOne({ _id: notificationId, user_id: userId }, { $set: { read: true } });
  return NextResponse.json({ ok: true });
}
