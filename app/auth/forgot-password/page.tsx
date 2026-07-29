import Link from "next/link";
import { Card } from "@/components/card";
import { ForgotPasswordForm } from "@/app/auth/components/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <Card>
      <h1 className="text-xl font-semibold">Recuperar contraseña</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Te enviamos una contraseña temporal al correo para que ingreses y la cambies.
      </p>
      <ForgotPasswordForm />
      <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
        <Link href="/auth/login" className="underline">
          Volver a iniciar sesión
        </Link>
      </p>
    </Card>
  );
}
