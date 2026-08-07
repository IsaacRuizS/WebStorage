import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { commentsCollection, filesCollection } from "@/lib/db/collections";
import { toObjectId } from "@/lib/db/bson";
import { getSession } from "@/lib/auth/session";
import { getAccessibleFile } from "@/lib/auth/authorize";
import type { Comment } from "@/types/comment";

const createCommentSchema = z.object({
  file_id: z.string(),
  text: z.string().min(1, "El comentario no puede estar vacío"),
});

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const fileId = toObjectId(new URL(request.url).searchParams.get("file_id"));
  if (!fileId) return NextResponse.json({ error: "Falta el file_id" }, { status: 400 });

  const userId = new ObjectId(session.sub);
  const file = await getAccessibleFile(fileId, userId);
  if (!file) return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 });

  const comments = await (await commentsCollection())
    .find({ file_id: fileId })
    .sort({ created_at: -1 })
    .toArray();

  return NextResponse.json(comments);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await request.json();
  const parsed = createCommentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const userId = new ObjectId(session.sub);
  const fileId = toObjectId(parsed.data.file_id);
  const file = fileId ? await getAccessibleFile(fileId, userId) : null;
  if (!file || !fileId) return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 });

  const comment: Comment = {
    _id: new ObjectId(),
    file_id: fileId,
    author_id: userId,
    text: parsed.data.text,
    created_at: new Date(),
    resolved: false,
  };
  await (await commentsCollection()).insertOne(comment);

  return NextResponse.json(comment, { status: 201 });
}

export async function DELETE(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const commentId = toObjectId(new URL(request.url).searchParams.get("id"));
  if (!commentId) return NextResponse.json({ error: "Falta el id" }, { status: 400 });

  const userId = new ObjectId(session.sub);
  const comments = await commentsCollection();
  const comment = await comments.findOne({ _id: commentId });
  if (!comment) return NextResponse.json({ error: "El Comentario no fue encontrado" }, { status: 404 });

  const file = await (await filesCollection()).findOne({ _id: comment.file_id });
  const canDelete = comment.author_id.equals(userId) || file?.owner_id.equals(userId);
  if (!canDelete) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  await comments.deleteOne({ _id: commentId });
  return NextResponse.json({ ok: true });
}