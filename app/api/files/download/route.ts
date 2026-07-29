import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { fileVersionsCollection } from "@/lib/db/collections";
import { toObjectId } from "@/lib/db/bson";
import { getSession } from "@/lib/auth/session";
import { getAccessibleFile } from "@/lib/auth/authorize";
import { createDownloadUrl } from "@/lib/storage/supabase";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const params = new URL(request.url).searchParams;
  const versionId = toObjectId(params.get("version"));
  const version = versionId
    ? await (await fileVersionsCollection()).findOne({ _id: versionId })
    : null;

  // Con ?version se descarga una revisión del historial, sin él la vigente
  const fileId = version ? version.file_id : toObjectId(params.get("id"));
  const file = fileId ? await getAccessibleFile(fileId, new ObjectId(session.sub)) : null;
  if (!file) return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 });

  const storageKey = version ? version.storage_key : file.storage_key;
  const fileName = version ? `v${version.version}-${file.name}` : file.name;

  // El permiso se valida acá y recién entonces se firma la URL del bucket privado
  const url = await createDownloadUrl(storageKey, fileName);
  return NextResponse.redirect(url);
}
