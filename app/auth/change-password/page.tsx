import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { Card } from "@/components/ui";
import { ChangePasswordForm } from "@/app/auth/components";

export default async function ChangePasswordPage() {
  const session = await getSession();
  if (!session) redirect("/auth/login");

  return (
    <Card>
      <h1 className="text-xl font-semibold">Cambiar contraseña</h1>
      {session.must_change_password && (
        <p className="mt-2 text-sm text-amber-700 dark:text-amber-400">
          Ingresaste con una contraseña temporal. Defínela de nuevo para continuar.
        </p>
      )}
      <ChangePasswordForm />
    </Card>
  );
}
