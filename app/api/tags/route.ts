import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { tagsCollection, filesCollection } from "@/lib/db/collections";
import { toObjectId } from "@/lib/db/bson";
import { getSession } from "@/lib/auth/session";
import type { Tag } from "@/types/tag";

const createTagSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  color: z.string().min(1).default("#6b7280"),
});

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const tags = await (await tagsCollection())
    .find({ owner_id: new ObjectId(session.sub) })
    .sort({ name: 1 })
    .toArray();

  return NextResponse.json(tags);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await request.json();
  const parsed = createTagSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const ownerId = new ObjectId(session.sub);
  const tags = await tagsCollection();

  const existing = await tags.findOne({ owner_id: ownerId, name: parsed.data.name });
  if (existing) {
    return NextResponse.json({ error: "Ya existe una etiqueta con ese nombre" }, { status: 409 });
  }

  const tag: Tag = {
    _id: new ObjectId(),
    owner_id: ownerId,
    name: parsed.data.name,
    color: parsed.data.color,
  };
  await tags.insertOne(tag);

  return NextResponse.json(tag, { status: 201 });
}

export async function DELETE(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const tagId = toObjectId(new URL(request.url).searchParams.get("id"));
  if (!tagId) return NextResponse.json({ error: "Falta el id" }, { status: 400 });

  const ownerId = new ObjectId(session.sub);
  const tags = await tagsCollection();
  const tag = await tags.findOne({ _id: tagId, owner_id: ownerId });
  if (!tag) return NextResponse.json({ error: "Etiqueta no encontrada" }, { status: 404 });

  await tags.deleteOne({ _id: tagId });

  // Quita la etiqueta de los archivos del usuartio que la tengan 
  await (await filesCollection()).updateMany(
    { owner_id: ownerId, tags: tag.name },
    { $pull: { tags: tag.name } }
  );

  return NextResponse.json({ ok: true });
}