import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { filesCollection, foldersCollection } from "@/lib/db/collections";
import { toObjectId } from "@/lib/db/bson";
import { getSession } from "@/lib/auth/session";
import { purgeFiles, restoreFiles } from "@/lib/files";
import { folderSubtreeIds } from "@/lib/folders";
import { logActivity, logActivityMany } from "@/lib/activity";
import { getClientIp } from "@/lib/request";

const restoreSchema = z.object({
  id: z.string(),
  type: z.enum(["file", "folder"]),
});

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

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
  const folders = trashedFolders.filter(
    (folder) => !folder.parent_id || !trashedFolderIds.has(folder.parent_id.toString())
  );
  const files = trashedFiles.filter(
    (file) => !file.folder_id || !trashedFolderIds.has(file.folder_id.toString())
  );

  return NextResponse.json({ folders, files });
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await request.json();
  const parsed = restoreSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const ownerId = new ObjectId(session.sub);
  const resourceId = toObjectId(parsed.data.id);
  if (!resourceId) return NextResponse.json({ error: "Recurso no encontrado" }, { status: 404 });

  if (parsed.data.type === "file") {
    const file = await (await filesCollection()).findOne({
      _id: resourceId,
      owner_id: ownerId,
      in_trash: true,
    });
    if (!file) {
      return NextResponse.json({ error: "Archivo no encontrado en la papelera" }, { status: 404 });
    }

    await restoreFiles(ownerId, [file._id]);
    await logActivity({
      userId: ownerId,
      action: "restore",
      resourceId: file._id,
      resourceType: "file",
      resourceName: file.name,
      ip: getClientIp(request),
    });
    return NextResponse.json({ ok: true });
  }

  const folders = await foldersCollection();
  const folder = await folders.findOne({ _id: resourceId, owner_id: ownerId, in_trash: true });
  if (!folder) {
    return NextResponse.json({ error: "Carpeta no encontrada en la papelera" }, { status: 404 });
  }

  // Restaurar una carpeta restaura también todo el subárbol que cayó con ella a la papelera
  const folderIds = await folderSubtreeIds(ownerId, folder);
  const files = await (await filesCollection())
    .find({ owner_id: ownerId, folder_id: { $in: folderIds } }, { projection: { _id: 1 } })
    .toArray();

  await restoreFiles(ownerId, files.map((item) => item._id));
  await folders.updateMany(
    { owner_id: ownerId, _id: { $in: folderIds } },
    { $set: { in_trash: false, deleted_at: null } }
  );

  await logActivity({
    userId: ownerId,
    action: "restore",
    resourceId: folder._id,
    resourceType: "folder",
    resourceName: folder.name,
    ip: getClientIp(request),
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const ownerId = new ObjectId(session.sub);
  const folders = await foldersCollection();
  const files = await filesCollection();
  const params = new URL(request.url).searchParams;
  const id = params.get("id");
  const type = params.get("type");

  // Sin id: vacía toda la papelera del usuario
  if (!id) {
    const trashedFolders = await folders.find({ owner_id: ownerId, in_trash: true }).toArray();
    const trashedFiles = await files.find({ owner_id: ownerId, in_trash: true }).toArray();

    await purgeFiles(ownerId, trashedFiles.map((item) => item._id));
    await folders.deleteMany({
      owner_id: ownerId,
      _id: { $in: trashedFolders.map((item) => item._id) },
    });

    // Solo se registra la raíz de cada elemento purgado, igual que en el listado de la papelera
    const trashedFolderIds = new Set(trashedFolders.map((folder) => folder._id.toString()));
    const ip = getClientIp(request);
    await logActivityMany([
      ...trashedFolders
        .filter((folder) => !folder.parent_id || !trashedFolderIds.has(folder.parent_id.toString()))
        .map((folder) => ({
          userId: ownerId,
          action: "delete" as const,
          resourceId: folder._id,
          resourceType: "folder" as const,
          resourceName: folder.name,
          ip,
        })),
      ...trashedFiles
        .filter((file) => !file.folder_id || !trashedFolderIds.has(file.folder_id.toString()))
        .map((file) => ({
          userId: ownerId,
          action: "delete" as const,
          resourceId: file._id,
          resourceType: "file" as const,
          resourceName: file.name,
          ip,
        })),
    ]);

    return NextResponse.json({ ok: true });
  }

  const resourceId = toObjectId(id);
  if (!resourceId || (type !== "file" && type !== "folder")) {
    return NextResponse.json({ error: "Recurso no encontrado" }, { status: 404 });
  }

  if (type === "file") {
    const file = await files.findOne({ _id: resourceId, owner_id: ownerId, in_trash: true });
    if (!file) {
      return NextResponse.json({ error: "Archivo no encontrado en la papelera" }, { status: 404 });
    }

    await purgeFiles(ownerId, [file._id]);
    await logActivity({
      userId: ownerId,
      action: "delete",
      resourceId: file._id,
      resourceType: "file",
      resourceName: file.name,
      ip: getClientIp(request),
    });
    return NextResponse.json({ ok: true });
  }

  const folder = await folders.findOne({ _id: resourceId, owner_id: ownerId, in_trash: true });
  if (!folder) {
    return NextResponse.json({ error: "Carpeta no encontrada en la papelera" }, { status: 404 });
  }

  const folderIds = await folderSubtreeIds(ownerId, folder);
  const descendantFiles = await files
    .find({ owner_id: ownerId, folder_id: { $in: folderIds } }, { projection: { _id: 1 } })
    .toArray();

  await purgeFiles(ownerId, descendantFiles.map((item) => item._id));
  await folders.deleteMany({ owner_id: ownerId, _id: { $in: folderIds } });

  await logActivity({
    userId: ownerId,
    action: "delete",
    resourceId: folder._id,
    resourceType: "folder",
    resourceName: folder.name,
    ip: getClientIp(request),
  });

  return NextResponse.json({ ok: true });
}
