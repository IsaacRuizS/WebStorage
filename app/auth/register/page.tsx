import Link from "next/link";
import { Card } from "@/components/card";
import { RegisterForm } from "@/app/auth/components/register-form";

export default function RegisterPage() {
  return (
    <Card>
      <h1 className="text-xl font-semibold">Crear cuenta</h1>
      <RegisterForm />
      <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
        ¿Ya tienes cuenta?{" "}
        <Link href="/auth/login" className="underline">
          Inicia sesión
        </Link>
      </p>
    </Card>
  );
}
