import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import {
  accessRequestsCollection,
  filesCollection,
  foldersCollection,
  sharesCollection,
  usersCollection,
} from "@/lib/db/collections";
import { toObjectId } from "@/lib/db/bson";
import { getSession } from "@/lib/auth/session";
import { createNotification } from "@/lib/notifications";
import type { AccessRequest } from "@/types/access-request";
import type { ResourceType } from "@/types/resource";
import type { Share } from "@/types/share";

const createRequestSchema = z.object({
  token: z.string().min(1, "Falta el enlace de la compartición"),
  permission: z.enum(["read", "write"]).default("read"),
  message: z.string().optional(),
});

const respondRequestSchema = z.object({
  id: z.string(),
  status: z.enum(["approved", "rejected"]),
});

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const userId = new ObjectId(session.sub);
  const requests = await (await accessRequestsCollection())
    .find({ $or: [{ owner_id: userId }, { requester_id: userId }] })
    .sort({ created_at: -1 })
    .toArray();

  return NextResponse.json(requests);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await request.json();
  const parsed = createRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const share = await (await sharesCollection()).findOne({ link_token: parsed.data.token });
  if (!share) return NextResponse.json({ error: "El enlace no es válido" }, { status: 404 });

  const requesterId = new ObjectId(session.sub);
  if (share.owner_id.equals(requesterId)) {
    return NextResponse.json({ error: "El recurso ya es tuyo" }, { status: 400 });
  }

  const requests = await accessRequestsCollection();
  const pending = await requests.findOne({
    resource_id: share.resource_id,
    requester_id: requesterId,
    status: "pending",
  });
  if (pending) {
    return NextResponse.json({ error: "Ya tienes una solicitud pendiente" }, { status: 409 });
  }

  const accessRequest: AccessRequest = {
    _id: new ObjectId(),
    resource_id: share.resource_id,
    resource_type: share.resource_type,
    requester_id: requesterId,
    owner_id: share.owner_id,
    requested_permission: parsed.data.permission,
    status: "pending",
    message: parsed.data.message || null,
    created_at: new Date(),
    responded_at: null,
  };
  await requests.insertOne(accessRequest);

  const [resourceName, requesterUser] = await Promise.all([
    getResourceName(share.resource_id, share.resource_type),
    (await usersCollection()).findOne({ _id: requesterId }, { projection: { name: 1 } }),
  ]);
  await createNotification({
    userId: share.owner_id,
    type: "access_request",
    message: `${requesterUser?.name ?? "Alguien"} solicitó acceso a "${resourceName}"`,
    link: "/requests",
  });

  return NextResponse.json({ id: accessRequest._id.toString() }, { status: 201 });
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await request.json();
  const parsed = respondRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const ownerId = new ObjectId(session.sub);
  const requests = await accessRequestsCollection();
  const requestId = toObjectId(parsed.data.id);

  // Solo el dueño del recurso responde, y solo mientras siga pendiente
  const accessRequest = requestId
    ? await requests.findOne({ _id: requestId, owner_id: ownerId, status: "pending" })
    : null;
  if (!accessRequest) {
    return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });
  }

  await requests.updateOne(
    { _id: accessRequest._id },
    { $set: { status: parsed.data.status, responded_at: new Date() } }
  );

  if (parsed.data.status === "approved") {
    await grantAccess(accessRequest);
  }

  const resourceName = await getResourceName(accessRequest.resource_id, accessRequest.resource_type);
  await createNotification({
    userId: accessRequest.requester_id,
    type: "access_request",
    message:
      parsed.data.status === "approved"
        ? `Tu solicitud de acceso a "${resourceName}" fue aprobada`
        : `Tu solicitud de acceso a "${resourceName}" fue rechazada`,
    link: "/requests",
  });

  return NextResponse.json({ ok: true });
}

async function getResourceName(resourceId: ObjectId, type: ResourceType) {
  const collection = type === "file" ? await filesCollection() : await foldersCollection();
  const doc = await collection.findOne({ _id: resourceId }, { projection: { name: 1 } });
  return doc?.name ?? "un recurso";
}

// Aprobar convierte la solicitud en una compartición directa con el solicitante
async function grantAccess(accessRequest: AccessRequest) {
  const share: Share = {
    _id: new ObjectId(),
    resource_id: accessRequest.resource_id,
    resource_type: accessRequest.resource_type,
    owner_id: accessRequest.owner_id,
    shared_with: accessRequest.requester_id,
    permission: accessRequest.requested_permission,
    link_token: null,
    created_at: new Date(),
    expires_at: null,
  };

  await (await sharesCollection()).insertOne(share);
}
