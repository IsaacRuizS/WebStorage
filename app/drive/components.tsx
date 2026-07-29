"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, ErrorText, Input } from "@/components/ui";
import { formatBytes, formatDateTime } from "@/lib/format";

const ROOT_VALUE = "root";

export interface FolderRow {
  id: string;
  name: string;
  path: string;
}

export interface FileRow {
  id: string;
  name: string;
  size_bytes: number;
  favorite: boolean;
  version: number;
}

interface VersionRow {
  _id: string;
  version: number;
  size_bytes: number;
  created_at: string;
}

// Estado compartido por las listas: qué fila está ocupada y qué error mostrar
function useResourceActions() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function run(id: string, url: string, options: RequestInit) {
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

  function patch(id: string, url: string, body: unknown) {
    return run(id, url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  function remove(id: string, url: string, question: string) {
    if (!confirm(question)) return Promise.resolve(false);
    return run(id, url, { method: "DELETE" });
  }

  return { error, pendingId, patch, remove };
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

export function UploadForm({ folderId }: { folderId: string | null }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const form = event.currentTarget;
    const formData = new FormData(form);
    if (folderId) formData.set("folder_id", folderId);

    const response = await fetch("/api/files", { method: "POST", body: formData });
    setLoading(false);

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error ?? "No se pudo subir el archivo");
      return;
    }

    form.reset();
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-start gap-3">
      <div className="flex-1">
        <input
          type="file"
          name="file"
          required
          className="w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-zinc-900 file:px-3 file:py-2 file:text-sm file:text-white dark:file:bg-white dark:file:text-zinc-900"
        />
        {error && <ErrorText>{error}</ErrorText>}
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? "Subiendo..." : "Subir archivo"}
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
  const { error, pendingId, patch, remove } = useResourceActions();
  const [editingId, setEditingId] = useState<string | null>(null);

  async function handleRename(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    const name = new FormData(event.currentTarget).get("name");
    if (await patch(id, "/api/folders", { id, name })) setEditingId(null);
  }

  if (folders.length === 0) {
    return <p className="text-sm text-zinc-600 dark:text-zinc-400">No hay carpetas aquí.</p>;
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
                    disabled={pendingId === folder.id}
                    options={allFolders.filter(
                      (item) => item.id !== folder.id && !item.path.startsWith(`${folder.path}/`)
                    )}
                    onMove={(destination) =>
                      patch(folder.id, "/api/folders", {
                        id: folder.id,
                        parent_id: destination === ROOT_VALUE ? null : destination,
                      })
                    }
                  />
                  <Button variant="secondary" onClick={() => setEditingId(folder.id)}>
                    Renombrar
                  </Button>
                  <Button
                    variant="danger"
                    disabled={pendingId === folder.id}
                    onClick={() =>
                      remove(
                        folder.id,
                        `/api/folders?id=${folder.id}`,
                        `Se va a eliminar "${folder.name}" con todo su contenido. ¿Continuar?`
                      )
                    }
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

export function FileList({ files, folders }: { files: FileRow[]; folders: FolderRow[] }) {
  const router = useRouter();
  const { error, pendingId, patch, remove } = useResourceActions();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [versionsId, setVersionsId] = useState<string | null>(null);
  const [versions, setVersions] = useState<VersionRow[] | null>(null);

  // El historial se pide al abrir el panel, no al renderizarlo
  async function loadVersions(fileId: string) {
    setVersions(null);
    const response = await fetch(`/api/versions?file=${fileId}`);
    setVersions(response.ok ? await response.json() : []);
  }

  function toggleVersions(fileId: string) {
    if (versionsId === fileId) {
      setVersionsId(null);
      return;
    }

    setVersionsId(fileId);
    loadVersions(fileId);
  }

  async function handleRename(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    const name = new FormData(event.currentTarget).get("name");
    if (await patch(id, "/api/files", { id, name })) setEditingId(null);
  }

  if (files.length === 0) {
    return <p className="text-sm text-zinc-600 dark:text-zinc-400">No hay archivos aquí.</p>;
  }

  return (
    <>
      {error && <ErrorText>{error}</ErrorText>}
      <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
        {files.map((file) => (
          <li key={file.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            {editingId === file.id ? (
              <form
                onSubmit={(event) => handleRename(event, file.id)}
                className="flex flex-1 items-center gap-2"
              >
                <Input name="name" defaultValue={file.name} required className="mt-0" autoFocus />
                <Button type="submit" disabled={pendingId === file.id}>
                  Guardar
                </Button>
                <Button type="button" variant="secondary" onClick={() => setEditingId(null)}>
                  Cancelar
                </Button>
              </form>
            ) : (
              <>
                <div className="min-w-0">
                  <a href={`/api/files/download?id=${file.id}`} className="text-sm hover:underline">
                    {file.favorite ? "⭐" : "📄"} {file.name}
                  </a>
                  <p className="text-xs text-zinc-500">
                    {formatBytes(file.size_bytes)} · versión {file.version}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <MoveSelect
                    disabled={pendingId === file.id}
                    options={folders}
                    onMove={(destination) =>
                      patch(file.id, "/api/files", {
                        id: file.id,
                        folder_id: destination === ROOT_VALUE ? null : destination,
                      })
                    }
                  />
                  <Button
                    variant="secondary"
                    disabled={pendingId === file.id}
                    onClick={() =>
                      patch(file.id, "/api/files", { id: file.id, favorite: !file.favorite })
                    }
                  >
                    {file.favorite ? "Quitar favorito" : "Favorito"}
                  </Button>
                  <Button variant="secondary" onClick={() => setEditingId(file.id)}>
                    Renombrar
                  </Button>
                  <Button variant="secondary" onClick={() => toggleVersions(file.id)}>
                    Versiones
                  </Button>
                  <Button
                    variant="danger"
                    disabled={pendingId === file.id}
                    onClick={() =>
                      remove(
                        file.id,
                        `/api/files?id=${file.id}`,
                        `Se va a eliminar "${file.name}" y todas sus versiones. ¿Continuar?`
                      )
                    }
                  >
                    Eliminar
                  </Button>
                </div>
              </>
            )}
            {versionsId === file.id && (
              <VersionsPanel
                file={file}
                versions={versions}
                onChanged={() => {
                  loadVersions(file.id);
                  router.refresh();
                }}
              />
            )}
          </li>
        ))}
      </ul>
    </>
  );
}

function VersionsPanel({
  file,
  versions,
  onChanged,
}: {
  file: FileRow;
  versions: VersionRow[] | null;
  onChanged: () => void;
}) {
  const [error, setError] = useState<string | null>(null);

  async function send(url: string, options: RequestInit) {
    setError(null);

    const response = await fetch(url, options);
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error ?? "No se pudo completar la acción");
      return;
    }

    onChanged();
  }

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);
    formData.set("file_id", file.id);

    await send("/api/versions", { method: "POST", body: formData });
    form.reset();
  }

  return (
    <div className="w-full rounded-md bg-zinc-50 p-4 dark:bg-zinc-900">
      <form onSubmit={handleUpload} className="flex items-center gap-3">
        <input type="file" name="file" required className="flex-1 text-sm" />
        <Button type="submit">Subir nueva versión</Button>
      </form>

      {error && <ErrorText>{error}</ErrorText>}

      <p className="mt-4 text-xs font-medium text-zinc-500">
        Versión {file.version} · {formatBytes(file.size_bytes)} · actual
      </p>

      {versions === null ? (
        <p className="mt-2 text-xs text-zinc-500">Cargando historial...</p>
      ) : versions.length === 0 ? (
        <p className="mt-2 text-xs text-zinc-500">Todavía no hay versiones anteriores.</p>
      ) : (
        <ul className="mt-2 divide-y divide-zinc-200 dark:divide-zinc-800">
          {versions.map((version) => (
            <li key={version._id} className="flex items-center justify-between gap-3 py-2">
              <p className="text-xs text-zinc-500">
                Versión {version.version} · {formatBytes(version.size_bytes)} ·{" "}
                {formatDateTime(version.created_at)}
              </p>
              <div className="flex items-center gap-2">
                <a
                  href={`/api/files/download?version=${version._id}`}
                  className="text-xs underline"
                >
                  Descargar
                </a>
                <Button
                  variant="secondary"
                  onClick={() =>
                    send("/api/versions", {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ id: version._id }),
                    })
                  }
                >
                  Restaurar
                </Button>
                <Button
                  variant="danger"
                  onClick={() =>
                    confirm(`¿Eliminar la versión ${version.version}?`) &&
                    send(`/api/versions?id=${version._id}`, { method: "DELETE" })
                  }
                >
                  Eliminar
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function MoveSelect({
  options,
  disabled,
  onMove,
}: {
  options: FolderRow[];
  disabled: boolean;
  onMove: (destination: string) => void;
}) {
  return (
    <select
      value=""
      disabled={disabled}
      onChange={(event) => onMove(event.target.value)}
      className="rounded-md border border-zinc-300 bg-white px-2 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
    >
      <option value="">Mover a...</option>
      <option value={ROOT_VALUE}>Mi unidad</option>
      {options.map((option) => (
        <option key={option.id} value={option.id}>
          {option.path}
        </option>
      ))}
    </select>
  );
}
