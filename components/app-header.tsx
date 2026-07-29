import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";

export function AppHeader({ userName }: { userName: string }) {
  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" className="font-semibold">
          WebStorage
        </Link>
        <div className="flex items-center gap-4 text-sm text-zinc-600 dark:text-zinc-400">
          <span>{userName}</span>
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
