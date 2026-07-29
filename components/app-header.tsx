"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import type { UserRole } from "@/types/user";

export function AppHeader({ userName, role }: { userName: string; role: UserRole }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/auth/login");
    router.refresh();
  }

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
          <Button variant="secondary" onClick={handleLogout} disabled={loading}>
            {loading ? "Saliendo..." : "Cerrar sesión"}
          </Button>
        </div>
      </div>
    </header>
  );
}
