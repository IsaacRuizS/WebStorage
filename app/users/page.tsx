import { redirect } from "next/navigation";
import { usersCollection } from "@/lib/db/collections";
import { getSession } from "@/lib/auth/session";
import { AppHeader } from "@/components/app-header";
import { Card } from "@/components/ui";
import { UserList } from "@/app/users/components";

export default async function UsersPage() {
  const session = await getSession();
  if (!session) redirect("/auth/login");
  if (session.role !== "admin") redirect("/");

  const users = await (await usersCollection())
    .find({}, { projection: { password_hash: 0 } })
    .sort({ created_at: -1 })
    .toArray();

  return (
    <>
      <AppHeader userName={session.name} role={session.role} />
      <main className="flex-1 bg-zinc-50 px-6 py-10 dark:bg-black">
        <div className="mx-auto max-w-3xl">
          <Card>
            <h1 className="text-xl font-semibold">Usuarios</h1>
            <p className="mt-1 mb-4 text-sm text-zinc-600 dark:text-zinc-400">
              {users.length} cuentas registradas
            </p>
            <UserList
              users={users.map((user) => ({
                id: user._id.toString(),
                name: user.name,
                email: user.email,
                role: user.role,
                active: user.active,
                created_at: user.created_at.toISOString(),
                is_current: user._id.toString() === session.sub,
              }))}
            />
          </Card>
        </div>
      </main>
    </>
  );
}
