import { ObjectId } from "mongodb";
import { filesCollection, foldersCollection, sharesCollection } from "@/lib/db/collections";
import type { DriveFile } from "@/types/file";
import type { Folder } from "@/types/folder";

export async function getAccessibleFile(fileId: ObjectId, userId: ObjectId) {
  const file = await (await filesCollection()).findOne({ _id: fileId });
  if (!file) return null;

  return file.owner_id.equals(userId) || (await isFileShared(file, userId)) ? file : null;
}

export async function getAccessibleFolder(folderId: ObjectId, userId: ObjectId) {
  const folder = await (await foldersCollection()).findOne({ _id: folderId });
  if (!folder) return null;

  return folder.owner_id.equals(userId) || (await isFolderShared(folder, userId)) ? folder : null;
}

async function isFileShared(file: DriveFile, userId: ObjectId) {
  const shares = await sharesCollection();
  const direct = await shares.findOne({
    resource_id: file._id,
    resource_type: "file",
    shared_with: userId,
  });
  if (direct) return true;
  if (!file.folder_id) return false;

  // Un archivo también es visible si vive dentro de una carpeta compartida
  const folder = await (await foldersCollection()).findOne({ _id: file.folder_id });
  return folder ? isFolderShared(folder, userId) : false;
}

async function isFolderShared(folder: Folder, userId: ObjectId) {
  const sharedFolders = await findFoldersSharedWith(userId);

  return sharedFolders.some(
    (shared) => folder.path === shared.path || folder.path.startsWith(`${shared.path}/`)
  );
}

export async function findFoldersSharedWith(userId: ObjectId) {
  const shares = await (await sharesCollection())
    .find({ resource_type: "folder", shared_with: userId })
    .toArray();
  if (shares.length === 0) return [];

  return (await foldersCollection())
    .find({ _id: { $in: shares.map((share) => share.resource_id) } })
    .toArray();
}
