import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { AppHeader } from "@/components/app-header";
import { Card } from "@/components/ui";

export default async function HomePage() {
  const session = await getSession();
  if (!session) redirect("/auth/login");

  return (
    <>
      <AppHeader userName={session.name} role={session.role} />
      <main className="flex-1 bg-zinc-50 px-6 py-10 dark:bg-black">
        <div className="mx-auto max-w-5xl">
          <Card>
            <h1 className="text-xl font-semibold">Hola, {session.name}</h1>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Tu sesión quedó registrada. Desde aquí vas a poder administrar tus carpetas y
              archivos.
            </p>
          </Card>
        </div>
      </main>
    </>
  );
}
