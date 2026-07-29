"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button, ErrorText, Input, Label } from "@/components/ui";

export function AccessRequestForm({ token }: { token: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        permission: formData.get("permission"),
        message: formData.get("message"),
      }),
    });

    setLoading(false);

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error ?? "No se pudo enviar la solicitud");
      return;
    }

    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
      <div>
        <Label htmlFor="permission">Permiso que necesitas</Label>
        <select
          id="permission"
          name="permission"
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          <option value="read">Solo lectura</option>
          <option value="write">Lectura y escritura</option>
        </select>
      </div>
      <div>
        <Label htmlFor="message">Mensaje para el propietario</Label>
        <Input id="message" name="message" placeholder="Opcional" />
      </div>
      {error && <ErrorText>{error}</ErrorText>}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Enviando..." : "Solicitar acceso"}
      </Button>
    </form>
  );
}
