import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { filesCollection, foldersCollection, usersCollection } from "@/lib/db/collections";
import { toInt, toLong, toObjectId } from "@/lib/db/bson";
import { getSession } from "@/lib/auth/session";
import { deleteFiles, getExtension } from "@/lib/files";
import { buildStorageKey, uploadObject } from "@/lib/storage/supabase";
import type { DriveFile } from "@/types/file";

const updateFileSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "El nombre es obligatorio").optional(),
  folder_id: z.string().nullish(),
  favorite: z.boolean().optional(),
});

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const folderId = toObjectId(new URL(request.url).searchParams.get("folder"));
  const files = await (await filesCollection())
    .find({ owner_id: new ObjectId(session.sub), folder_id: folderId, in_trash: false })
    .sort({ name: 1 })
    .toArray();

  return NextResponse.json(files);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const formData = await request.formData();
  const upload = formData.get("file");
  if (!(upload instanceof File) || upload.size === 0) {
    return NextResponse.json({ error: "No se recibió ningún archivo" }, { status: 400 });
  }

  const ownerId = new ObjectId(session.sub);
  const folderId = toObjectId(formData.get("folder_id")?.toString());

  if (folderId) {
    const folder = await (await foldersCollection()).findOne({ _id: folderId, owner_id: ownerId });
    if (!folder) return NextResponse.json({ error: "La carpeta no existe" }, { status: 404 });
  }

  const user = await (await usersCollection()).findOne({ _id: ownerId });
  if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  if (user.storage.used_bytes + upload.size > user.storage.limit_bytes) {
    return NextResponse.json({ error: "No tienes espacio disponible" }, { status: 413 });
  }

  const fileId = new ObjectId();
  const storageKey = buildStorageKey(ownerId.toString(), fileId.toString(), 1);

  try {
    await uploadObject(storageKey, upload);
  } catch (error) {
    console.error("Supabase rechazó la subida:", error);
    return NextResponse.json({ error: "No se pudo subir el archivo" }, { status: 502 });
  }

  const file: DriveFile = {
    _id: fileId,
    name: upload.name,
    owner_id: ownerId,
    folder_id: folderId,
    mime_type: upload.type || "application/octet-stream",
    extension: getExtension(upload.name),
    size_bytes: toLong(upload.size),
    storage_key: storageKey,
    current_version: toInt(1),
    created_at: new Date(),
    updated_at: null,
    favorite: false,
    in_trash: false,
    tags: [],
  };
  await (await filesCollection()).insertOne(file);

  await (await usersCollection()).updateOne(
    { _id: ownerId },
    { $inc: { "storage.used_bytes": toLong(upload.size) } }
  );

  return NextResponse.json({ id: fileId.toString() }, { status: 201 });
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await request.json();
  const parsed = updateFileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const ownerId = new ObjectId(session.sub);
  const files = await filesCollection();
  const fileId = toObjectId(parsed.data.id);
  const file = fileId ? await files.findOne({ _id: fileId, owner_id: ownerId }) : null;
  if (!file) return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 });

  const { name, favorite } = parsed.data;
  const isMoving = parsed.data.folder_id !== undefined;
  const folderId = isMoving ? toObjectId(parsed.data.folder_id) : file.folder_id;

  if (isMoving && folderId) {
    const folder = await (await foldersCollection()).findOne({ _id: folderId, owner_id: ownerId });
    if (!folder) return NextResponse.json({ error: "La carpeta destino no existe" }, { status: 404 });
  }

  await files.updateOne(
    { _id: file._id },
    {
      $set: {
        ...(name && { name, extension: getExtension(name) }),
        ...(favorite !== undefined && { favorite }),
        ...(isMoving && { folder_id: folderId }),
        updated_at: new Date(),
      },
    }
  );

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const ownerId = new ObjectId(session.sub);
  const fileId = toObjectId(new URL(request.url).searchParams.get("id"));
  const file = fileId
    ? await (await filesCollection()).findOne({ _id: fileId, owner_id: ownerId })
    : null;
  if (!file) return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 });

  await deleteFiles(ownerId, [file._id]);
  return NextResponse.json({ ok: true });
}
