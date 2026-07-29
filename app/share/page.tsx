import Link from "next/link";
import { ObjectId } from "mongodb";
import {
  accessRequestsCollection,
  filesCollection,
  foldersCollection,
  sharesCollection,
} from "@/lib/db/collections";
import { getSession } from "@/lib/auth/session";
import { getAccessibleFile, getAccessibleFolder } from "@/lib/auth/authorize";
import { AppHeader } from "@/components/app-header";
import { Card } from "@/components/ui";
import { formatBytes } from "@/lib/format";
import { AccessRequestForm } from "@/app/share/components";
import type { DriveFile } from "@/types/file";
import type { Folder } from "@/types/folder";
import type { Share } from "@/types/share";

const STATUS_MESSAGE = {
  pending: "Tu solicitud está pendiente de respuesta.",
  approved: "Tu solicitud fue aprobada.",
  rejected: "El propietario rechazó tu solicitud.",
};

export default async function SharePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const session = await getSession();
  const { token } = await searchParams;
  const share = token ? await (await sharesCollection()).findOne({ link_token: token }) : null;

  return (
    <>
      {session && <AppHeader userName={session.name} role={session.role} />}
      <main className="flex flex-1 items-start justify-center bg-zinc-50 px-6 py-10 dark:bg-black">
        <div className="w-full max-w-2xl">
          <Card>
            {!share || !token ? (
              <p className="text-sm">Este enlace no es válido o fue revocado.</p>
            ) : !session ? (
              <>
                <h1 className="text-xl font-semibold">Recurso compartido</h1>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                  Necesitas una cuenta para solicitar acceso.
                </p>
                <p className="mt-4 text-sm">
                  <Link href="/auth/login" className="underline">
                    Iniciar sesión
                  </Link>
                </p>
              </>
            ) : (
              <SharedResource share={share} token={token} userId={new ObjectId(session.sub)} />
            )}
          </Card>
        </div>
      </main>
    </>
  );
}

async function SharedResource({
  share,
  token,
  userId,
}: {
  share: Share;
  token: string;
  userId: ObjectId;
}) {
  if (share.resource_type === "file") {
    const file = await getAccessibleFile(share.resource_id, userId);
    return file ? (
      <FileView file={file} />
    ) : (
      <RequestAccess token={token} resourceId={share.resource_id} userId={userId} />
    );
  }

  const folder = await getAccessibleFolder(share.resource_id, userId);
  return folder ? (
    <FolderView folder={folder} />
  ) : (
    <RequestAccess token={token} resourceId={share.resource_id} userId={userId} />
  );
}

function FileView({ file }: { file: DriveFile }) {
  return (
    <>
      <h1 className="text-xl font-semibold">{file.name}</h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        {formatBytes(file.size_bytes)} · versión {file.current_version}
      </p>
      <a
        href={`/api/files/download?id=${file._id.toString()}`}
        className="mt-4 inline-block text-sm underline"
      >
        Descargar
      </a>
    </>
  );
}

async function FolderView({ folder }: { folder: Folder }) {
  const children = await (await foldersCollection())
    .find({ parent_id: folder._id, in_trash: false })
    .sort({ name: 1 })
    .toArray();

  const files = await (await filesCollection())
    .find({ folder_id: folder._id, in_trash: false })
    .sort({ name: 1 })
    .toArray();

  return (
    <>
      <h1 className="text-xl font-semibold">{folder.name}</h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{folder.path}</p>
      <ul className="mt-4 divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
        {children.map((child) => (
          <li key={child._id.toString()} className="py-2">
            📁 {child.name}
          </li>
        ))}
        {files.map((file) => (
          <li key={file._id.toString()} className="flex justify-between gap-3 py-2">
            <span>📄 {file.name}</span>
            <a href={`/api/files/download?id=${file._id.toString()}`} className="shrink-0 underline">
              Descargar
            </a>
          </li>
        ))}
        {children.length === 0 && files.length === 0 && (
          <li className="py-2 text-zinc-600 dark:text-zinc-400">La carpeta está vacía.</li>
        )}
      </ul>
    </>
  );
}

// Sin acceso todavía: se muestra el estado de la última solicitud o el formulario para pedirla
async function RequestAccess({
  token,
  resourceId,
  userId,
}: {
  token: string;
  resourceId: ObjectId;
  userId: ObjectId;
}) {
  const previous = await (await accessRequestsCollection()).findOne(
    { resource_id: resourceId, requester_id: userId },
    { sort: { created_at: -1 } }
  );

  return (
    <>
      <h1 className="text-xl font-semibold">Solicitar acceso</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        No tienes permiso para ver este recurso todavía.
      </p>
      {previous && <p className="mt-4 text-sm">{STATUS_MESSAGE[previous.status]}</p>}
      {previous?.status !== "pending" && <AccessRequestForm token={token} />}
    </>
  );
}
