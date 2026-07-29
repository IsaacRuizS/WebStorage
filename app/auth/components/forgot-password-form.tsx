"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { Label } from "@/components/label";

export function ForgotPasswordForm() {
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
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
      <div>
        <Label htmlFor="email">Correo electrónico</Label>
        <Input id="email" name="email" type="email" required autoComplete="email" />
      </div>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {message && <p className="text-sm text-green-700 dark:text-green-400">{message}</p>}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Enviando..." : "Enviar contraseña temporal"}
      </Button>
    </form>
  );
}
