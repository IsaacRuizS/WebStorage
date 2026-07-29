import Link from "next/link";
import { redirect } from "next/navigation";
import { ObjectId } from "mongodb";
import { foldersCollection } from "@/lib/db/collections";
import { toObjectId } from "@/lib/db/bson";
import { getSession } from "@/lib/auth/session";
import { AppHeader } from "@/components/app-header";
import { Card } from "@/components/ui";
import { FolderList, NewFolderForm } from "@/app/drive/components";
import type { Folder } from "@/types/folder";

export default async function DrivePage({
  searchParams,
}: {
  searchParams: Promise<{ folder?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/auth/login");

  const ownerId = new ObjectId(session.sub);
  const folders = await foldersCollection();
  const currentId = toObjectId((await searchParams).folder);

  const current = currentId
    ? await folders.findOne({ _id: currentId, owner_id: ownerId, in_trash: false })
    : null;
  if (currentId && !current) redirect("/drive");

  const children = await folders
    .find({ owner_id: ownerId, parent_id: current?._id ?? null, in_trash: false })
    .sort({ name: 1 })
    .toArray();

  const allFolders = await folders
    .find({ owner_id: ownerId, in_trash: false })
    .sort({ path: 1 })
    .toArray();

  const breadcrumb = current ? await findAncestors(current, ownerId) : [];

  return (
    <>
      <AppHeader userName={session.name} role={session.role} />
      <main className="flex-1 bg-zinc-50 px-6 py-10 dark:bg-black">
        <div className="mx-auto max-w-5xl space-y-6">
          <nav className="flex flex-wrap items-center gap-1 text-sm text-zinc-600 dark:text-zinc-400">
            <Link href="/drive" className="hover:underline">
              Mi unidad
            </Link>
            {breadcrumb.map((folder) => (
              <span key={folder._id.toString()} className="flex items-center gap-1">
                <span>/</span>
                <Link href={`/drive?folder=${folder._id.toString()}`} className="hover:underline">
                  {folder.name}
                </Link>
              </span>
            ))}
          </nav>

          <Card>
            <h1 className="text-xl font-semibold">{current?.name ?? "Mi unidad"}</h1>
            <div className="mt-4">
              <NewFolderForm parentId={current?._id.toString() ?? null} />
            </div>
          </Card>

          <Card>
            <FolderList
              folders={children.map(toFolderRow)}
              allFolders={allFolders.map(toFolderRow)}
            />
          </Card>
        </div>
      </main>
    </>
  );
}

function toFolderRow(folder: Folder) {
  return { id: folder._id.toString(), name: folder.name, path: folder.path };
}

// Las rutas de los ancestros son los prefijos de la ruta actual, así se traen en una sola consulta
async function findAncestors(folder: Folder, ownerId: ObjectId) {
  const segments = folder.path.split("/").filter(Boolean);
  const paths = segments.map((_, index) => `/${segments.slice(0, index + 1).join("/")}`);

  const ancestors = await (await foldersCollection())
    .find({ owner_id: ownerId, path: { $in: paths } })
    .toArray();

  return ancestors.sort((a, b) => a.path.length - b.path.length);
}
