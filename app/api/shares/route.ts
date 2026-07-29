import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { filesCollection, foldersCollection, sharesCollection } from "@/lib/db/collections";
import { toObjectId } from "@/lib/db/bson";
import { getSession } from "@/lib/auth/session";
import type { Share } from "@/types/share";

const createShareSchema = z.object({
  resource_id: z.string(),
  resource_type: z.enum(["file", "folder"]),
  permission: z.enum(["read", "write"]).default("read"),
});

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const shares = await (await sharesCollection())
    .find({ owner_id: new ObjectId(session.sub) })
    .sort({ created_at: -1 })
    .toArray();

  return NextResponse.json(shares);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await request.json();
  const parsed = createShareSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { resource_type, permission } = parsed.data;
  const ownerId = new ObjectId(session.sub);
  const resourceId = toObjectId(parsed.data.resource_id);
  if (!resourceId || !(await ownsResource(resourceId, resource_type, ownerId))) {
    return NextResponse.json({ error: "Recurso no encontrado" }, { status: 404 });
  }

  const shares = await sharesCollection();

  // Pedir el enlace dos veces devuelve el mismo, no llena la colección de tokens sueltos
  const existing = await shares.findOne({
    resource_id: resourceId,
    owner_id: ownerId,
    link_token: { $ne: null },
  });
  if (existing) {
    return NextResponse.json({ token: existing.link_token });
  }

  const share: Share = {
    _id: new ObjectId(),
    resource_id: resourceId,
    resource_type,
    owner_id: ownerId,
    shared_with: null,
    permission,
    link_token: randomBytes(16).toString("hex"),
    created_at: new Date(),
    expires_at: null,
  };
  await shares.insertOne(share);

  return NextResponse.json({ token: share.link_token }, { status: 201 });
}

export async function DELETE(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const shareId = toObjectId(new URL(request.url).searchParams.get("id"));
  if (!shareId) return NextResponse.json({ error: "Falta el id" }, { status: 400 });

  const result = await (await sharesCollection()).deleteOne({
    _id: shareId,
    owner_id: new ObjectId(session.sub),
  });

  if (result.deletedCount === 0) {
    return NextResponse.json({ error: "Compartición no encontrada" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

async function ownsResource(resourceId: ObjectId, type: "file" | "folder", ownerId: ObjectId) {
  const collection = type === "file" ? await filesCollection() : await foldersCollection();
  return Boolean(await collection.findOne({ _id: resourceId, owner_id: ownerId }));
}
