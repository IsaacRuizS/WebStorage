"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Card, ErrorText, Input, Label } from "@/components/ui";

const REDIRECT_DELAY_MS = 5000;

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: formData.get("email") }),
    });

    setLoading(false);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(data.error ?? "No se pudo enviar la contraseña temporal");
      return;
    }

    setMessage(data.message);

    // El usuario alcanza a leer el aviso y se le lleva al login sin que tenga que hacer nada
    setTimeout(() => router.push("/auth/login"), REDIRECT_DELAY_MS);
  }

  return (
    <Card>
      <h1 className="text-xl font-semibold">Recuperar contraseña</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Te enviamos una contraseña temporal al correo para que ingreses y la cambies.
      </p>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <Label htmlFor="email">Correo electrónico</Label>
          <Input id="email" name="email" type="email" required autoComplete="email" />
        </div>
        {error && <ErrorText>{error}</ErrorText>}
        {message && (
          <div className="rounded-md bg-green-50 p-3 dark:bg-green-950">
            <p className="text-sm text-green-700 dark:text-green-400">{message}</p>
            <p className="mt-1 text-xs text-green-700 dark:text-green-500">
              Te llevamos a iniciar sesión en unos segundos...
            </p>
          </div>
        )}
        <Button type="submit" className="w-full" disabled={loading || Boolean(message)}>
          {loading ? "Enviando..." : "Enviar contraseña temporal"}
        </Button>
      </form>
      <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
        <Link href="/auth/login" className="underline">
          Volver a iniciar sesión
        </Link>
      </p>
    </Card>
  );
}
