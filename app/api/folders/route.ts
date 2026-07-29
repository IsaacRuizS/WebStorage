import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { filesCollection, foldersCollection } from "@/lib/db/collections";
import { toObjectId } from "@/lib/db/bson";
import { getSession } from "@/lib/auth/session";
import { deleteFiles } from "@/lib/files";
import type { Folder } from "@/types/folder";

const createFolderSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  parent_id: z.string().nullish(),
});

const updateFolderSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "El nombre es obligatorio").optional(),
  parent_id: z.string().nullish(),
});

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const parentId = toObjectId(new URL(request.url).searchParams.get("parent"));
  const folders = await (await foldersCollection())
    .find({ owner_id: new ObjectId(session.sub), parent_id: parentId, in_trash: false })
    .sort({ name: 1 })
    .toArray();

  return NextResponse.json(folders);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await request.json();
  const parsed = createFolderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { name } = parsed.data;
  const ownerId = new ObjectId(session.sub);
  const folders = await foldersCollection();
  const parentId = toObjectId(parsed.data.parent_id);

  const parent = parentId ? await folders.findOne({ _id: parentId, owner_id: ownerId }) : null;
  if (parentId && !parent) {
    return NextResponse.json({ error: "La carpeta destino no existe" }, { status: 404 });
  }

  if (await folders.findOne({ owner_id: ownerId, parent_id: parentId, name, in_trash: false })) {
    return NextResponse.json({ error: "Ya existe una carpeta con ese nombre" }, { status: 409 });
  }

  const folder: Folder = {
    _id: new ObjectId(),
    name,
    owner_id: ownerId,
    parent_id: parentId,
    path: buildPath(parent?.path ?? "", name),
    created_at: new Date(),
    updated_at: null,
    in_trash: false,
  };
  await folders.insertOne(folder);

  return NextResponse.json({ id: folder._id.toString() }, { status: 201 });
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await request.json();
  const parsed = updateFolderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const ownerId = new ObjectId(session.sub);
  const folders = await foldersCollection();
  const folderId = toObjectId(parsed.data.id);
  const folder = folderId ? await folders.findOne({ _id: folderId, owner_id: ownerId }) : null;
  if (!folder) {
    return NextResponse.json({ error: "Carpeta no encontrada" }, { status: 404 });
  }

  const isMoving = parsed.data.parent_id !== undefined;
  const newParentId = isMoving ? toObjectId(parsed.data.parent_id) : folder.parent_id;
  const newName = parsed.data.name ?? folder.name;

  const newParent = newParentId
    ? await folders.findOne({ _id: newParentId, owner_id: ownerId })
    : null;
  if (newParentId && !newParent) {
    return NextResponse.json({ error: "La carpeta destino no existe" }, { status: 404 });
  }

  // Mover una carpeta dentro de sí misma o de un hijo dejaría el árbol sin raíz
  if (newParent && newParent.path.startsWith(`${folder.path}/`)) {
    return NextResponse.json(
      { error: "No puedes mover una carpeta dentro de sí misma" },
      { status: 400 }
    );
  }

  const duplicate = await folders.findOne({
    owner_id: ownerId,
    parent_id: newParentId,
    name: newName,
    in_trash: false,
    _id: { $ne: folder._id },
  });
  if (duplicate) {
    return NextResponse.json({ error: "Ya existe una carpeta con ese nombre" }, { status: 409 });
  }

  const newPath = buildPath(newParent?.path ?? "", newName);
  await folders.updateOne(
    { _id: folder._id },
    { $set: { name: newName, parent_id: newParentId, path: newPath, updated_at: new Date() } }
  );

  // Las rutas de toda la descendencia se reescriben en una sola operación
  if (newPath !== folder.path) {
    await folders.updateMany({ owner_id: ownerId, path: descendantsOf(folder.path) }, [
      {
        $set: {
          path: {
            $concat: [
              newPath,
              { $substrCP: ["$path", folder.path.length, { $strLenCP: "$path" }] },
            ],
          },
        },
      },
    ]);
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const ownerId = new ObjectId(session.sub);
  const folders = await foldersCollection();
  const folderId = toObjectId(new URL(request.url).searchParams.get("id"));
  const folder = folderId ? await folders.findOne({ _id: folderId, owner_id: ownerId }) : null;
  if (!folder) {
    return NextResponse.json({ error: "Carpeta no encontrada" }, { status: 404 });
  }

  const descendants = await folders
    .find({ owner_id: ownerId, path: descendantsOf(folder.path) }, { projection: { _id: 1 } })
    .toArray();
  const folderIds = [folder._id, ...descendants.map((item) => item._id)];

  // Se borra el subárbol completo: primero los archivos, que además liberan cuota
  const files = await (await filesCollection())
    .find({ owner_id: ownerId, folder_id: { $in: folderIds } }, { projection: { _id: 1 } })
    .toArray();

  await deleteFiles(ownerId, files.map((item) => item._id));
  await folders.deleteMany({ owner_id: ownerId, _id: { $in: folderIds } });

  return NextResponse.json({ ok: true });
}

function buildPath(parentPath: string, name: string) {
  return `${parentPath}/${name}`;
}

function descendantsOf(path: string) {
  return { $regex: `^${escapeRegExp(path)}/` };
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
