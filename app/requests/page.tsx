import { redirect } from "next/navigation";
import { ObjectId } from "mongodb";
import {
  accessRequestsCollection,
  filesCollection,
  foldersCollection,
  sharesCollection,
  usersCollection,
} from "@/lib/db/collections";
import { getSession } from "@/lib/auth/session";
import { AppHeader } from "@/components/app-header";
import { Card } from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import { RequestActions, RevokeShareButton } from "@/app/requests/components";

const STATUS_LABEL = {
  pending: "Pendiente",
  approved: "Aprobada",
  rejected: "Rechazada",
};

const PERMISSION_LABEL = {
  read: "solo lectura",
  write: "lectura y escritura",
};

export default async function RequestsPage() {
  const session = await getSession();
  if (!session) redirect("/auth/login");

  const userId = new ObjectId(session.sub);
  const requests = await (await accessRequestsCollection())
    .find({ $or: [{ owner_id: userId }, { requester_id: userId }] })
    .sort({ created_at: -1 })
    .toArray();

  const granted = await (await sharesCollection())
    .find({ owner_id: userId, shared_with: { $ne: null } })
    .sort({ created_at: -1 })
    .toArray();

  const resourceNames = await findResourceNames([
    ...requests.map((item) => item.resource_id),
    ...granted.map((item) => item.resource_id),
  ]);

  const userNames = await findUserNames([
    ...requests.map((item) => item.requester_id),
    ...requests.map((item) => item.owner_id),
    ...granted.flatMap((item) => (item.shared_with ? [item.shared_with] : [])),
  ]);

  const received = requests.filter((item) => item.owner_id.equals(userId));
  const sent = requests.filter((item) => item.requester_id.equals(userId));

  return (
    <>
      <AppHeader userName={session.name} role={session.role} />
      <main className="flex-1 bg-zinc-50 px-6 py-10 dark:bg-black">
        <div className="mx-auto max-w-3xl space-y-6">
          <Card>
            <h1 className="text-xl font-semibold">Solicitudes recibidas</h1>
            {received.length === 0 ? (
              <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
                Nadie te ha solicitado acceso.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-zinc-200 dark:divide-zinc-800">
                {received.map((item) => (
                  <li
                    key={item._id.toString()}
                    className="flex flex-wrap items-center justify-between gap-3 py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm">
                        {userNames.get(item.requester_id.toString()) ?? "Usuario"} pide{" "}
                        {PERMISSION_LABEL[item.requested_permission]} sobre{" "}
                        <strong>{resourceNames.get(item.resource_id.toString()) ?? "recurso"}</strong>
                      </p>
                      <p className="text-xs text-zinc-500">
                        {formatDateTime(item.created_at)} · {STATUS_LABEL[item.status]}
                        {item.message && ` · "${item.message}"`}
                      </p>
                    </div>
                    {item.status === "pending" && <RequestActions id={item._id.toString()} />}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <h2 className="font-medium">Mis solicitudes enviadas</h2>
            {sent.length === 0 ? (
              <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
                No has solicitado acceso a nada.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-zinc-200 dark:divide-zinc-800">
                {sent.map((item) => (
                  <li key={item._id.toString()} className="py-3">
                    <p className="text-sm">
                      {resourceNames.get(item.resource_id.toString()) ?? "Recurso"} ·{" "}
                      {PERMISSION_LABEL[item.requested_permission]}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {formatDateTime(item.created_at)} · {STATUS_LABEL[item.status]}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <h2 className="font-medium">Accesos concedidos</h2>
            {granted.length === 0 ? (
              <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
                No has concedido acceso a nadie.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-zinc-200 dark:divide-zinc-800">
                {granted.map((item) => (
                  <li
                    key={item._id.toString()}
                    className="flex flex-wrap items-center justify-between gap-3 py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm">
                        {resourceNames.get(item.resource_id.toString()) ?? "Recurso"} →{" "}
                        {userNames.get(item.shared_with?.toString() ?? "") ?? "Usuario"}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {PERMISSION_LABEL[item.permission]} · {formatDateTime(item.created_at)}
                      </p>
                    </div>
                    <RevokeShareButton id={item._id.toString()} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </main>
    </>
  );
}

// Los recursos pueden ser archivos o carpetas, así que se resuelven ambos y se unen por id
async function findResourceNames(ids: ObjectId[]) {
  if (ids.length === 0) return new Map<string, string>();

  const files = await (await filesCollection()).find({ _id: { $in: ids } }).toArray();
  const folders = await (await foldersCollection()).find({ _id: { $in: ids } }).toArray();

  return new Map(
    [...files, ...folders].map((item) => [item._id.toString(), item.name] as const)
  );
}

async function findUserNames(ids: ObjectId[]) {
  if (ids.length === 0) return new Map<string, string>();

  const users = await (await usersCollection()).find({ _id: { $in: ids } }).toArray();
  return new Map(users.map((user) => [user._id.toString(), user.name] as const));
}
