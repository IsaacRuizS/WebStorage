import { createClient } from "@supabase/supabase-js";

const SIGNED_URL_SECONDS = 60;

function getBucket() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Faltan las credenciales de Supabase en .env.local");
  }

  const client = createClient(url, key, { auth: { persistSession: false } });
  return client.storage.from(process.env.SUPABASE_BUCKET ?? "files");
}

// La versión va en la llave para que cada revisión conserve su propio objeto
export function buildStorageKey(ownerId: string, fileId: string, version: number) {
  return `${ownerId}/${fileId}/v${version}`;
}

export async function uploadObject(key: string, file: File) {
  const { error } = await getBucket().upload(key, file, { contentType: file.type });
  if (error) throw new Error(error.message);
}

// El bucket es privado: la descarga necesita un enlace firmado de vida corta
export async function createDownloadUrl(key: string, fileName: string) {
  const { data, error } = await getBucket().createSignedUrl(key, SIGNED_URL_SECONDS, {
    download: fileName,
  });

  if (error || !data) {
    throw new Error(error?.message ?? "No se pudo generar el enlace de descarga");
  }

  return data.signedUrl;
}

// Restaurar copia el objeto del lado de Supabase, sin descargarlo ni volverlo a subir
export async function copyObject(fromKey: string, toKey: string) {
  const { error } = await getBucket().copy(fromKey, toKey);
  if (error) throw new Error(error.message);
}

export async function removeObjects(keys: string[]) {
  if (keys.length === 0) return;

  const { error } = await getBucket().remove(keys);
  if (error) throw new Error(error.message);
}
