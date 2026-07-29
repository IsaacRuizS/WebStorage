import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { usersCollection } from "@/lib/db/collections";
import { getSession, revokeUserSessions } from "@/lib/auth/session";
import { updateUserSchema } from "@/lib/validations/user";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (session.role !== "admin") {
    return NextResponse.json({ error: "Solo un administrador puede ver los usuarios" }, { status: 403 });
  }

  const users = await (await usersCollection())
    .find({}, { projection: { password_hash: 0 } })
    .sort({ created_at: -1 })
    .toArray();

  return NextResponse.json(users);
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await request.json();
  const parsed = updateUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { id, name, role, active } = parsed.data;
  const isAdmin = session.role === "admin";
  const targetId = id ?? session.sub;

  if (targetId !== session.sub && !isAdmin) {
    return NextResponse.json({ error: "Solo puedes editar tu propia cuenta" }, { status: 403 });
  }

  // El rol y el estado de la cuenta son atribuciones exclusivas del administrador
  if ((role || active !== undefined) && !isAdmin) {
    return NextResponse.json({ error: "No puedes cambiar el rol ni el estado" }, { status: 403 });
  }

  const result = await (await usersCollection()).updateOne(
    { _id: new ObjectId(targetId) },
    { $set: { ...(name && { name }), ...(role && { role }), ...(active !== undefined && { active }) } }
  );

  if (result.matchedCount === 0) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  if (active === false) {
    await revokeUserSessions(new ObjectId(targetId));
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (session.role !== "admin") {
    return NextResponse.json({ error: "Solo un administrador puede eliminar usuarios" }, { status: 403 });
  }

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Falta el id del usuario" }, { status: 400 });
  if (id === session.sub) {
    return NextResponse.json({ error: "No puedes eliminar tu propia cuenta" }, { status: 400 });
  }

  const result = await (await usersCollection()).deleteOne({ _id: new ObjectId(id) });
  if (result.deletedCount === 0) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  await revokeUserSessions(new ObjectId(id));
  return NextResponse.json({ ok: true });
}
