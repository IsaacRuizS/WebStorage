import Link from "next/link";
import { redirect } from "next/navigation";
import { ObjectId } from "mongodb";
import {
  filesCollection,
  foldersCollection,
  sharesCollection,
  usersCollection,
} from "@/lib/db/collections";
import { getSession } from "@/lib/auth/session";
import { AppHeader } from "@/components/app-header";
import { Card } from "@/components/ui";
import { formatBytes, formatDateTime } from "@/lib/format";

const PERMISSION_LABEL = {
  read: "solo lectura",
  write: "lectura y escritura",
};

export default async function SharedPage() {
  const session = await getSession();
  if (!session) redirect("/auth/login");

  const shares = await (await sharesCollection())
    .find({ shared_with: new ObjectId(session.sub) })
    .sort({ created_at: -1 })
    .toArray();

  const resourceIds = shares.map((share) => share.resource_id);
  const files = await (await filesCollection()).find({ _id: { $in: resourceIds } }).toArray();
  const folders = await (await foldersCollection()).find({ _id: { $in: resourceIds } }).toArray();
  const owners = await (await usersCollection())
    .find({ _id: { $in: shares.map((share) => share.owner_id) } })
    .toArray();

  // El enlace público del dueño es la forma de abrir una carpeta compartida
  const links = await (await sharesCollection())
    .find({ resource_id: { $in: resourceIds }, link_token: { $ne: null } })
    .toArray();

  const fileById = new Map(files.map((file) => [file._id.toString(), file] as const));
  const folderById = new Map(folders.map((folder) => [folder._id.toString(), folder] as const));
  const ownerById = new Map(owners.map((owner) => [owner._id.toString(), owner.name] as const));
  const tokenByResource = new Map(
    links.map((link) => [link.resource_id.toString(), link.link_token] as const)
  );

  return (
    <>
      <AppHeader userName={session.name} role={session.role} />
      <main className="flex-1 bg-zinc-50 px-6 py-10 dark:bg-black">
        <div className="mx-auto max-w-3xl">
          <Card>
            <h1 className="text-xl font-semibold">Compartidos conmigo</h1>
            {shares.length === 0 ? (
              <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
                Todavía no te han compartido nada.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-zinc-200 dark:divide-zinc-800">
                {shares.map((share) => {
                  const resourceId = share.resource_id.toString();
                  const file = fileById.get(resourceId);
                  const folder = folderById.get(resourceId);
                  const token = tokenByResource.get(resourceId);

                  return (
                    <li
                      key={share._id.toString()}
                      className="flex flex-wrap items-center justify-between gap-3 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm">
                          {file ? "📄" : "📁"} {file?.name ?? folder?.name ?? "Recurso eliminado"}
                        </p>
                        <p className="text-xs text-zinc-500">
                          De {ownerById.get(share.owner_id.toString()) ?? "otro usuario"} ·{" "}
                          {PERMISSION_LABEL[share.permission]} · {formatDateTime(share.created_at)}
                          {file && ` · ${formatBytes(file.size_bytes)}`}
                        </p>
                      </div>
                      {file ? (
                        <a
                          href={`/api/files/download?id=${resourceId}`}
                          className="shrink-0 text-sm underline"
                        >
                          Descargar
                        </a>
                      ) : (
                        token && (
                          <Link href={`/share?token=${token}`} className="shrink-0 text-sm underline">
                            Abrir
                          </Link>
                        )
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
      </main>
    </>
  );
}
