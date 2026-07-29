import { NextResponse } from "next/server";
import { z } from "zod";
import { usersCollection } from "@/lib/db/collections";
import { verifyPassword } from "@/lib/auth/password";
import { createSessionToken } from "@/lib/auth/token";
import { buildSessionPayload, createSession, setSessionCookie } from "@/lib/auth/session";

const loginSchema = z.object({
  email: z.email("Correo electrónico inválido"),
  password: z.string().min(1, "La contraseña es obligatoria"),
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { email, password } = parsed.data;
  const users = await usersCollection();
  const user = await users.findOne({ email });

  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
  }

  if (!user.active) {
    return NextResponse.json({ error: "La cuenta está desactivada" }, { status: 403 });
  }

  const sessionId = await createSession(user, request);
  await setSessionCookie(await createSessionToken(buildSessionPayload(user, sessionId)));

  return NextResponse.json({
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    must_change_password: user.must_change_password,
  });
}
