import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { fileVersionsCollection, filesCollection, usersCollection } from "@/lib/db/collections";
import { toInt, toLong, toObjectId } from "@/lib/db/bson";
import { getSession } from "@/lib/auth/session";
import { buildStorageKey, copyObject, removeObjects, uploadObject } from "@/lib/storage/supabase";
import type { DriveFile } from "@/types/file";
import type { FileVersion } from "@/types/file-version";

const restoreVersionSchema = z.object({ id: z.string() });

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const file = await findOwnedFile(new URL(request.url).searchParams.get("file"), session.sub);
  if (!file) return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 });

  const versions = await (await fileVersionsCollection())
    .find({ file_id: file._id })
    .sort({ version: -1 })
    .toArray();

  return NextResponse.json(versions);
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
  const file = await findOwnedFile(formData.get("file_id")?.toString(), session.sub);
  if (!file) return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 });

  const user = await (await usersCollection()).findOne({ _id: ownerId });
  if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  // La versión anterior se conserva, así que el espacio ocupado crece con la nueva
  if (user.storage.used_bytes + upload.size > user.storage.limit_bytes) {
    return NextResponse.json({ error: "No tienes espacio disponible" }, { status: 413 });
  }

  const nextVersion = file.current_version + 1;
  const storageKey = buildStorageKey(ownerId.toString(), file._id.toString(), nextVersion);

  try {
    await uploadObject(storageKey, upload);
  } catch {
    return NextResponse.json({ error: "No se pudo subir la nueva versión" }, { status: 502 });
  }

  await archiveCurrentVersion(file, ownerId);
  await (await filesCollection()).updateOne(
    { _id: file._id },
    {
      $set: {
        size_bytes: toLong(upload.size),
        storage_key: storageKey,
        current_version: toInt(nextVersion),
        mime_type: upload.type || file.mime_type,
        updated_at: new Date(),
      },
    }
  );
  await (await usersCollection()).updateOne(
    { _id: ownerId },
    { $inc: { "storage.used_bytes": toLong(upload.size) } }
  );

  return NextResponse.json({ version: nextVersion }, { status: 201 });
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await request.json();
  const parsed = restoreVersionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const ownerId = new ObjectId(session.sub);
  const versionId = toObjectId(parsed.data.id);
  const version = versionId
    ? await (await fileVersionsCollection()).findOne({ _id: versionId })
    : null;
  const file = version ? await findOwnedFile(version.file_id.toString(), session.sub) : null;
  if (!version || !file) {
    return NextResponse.json({ error: "Versión no encontrada" }, { status: 404 });
  }

  // Restaurar no revive el número viejo: la versión recuperada entra como la siguiente
  const nextVersion = file.current_version + 1;
  const storageKey = buildStorageKey(ownerId.toString(), file._id.toString(), nextVersion);

  try {
    await copyObject(version.storage_key, storageKey);
  } catch {
    return NextResponse.json({ error: "No se pudo restaurar la versión" }, { status: 502 });
  }

  await archiveCurrentVersion(file, ownerId);
  await (await filesCollection()).updateOne(
    { _id: file._id },
    {
      $set: {
        size_bytes: toLong(version.size_bytes),
        storage_key: storageKey,
        current_version: toInt(nextVersion),
        updated_at: new Date(),
      },
    }
  );
  await (await usersCollection()).updateOne(
    { _id: ownerId },
    { $inc: { "storage.used_bytes": toLong(version.size_bytes) } }
  );

  return NextResponse.json({ version: nextVersion });
}

export async function DELETE(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const ownerId = new ObjectId(session.sub);
  const versionId = toObjectId(new URL(request.url).searchParams.get("id"));
  const versions = await fileVersionsCollection();
  const version = versionId ? await versions.findOne({ _id: versionId }) : null;
  const file = version ? await findOwnedFile(version.file_id.toString(), session.sub) : null;
  if (!version || !file) {
    return NextResponse.json({ error: "Versión no encontrada" }, { status: 404 });
  }

  await removeObjects([version.storage_key]);
  await versions.deleteOne({ _id: version._id });
  await (await usersCollection()).updateOne(
    { _id: ownerId },
    { $inc: { "storage.used_bytes": toLong(-version.size_bytes) } }
  );

  return NextResponse.json({ ok: true });
}

async function findOwnedFile(fileId: string | null | undefined, userId: string) {
  const id = toObjectId(fileId);
  if (!id) return null;

  return (await filesCollection()).findOne({ _id: id, owner_id: new ObjectId(userId) });
}

// Guarda en el historial el contenido que está vigente antes de reemplazarlo
async function archiveCurrentVersion(file: DriveFile, authorId: ObjectId) {
  const version: FileVersion = {
    _id: new ObjectId(),
    file_id: file._id,
    version: toInt(file.current_version),
    size_bytes: toLong(file.size_bytes),
    storage_key: file.storage_key,
    author_id: authorId,
    created_at: file.updated_at ?? file.created_at,
  };

  await (await fileVersionsCollection()).insertOne(version);
}
