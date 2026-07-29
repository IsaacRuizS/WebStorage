"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { Label } from "@/components/label";

export function ProfileForm({ name }: { name: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: formData.get("name") }),
    });

    setLoading(false);

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error ?? "No se pudo guardar el nombre");
      return;
    }

    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 flex items-end gap-3">
      <div className="flex-1">
        <Label htmlFor="name">Nombre</Label>
        <Input id="name" name="name" defaultValue={name} required />
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? "Guardando..." : "Guardar"}
      </Button>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </form>
  );
}
