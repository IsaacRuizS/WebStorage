"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { formatDateTime } from "@/lib/format";

export interface UserRow {
  id: string;
  name: string;
  email: string;
  role: "user" | "admin";
  active: boolean;
  created_at: string;
  is_current: boolean;
}

export function UserList({ users }: { users: UserRow[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function updateUser(id: string, changes: Record<string, unknown>) {
    setPendingId(id);
    await fetch("/api/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...changes }),
    });
    setPendingId(null);
    router.refresh();
  }

  async function deleteUser(id: string) {
    setPendingId(id);
    await fetch(`/api/users?id=${id}`, { method: "DELETE" });
    setPendingId(null);
    router.refresh();
  }

  return (
    <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
      {users.map((user) => (
        <li key={user.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {user.name}
              {user.is_current && <span className="ml-2 text-xs text-zinc-500">(tú)</span>}
            </p>
            <p className="truncate text-xs text-zinc-500">
              {user.email} · {user.role === "admin" ? "Administrador" : "Usuario"} ·{" "}
              {user.active ? "Activo" : "Inactivo"} · {formatDateTime(user.created_at)}
            </p>
          </div>
          {!user.is_current && (
            <div className="flex gap-2">
              <Button
                variant="secondary"
                disabled={pendingId === user.id}
                onClick={() =>
                  updateUser(user.id, { role: user.role === "admin" ? "user" : "admin" })
                }
              >
                {user.role === "admin" ? "Quitar admin" : "Hacer admin"}
              </Button>
              <Button
                variant="secondary"
                disabled={pendingId === user.id}
                onClick={() => updateUser(user.id, { active: !user.active })}
              >
                {user.active ? "Desactivar" : "Activar"}
              </Button>
              <Button
                variant="danger"
                disabled={pendingId === user.id}
                onClick={() => deleteUser(user.id)}
              >
                Eliminar
              </Button>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
