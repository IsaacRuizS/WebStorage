import Link from "next/link";
import { Card } from "@/components/card";
import { LoginForm } from "@/app/auth/components/login-form";

export default function LoginPage() {
  return (
    <Card>
      <h1 className="text-xl font-semibold">Iniciar sesión</h1>
      <LoginForm />
      <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
        ¿No tienes cuenta?{" "}
        <Link href="/auth/register" className="underline">
          Regístrate
        </Link>
      </p>
    </Card>
  );
}
