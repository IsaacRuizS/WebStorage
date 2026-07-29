"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { Label } from "@/components/label";

export function ChangePasswordForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        current_password: formData.get("current_password"),
        new_password: formData.get("new_password"),
      }),
    });

    setLoading(false);

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error ?? "No se pudo cambiar la contraseña");
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
      <div>
        <Label htmlFor="current_password">Contraseña actual</Label>
        <Input
          id="current_password"
          name="current_password"
          type="password"
          required
          autoComplete="current-password"
        />
      </div>
      <div>
        <Label htmlFor="new_password">Nueva contraseña</Label>
        <Input
          id="new_password"
          name="new_password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
        />
      </div>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Guardando..." : "Cambiar contraseña"}
      </Button>
    </form>
  );
}
