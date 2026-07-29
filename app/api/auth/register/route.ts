import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { usersCollection } from "@/lib/db/collections";
import { toLong } from "@/lib/db/bson";
import { hashPassword } from "@/lib/auth/password";
import { createSessionToken } from "@/lib/auth/token";
import { buildSessionPayload, createSession, setSessionCookie } from "@/lib/auth/session";
import type { User } from "@/types/user";

const DEFAULT_STORAGE_LIMIT_BYTES = 5 * 1024 * 1024 * 1024;

const registerSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  email: z.email("Correo electrónico inválido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { name, email, password } = parsed.data;
  const users = await usersCollection();

  const existing = await users.findOne({ email });
  if (existing) {
    return NextResponse.json({ error: "Ese correo ya está registrado" }, { status: 409 });
  }

  const user: User = {
    _id: new ObjectId(),
    name,
    email,
    password_hash: await hashPassword(password),
    role: "user",
    storage: {
      used_bytes: toLong(0),
      limit_bytes: toLong(DEFAULT_STORAGE_LIMIT_BYTES),
    },
    must_change_password: false,
    created_at: new Date(),
    active: true,
  };
  await users.insertOne(user);

  const sessionId = await createSession(user, request);
  await setSessionCookie(await createSessionToken(buildSessionPayload(user, sessionId)));

  return NextResponse.json({ id: user._id.toString(), name, email }, { status: 201 });
}
