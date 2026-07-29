import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";
import type { UserRole } from "@/types/user";

export function AppHeader({ userName, role }: { userName: string; role: UserRole }) {
  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" className="font-semibold">
          WebStorage
        </Link>
        <div className="flex items-center gap-4 text-sm text-zinc-600 dark:text-zinc-400">
          {role === "admin" && (
            <Link href="/users" className="hover:text-zinc-900 dark:hover:text-white">
              Usuarios
            </Link>
          )}
          <Link href="/profile" className="hover:text-zinc-900 dark:hover:text-white">
            {userName}
          </Link>
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
