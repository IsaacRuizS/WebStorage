import { ObjectId } from "mongodb";
import { foldersCollection } from "@/lib/db/collections";

export function buildPath(parentPath: string, name: string) {
  return `${parentPath}/${name}`;
}

export function descendantsOf(path: string) {
  return { $regex: `^${escapeRegExp(path)}/` };
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Ids de una carpeta y de todas sus carpetas descendientes, para operar el subárbol completo
export async function folderSubtreeIds(ownerId: ObjectId, folder: { _id: ObjectId; path: string }) {
  const descendants = await (await foldersCollection())
    .find({ owner_id: ownerId, path: descendantsOf(folder.path) }, { projection: { _id: 1 } })
    .toArray();

  return [folder._id, ...descendants.map((item) => item._id)];
}
