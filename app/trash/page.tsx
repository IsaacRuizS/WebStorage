import { redirect } from "next/navigation";
import { ObjectId } from "mongodb";
import { filesCollection, foldersCollection } from "@/lib/db/collections";
import { getSession } from "@/lib/auth/session";
import { AppHeader } from "@/components/app-header";
import { Card } from "@/components/ui";
import { TrashList } from "@/app/trash/components";

export default async function TrashPage() {
  const session = await getSession();
  if (!session) redirect("/auth/login");

  const ownerId = new ObjectId(session.sub);
  const trashedFolders = await (await foldersCollection())
    .find({ owner_id: ownerId, in_trash: true })
    .sort({ deleted_at: -1 })
    .toArray();
  const trashedFiles = await (await filesCollection())
    .find({ owner_id: ownerId, in_trash: true })
    .sort({ deleted_at: -1 })
    .toArray();

  // Solo se muestra la raíz de cada elemento eliminado: si su contenedor también
  // está en la papelera, llegó ahí por la cascada y no por una acción propia
  const trashedFolderIds = new Set(trashedFolders.map((folder) => folder._id.toString()));
  const rootFolders = trashedFolders.filter(
    (folder) => !folder.parent_id || !trashedFolderIds.has(folder.parent_id.toString())
  );
  const rootFiles = trashedFiles.filter(
    (file) => !file.folder_id || !trashedFolderIds.has(file.folder_id.toString())
  );

  return (
    <>
      <AppHeader userName={session.name} role={session.role} />
      <main className="flex-1 bg-zinc-50 px-6 py-10 dark:bg-black">
        <div className="mx-auto max-w-5xl space-y-6">
          <Card>
            <h1 className="text-xl font-semibold">Papelera</h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Los elementos eliminados se guardan aquí hasta que los restaures o los borres
              definitivamente.
            </p>
          </Card>

          <Card>
            <TrashList
              folders={rootFolders.map((folder) => ({
                id: folder._id.toString(),
                name: folder.name,
                deleted_at: (folder.deleted_at ?? folder.created_at).toISOString(),
              }))}
              files={rootFiles.map((file) => ({
                id: file._id.toString(),
                name: file.name,
                size_bytes: file.size_bytes,
                deleted_at: (file.deleted_at ?? file.created_at).toISOString(),
              }))}
            />
          </Card>
        </div>
      </main>
    </>
  );
}
