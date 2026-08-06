import { ObjectId } from "mongodb";
import { fileVersionsCollection, filesCollection, usersCollection } from "@/lib/db/collections";
import { toLong } from "@/lib/db/bson";
import { removeObjects } from "@/lib/storage/supabase";

// Mueve archivos a la papelera: solo cambia su estado, no libera espacio ni toca el storage
export async function trashFiles(ownerId: ObjectId, fileIds: ObjectId[]) {
  if (fileIds.length === 0) return;

  await (await filesCollection()).updateMany(
    { _id: { $in: fileIds }, owner_id: ownerId },
    { $set: { in_trash: true, deleted_at: new Date() } }
  );
}

// Saca archivos de la papelera, dejándolos como estaban antes de eliminarse
export async function restoreFiles(ownerId: ObjectId, fileIds: ObjectId[]) {
  if (fileIds.length === 0) return;

  await (await filesCollection()).updateMany(
    { _id: { $in: fileIds }, owner_id: ownerId },
    { $set: { in_trash: false, deleted_at: null } }
  );
}

// Borra archivos con todas sus versiones para siempre y devuelve al usuario el espacio que ocupaban
export async function purgeFiles(ownerId: ObjectId, fileIds: ObjectId[]) {
  if (fileIds.length === 0) return;

  const files = await filesCollection();
  const versions = await fileVersionsCollection();

  const documents = await files.find({ _id: { $in: fileIds }, owner_id: ownerId }).toArray();
  const history = await versions.find({ file_id: { $in: fileIds } }).toArray();

  const releasedBytes = [...documents, ...history].reduce(
    (total, item) => total + item.size_bytes,
    0
  );

  await removeObjects([...documents, ...history].map((item) => item.storage_key));
  await versions.deleteMany({ file_id: { $in: fileIds } });
  await files.deleteMany({ _id: { $in: fileIds }, owner_id: ownerId });
  await (await usersCollection()).updateOne(
    { _id: ownerId },
    { $inc: { "storage.used_bytes": toLong(-releasedBytes) } }
  );
}

export function getExtension(fileName: string) {
  const index = fileName.lastIndexOf(".");
  return index > 0 ? fileName.slice(index + 1).toLowerCase() : "";
}
