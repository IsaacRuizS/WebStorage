"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, ErrorText } from "@/components/ui";
import { formatBytes, formatDateTime } from "@/lib/format";

type ResourceType = "file" | "folder";

interface TrashFolderRow {
  id: string;
  name: string;
  deleted_at: string;
}

interface TrashFileRow {
  id: string;
  name: string;
  size_bytes: number;
  deleted_at: string;
}

// Estado compartido por las acciones de la papelera: qué fila está ocupada y qué error mostrar
function useTrashActions() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function run(id: string | null, url: string, options: RequestInit) {
    setError(null);
    setPendingId(id);

    const response = await fetch(url, options);
    setPendingId(null);

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error ?? "No se pudo completar la acción");
      return false;
    }

    router.refresh();
    return true;
  }

  function restore(id: string, type: ResourceType) {
    return run(id, "/api/trash", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, type }),
    });
  }

  function purge(id: string, type: ResourceType, question: string) {
    if (!confirm(question)) return Promise.resolve(false);
    return run(id, `/api/trash?id=${id}&type=${type}`, { method: "DELETE" });
  }

  function emptyTrash() {
    if (!confirm("Se eliminarán definitivamente todos los elementos de la papelera. ¿Continuar?")) {
      return Promise.resolve(false);
    }
    return run(null, "/api/trash", { method: "DELETE" });
  }

  return { error, pendingId, restore, purge, emptyTrash };
}

export function TrashList({
  folders,
  files,
}: {
  folders: TrashFolderRow[];
  files: TrashFileRow[];
}) {
  const { error, pendingId, restore, purge, emptyTrash } = useTrashActions();
  const isEmpty = folders.length === 0 && files.length === 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-medium">Elementos eliminados</h2>
        <Button variant="danger" disabled={isEmpty} onClick={() => emptyTrash()}>
          Vaciar papelera
        </Button>
      </div>

      {error && <ErrorText>{error}</ErrorText>}

      {isEmpty ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">La papelera está vacía.</p>
      ) : (
        <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {folders.map((folder) => (
            <li key={folder.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="text-sm">📁 {folder.name}</p>
                <p className="text-xs text-zinc-500">
                  Eliminada el {formatDateTime(folder.deleted_at)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  disabled={pendingId === folder.id}
                  onClick={() => restore(folder.id, "folder")}
                >
                  Restaurar
                </Button>
                <Button
                  variant="danger"
                  disabled={pendingId === folder.id}
                  onClick={() =>
                    purge(
                      folder.id,
                      "folder",
                      `Se eliminará "${folder.name}" y todo su contenido para siempre. ¿Continuar?`
                    )
                  }
                >
                  Eliminar para siempre
                </Button>
              </div>
            </li>
          ))}
          {files.map((file) => (
            <li key={file.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="text-sm">📄 {file.name}</p>
                <p className="text-xs text-zinc-500">
                  {formatBytes(file.size_bytes)} · Eliminado el {formatDateTime(file.deleted_at)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  disabled={pendingId === file.id}
                  onClick={() => restore(file.id, "file")}
                >
                  Restaurar
                </Button>
                <Button
                  variant="danger"
                  disabled={pendingId === file.id}
                  onClick={() =>
                    purge(file.id, "file", `Se eliminará "${file.name}" para siempre. ¿Continuar?`)
                  }
                >
                  Eliminar para siempre
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
