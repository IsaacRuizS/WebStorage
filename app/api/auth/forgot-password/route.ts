import { NextResponse } from "next/server";
import { usersCollection } from "@/lib/db/collections";
import { generateTemporaryPassword, hashPassword } from "@/lib/auth/password";
import { revokeUserSessions } from "@/lib/auth/session";
import { sendTemporaryPassword } from "@/lib/mail/mailer";
import { forgotPasswordSchema } from "@/lib/validations/auth";

const GENERIC_RESPONSE = {
  message: "Si el correo está registrado, vas a recibir una contraseña temporal",
};

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = forgotPasswordSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const users = await usersCollection();
  const user = await users.findOne({ email: parsed.data.email, active: true });

  // La respuesta no cambia cuando el correo no existe para no revelar quién tiene cuenta
  if (!user) {
    return NextResponse.json(GENERIC_RESPONSE);
  }

  const temporaryPassword = generateTemporaryPassword();

  // El correo se envía antes de tocar la base: si falla, la contraseña anterior sigue sirviendo
  try {
    await sendTemporaryPassword(user.email, user.name, temporaryPassword);
  } catch {
    return NextResponse.json({ error: "No se pudo enviar el correo" }, { status: 502 });
  }

  await users.updateOne(
    { _id: user._id },
    {
      $set: {
        password_hash: await hashPassword(temporaryPassword),
        must_change_password: true,
      },
    }
  );
  await revokeUserSessions(user._id);

  return NextResponse.json(GENERIC_RESPONSE);
}
