import { redirect } from "next/navigation";
import { ObjectId } from "mongodb";
import { activityLogsCollection } from "@/lib/db/collections";
import { getSession } from "@/lib/auth/session";
import { AppHeader } from "@/components/app-header";
import { Card } from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import type { ActivityAction } from "@/types/activity-log";

const ACTION_LABEL: Record<ActivityAction, string> = {
  login: "Inicio de sesión",
  logout: "Cierre de sesión",
  upload: "Subiste",
  download: "Descargaste",
  delete: "Eliminaste",
  share: "Compartiste",
  rename: "Renombraste",
  move: "Moviste",
  restore: "Restauraste",
};

const RECENT_LIMIT = 200;

export default async function ActivityPage() {
  const session = await getSession();
  if (!session) redirect("/auth/login");

  const logs = await (await activityLogsCollection())
    .find({ user_id: new ObjectId(session.sub) })
    .sort({ created_at: -1 })
    .limit(RECENT_LIMIT)
    .toArray();

  return (
    <>
      <AppHeader userName={session.name} role={session.role} />
      <main className="flex-1 bg-zinc-50 px-6 py-10 dark:bg-black">
        <div className="mx-auto max-w-5xl space-y-6">
          <Card>
            <h1 className="text-xl font-semibold">Mi actividad</h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Últimas {RECENT_LIMIT} acciones registradas en tu cuenta.
            </p>
          </Card>

          <Card>
            {logs.length === 0 ? (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Todavía no hay actividad registrada.
              </p>
            ) : (
              <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {logs.map((log) => (
                  <li key={log._id.toString()} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="text-sm">
                        {ACTION_LABEL[log.action]}
                        {log.resource_name && <> · {log.resource_name}</>}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {formatDateTime(log.created_at)}
                        {log.ip && <> · {log.ip}</>}
                      </p>
                    </div>
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
