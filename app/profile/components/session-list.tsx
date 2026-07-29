"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/button";
import { formatDateTime } from "@/lib/format";

export interface SessionRow {
  id: string;
  user_agent: string | null;
  ip: string | null;
  created_at: string;
  active: boolean;
  is_current: boolean;
}

export function SessionList({ sessions }: { sessions: SessionRow[] }) {
  const router = useRouter();
  const [revokingId, setRevokingId] = useState<string | null>(null);

  async function handleRevoke(id: string) {
    setRevokingId(id);
    await fetch(`/api/sessions?id=${id}`, { method: "DELETE" });
    setRevokingId(null);
    router.refresh();
  }

  if (sessions.length === 0) {
    return <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">No hay ingresos registrados.</p>;
  }

  return (
    <ul className="mt-4 divide-y divide-zinc-200 dark:divide-zinc-800">
      {sessions.map((session) => (
        <li key={session.id} className="flex items-center justify-between gap-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm">{session.user_agent ?? "Dispositivo desconocido"}</p>
            <p className="text-xs text-zinc-500">
              {formatDateTime(session.created_at)}
              {session.ip && ` · ${session.ip}`}
            </p>
          </div>
          {session.is_current ? (
            <span className="shrink-0 text-xs text-zinc-500">Sesión actual</span>
          ) : session.active ? (
            <Button
              variant="secondary"
              onClick={() => handleRevoke(session.id)}
              disabled={revokingId === session.id}
            >
              {revokingId === session.id ? "Cerrando..." : "Cerrar"}
            </Button>
          ) : (
            <span className="shrink-0 text-xs text-zinc-500">Cerrada</span>
          )}
        </li>
      ))}
    </ul>
  );
}
