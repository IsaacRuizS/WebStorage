import nodemailer from "nodemailer";

function getTransport() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;

  if (!host || !user || !pass) {
    throw new Error("Faltan las credenciales SMTP en .env.local");
  }

  const port = Number(process.env.SMTP_PORT ?? 587);
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

export async function sendTemporaryPassword(to: string, name: string, password: string) {
  await getTransport().sendMail({
    from: process.env.MAIL_FROM ?? process.env.SMTP_USER,
    to,
    subject: "Tu contraseña temporal de WebStorage",
    text: [
      `Hola ${name},`,
      "",
      `Tu contraseña temporal es: ${password}`,
      "",
      "Inicia sesión con ella y el sistema te va a pedir que la cambies de inmediato.",
      "Si no solicitaste este cambio, contacta al administrador.",
    ].join("\n"),
  });
}
