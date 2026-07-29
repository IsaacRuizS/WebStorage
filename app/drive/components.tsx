"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, ErrorText, Input } from "@/components/ui";

const ROOT_VALUE = "root";

export interface FolderRow {
  id: string;
  name: string;
  path: string;
}

export function NewFolderForm({ parentId }: { parentId: string | null }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const response = await fetch("/api/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: formData.get("name"), parent_id: parentId }),
    });

    setLoading(false);

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error ?? "No se pudo crear la carpeta");
      return;
    }

    form.reset();
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-start gap-3">
      <div className="flex-1">
        <Input name="name" placeholder="Nombre de la carpeta" required className="mt-0" />
        {error && <ErrorText>{error}</ErrorText>}
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? "Creando..." : "Nueva carpeta"}
      </Button>
    </form>
  );
}

export function FolderList({
  folders,
  allFolders,
}: {
  folders: FolderRow[];
  allFolders: FolderRow[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function mutate(id: string, method: string, url: string, body?: unknown) {
    setError(null);
    setPendingId(id);

    const response = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });

    setPendingId(null);

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error ?? "No se pudo completar la acción");
      return;
    }

    setEditingId(null);
    router.refresh();
  }

  function handleRename(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    const name = new FormData(event.currentTarget).get("name");
    mutate(id, "PATCH", "/api/folders", { id, name });
  }

  function handleMove(id: string, destination: string) {
    if (!destination) return;
    mutate(id, "PATCH", "/api/folders", {
      id,
      parent_id: destination === ROOT_VALUE ? null : destination,
    });
  }

  if (folders.length === 0) {
    return <p className="text-sm text-zinc-600 dark:text-zinc-400">Esta carpeta está vacía.</p>;
  }

  return (
    <>
      {error && <ErrorText>{error}</ErrorText>}
      <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
        {folders.map((folder) => (
          <li key={folder.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            {editingId === folder.id ? (
              <form
                onSubmit={(event) => handleRename(event, folder.id)}
                className="flex flex-1 items-center gap-2"
              >
                <Input name="name" defaultValue={folder.name} required className="mt-0" autoFocus />
                <Button type="submit" disabled={pendingId === folder.id}>
                  Guardar
                </Button>
                <Button type="button" variant="secondary" onClick={() => setEditingId(null)}>
                  Cancelar
                </Button>
              </form>
            ) : (
              <>
                <Link href={`/drive?folder=${folder.id}`} className="text-sm hover:underline">
                  📁 {folder.name}
                </Link>
                <div className="flex items-center gap-2">
                  <MoveSelect
                    folder={folder}
                    folders={allFolders}
                    disabled={pendingId === folder.id}
                    onMove={(destination) => handleMove(folder.id, destination)}
                  />
                  <Button variant="secondary" onClick={() => setEditingId(folder.id)}>
                    Renombrar
                  </Button>
                  <Button
                    variant="danger"
                    disabled={pendingId === folder.id}
                    onClick={() => mutate(folder.id, "DELETE", `/api/folders?id=${folder.id}`)}
                  >
                    Eliminar
                  </Button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}

function MoveSelect({
  folder,
  folders,
  disabled,
  onMove,
}: {
  folder: FolderRow;
  folders: FolderRow[];
  disabled: boolean;
  onMove: (destination: string) => void;
}) {
  // Una carpeta no puede mudarse a sí misma ni a su propia descendencia
  const destinations = folders.filter(
    (item) => item.id !== folder.id && !item.path.startsWith(`${folder.path}/`)
  );

  return (
    <select
      value=""
      disabled={disabled}
      onChange={(event) => onMove(event.target.value)}
      className="rounded-md border border-zinc-300 bg-white px-2 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
    >
      <option value="">Mover a...</option>
      <option value={ROOT_VALUE}>Mi unidad</option>
      {destinations.map((destination) => (
        <option key={destination.id} value={destination.id}>
          {destination.path}
        </option>
      ))}
    </select>
  );
}
