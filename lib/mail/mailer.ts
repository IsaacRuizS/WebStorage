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
  const address = process.env.MAIL_FROM ?? process.env.SMTP_USER;

  await getTransport().sendMail({
    from: `WebStorage <${address}>`,
    to,
    subject: "Tu contraseña temporal de WebStorage",
    text: buildPlainText(name, password),
    html: buildHtml(name, password),
  });
}

function buildPlainText(name: string, password: string) {
  return [
    `Hola ${name},`,
    "",
    `Tu contraseña temporal es: ${password}`,
    "",
    "Inicia sesión con ella y el sistema te va a pedir que la cambies de inmediato.",
    "Si no solicitaste este cambio, avisa al administrador.",
  ].join("\n");
}

// Los correos se ven en clientes muy distintos: estilos en línea y nada de recursos externos
function buildHtml(name: string, password: string) {
  const loginUrl = `${process.env.APP_URL ?? "http://localhost:3000"}/auth/login`;

  return `
<div style="margin:0;padding:32px 16px;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:12px;border:1px solid #e4e4e7;overflow:hidden;">
    <div style="padding:24px 32px;border-bottom:1px solid #e4e4e7;">
      <span style="font-size:17px;font-weight:600;color:#18181b;">WebStorage</span>
    </div>

    <div style="padding:32px;">
      <p style="margin:0 0 16px;font-size:15px;color:#18181b;">Hola ${escapeHtml(name)},</p>
      <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#3f3f46;">
        Generamos una contraseña temporal para que puedas volver a entrar a tu cuenta.
      </p>

      <div style="margin:0 0 24px;padding:20px;background:#fafafa;border:1px dashed #d4d4d8;border-radius:8px;text-align:center;">
        <p style="margin:0 0 8px;font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#71717a;">
          Contraseña temporal
        </p>
        <span style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:22px;font-weight:600;letter-spacing:2px;color:#18181b;">
          ${escapeHtml(password)}
        </span>
      </div>

      <div style="text-align:center;margin:0 0 24px;">
        <a href="${loginUrl}" style="display:inline-block;padding:12px 28px;background:#18181b;color:#ffffff;font-size:14px;font-weight:500;text-decoration:none;border-radius:8px;">
          Iniciar sesión
        </a>
      </div>

      <p style="margin:0;font-size:14px;line-height:1.6;color:#3f3f46;">
        Al ingresar con ella, el sistema te va a pedir que definas una contraseña nueva antes de
        continuar.
      </p>
    </div>

    <div style="padding:20px 32px;background:#fafafa;border-top:1px solid #e4e4e7;">
      <p style="margin:0;font-size:12px;line-height:1.6;color:#71717a;">
        Si no solicitaste este cambio, avisa al administrador: tu contraseña anterior ya dejó de
        funcionar.
      </p>
    </div>
  </div>
</div>`.trim();
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
