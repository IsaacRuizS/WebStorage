import Link from "next/link";
import { redirect } from "next/navigation";
import { ObjectId } from "mongodb";
import { sessionsCollection, usersCollection } from "@/lib/db/collections";
import { getSession } from "@/lib/auth/session";
import { AppHeader } from "@/components/app-header";
import { Card } from "@/components/ui";
import { formatBytes } from "@/lib/format";
import { ProfileForm, SessionList } from "@/app/profile/components";

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) redirect("/auth/login");

  const userId = new ObjectId(session.sub);
  const user = await (await usersCollection()).findOne({ _id: userId });
  if (!user) redirect("/auth/login");

  const sessions = await (await sessionsCollection())
    .find({ user_id: userId })
    .sort({ created_at: -1 })
    .toArray();

  const usedPercentage = Math.min(
    100,
    Math.round((user.storage.used_bytes / user.storage.limit_bytes) * 100)
  );

  return (
    <>
      <AppHeader userName={session.name} role={session.role} />
      <main className="flex-1 bg-zinc-50 px-6 py-10 dark:bg-black">
        <div className="mx-auto max-w-3xl space-y-6">
          <Card>
            <h1 className="text-xl font-semibold">Mi perfil</h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {user.email} · {user.role === "admin" ? "Administrador" : "Usuario"}
            </p>
            <ProfileForm name={user.name} />
            <p className="mt-4 text-sm">
              <Link href="/auth/change-password" className="underline">
                Cambiar contraseña
              </Link>
            </p>
          </Card>

          <Card>
            <h2 className="font-medium">Almacenamiento</h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {formatBytes(user.storage.used_bytes)} de {formatBytes(user.storage.limit_bytes)}
            </p>
            <div className="mt-3 h-2 w-full rounded-full bg-zinc-200 dark:bg-zinc-800">
              <div
                className="h-2 rounded-full bg-zinc-900 dark:bg-white"
                style={{ width: `${usedPercentage}%` }}
              />
            </div>
          </Card>

          <Card>
            <h2 className="font-medium">Ingresos al sistema</h2>
            <SessionList
              sessions={sessions.map((item) => ({
                id: item._id.toString(),
                user_agent: item.user_agent ?? null,
                ip: item.ip ?? null,
                created_at: item.created_at.toISOString(),
                active: item.active,
                is_current: item._id.toString() === session.sid,
              }))}
            />
          </Card>
        </div>
      </main>
    </>
  );
}
