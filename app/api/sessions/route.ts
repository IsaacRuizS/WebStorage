import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { sessionsCollection } from "@/lib/db/collections";
import { getSession } from "@/lib/auth/session";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const sessions = await (await sessionsCollection())
    .find({ user_id: new ObjectId(session.sub) })
    .sort({ created_at: -1 })
    .toArray();

  return NextResponse.json(sessions);
}

export async function DELETE(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Falta el id de la sesión" }, { status: 400 });

  // El filtro incluye al dueño para que nadie cierre la sesión de otro usuario
  const result = await (await sessionsCollection()).updateOne(
    { _id: new ObjectId(id), user_id: new ObjectId(session.sub) },
    { $set: { active: false } }
  );

  if (result.matchedCount === 0) {
    return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
