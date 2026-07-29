import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { usersCollection } from "@/lib/db/collections";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSessionToken } from "@/lib/auth/token";
import { getSession, setSessionCookie } from "@/lib/auth/session";

const changePasswordSchema = z.object({
  current_password: z.string().min(1, "La contraseña actual es obligatoria"),
  new_password: z.string().min(8, "La nueva contraseña debe tener al menos 8 caracteres"),
});

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await request.json();
  const parsed = changePasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { current_password, new_password } = parsed.data;
  const users = await usersCollection();
  const user = await users.findOne({ _id: new ObjectId(session.sub) });

  if (!user || !(await verifyPassword(current_password, user.password_hash))) {
    return NextResponse.json({ error: "La contraseña actual no es correcta" }, { status: 400 });
  }

  await users.updateOne(
    { _id: user._id },
    {
      $set: {
        password_hash: await hashPassword(new_password),
        must_change_password: false,
      },
    }
  );

  // Se reemite el token para que deje de exigir el cambio, conservando la misma sesión
  await setSessionCookie(await createSessionToken({ ...session, must_change_password: false }));

  return NextResponse.json({ ok: true });
}
