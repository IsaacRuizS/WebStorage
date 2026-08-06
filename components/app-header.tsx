"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  ChevronDown,
  HardDrive,
  Inbox,
  LogOut,
  MoreHorizontal,
  Settings,
  Share2,
  Trash2,
  UserCircle,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useClickOutside } from "@/lib/hooks";
import { NotificationsMenu } from "@/components/notifications-menu";
import type { UserRole } from "@/types/user";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const PRIMARY_NAV: NavItem[] = [
  { href: "/drive", label: "Mi unidad", icon: HardDrive },
  { href: "/shared", label: "Compartidos", icon: Share2 },
  { href: "/trash", label: "Papelera", icon: Trash2 },
];

const SECONDARY_NAV: NavItem[] = [
  { href: "/requests", label: "Solicitudes", icon: Inbox },
  { href: "/activity", label: "Actividad", icon: Activity },
];

const ADMIN_NAV_ITEM: NavItem = { href: "/users", label: "Usuarios", icon: Users };

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

const navLinkClasses = (active: boolean) =>
  `flex items-center gap-1.5 rounded-md px-3 py-2 text-sm transition-colors ${
    active
      ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-white"
      : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
  }`;

const menuItemClasses = (active: boolean) =>
  `flex items-center gap-2 px-3 py-2 text-sm ${
    active
      ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-white"
      : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800"
  }`;

export function AppHeader({ userName, role }: { userName: string; role: UserRole }) {
  const pathname = usePathname();
  const secondaryItems = role === "admin" ? [...SECONDARY_NAV, ADMIN_NAV_ITEM] : SECONDARY_NAV;
  const isSecondaryActive = secondaryItems.some((item) => isActive(pathname, item.href));

  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/drive" className="font-semibold">
          WebStorage
        </Link>
        <nav className="flex items-center gap-1">
          {PRIMARY_NAV.map((item) => (
            <Link key={item.href} href={item.href} className={navLinkClasses(isActive(pathname, item.href))}>
              <item.icon aria-hidden size={16} />
              {item.label}
            </Link>
          ))}
          <NavDropdown
            label="Más"
            icon={MoreHorizontal}
            items={secondaryItems}
            active={isSecondaryActive}
            pathname={pathname}
          />
          <NotificationsMenu />
          <AccountMenu userName={userName} />
        </nav>
      </div>
    </header>
  );
}

function NavDropdown({
  label,
  icon: Icon,
  items,
  active,
  pathname,
}: {
  label: string;
  icon: LucideIcon;
  items: NavItem[];
  active: boolean;
  pathname: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useClickOutside<HTMLDivElement>(() => setOpen(false));

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((value) => !value)} className={navLinkClasses(active)}>
        <Icon aria-hidden size={16} />
        {label}
      </button>
      {open && (
        <div className="absolute right-0 z-10 mt-1 w-44 rounded-md border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={menuItemClasses(isActive(pathname, item.href))}
            >
              <item.icon aria-hidden size={16} />
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function AccountMenu({ userName }: { userName: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useClickOutside<HTMLDivElement>(() => setOpen(false));

  async function handleLogout() {
    setLoading(true);
    await fetch("/api/auth/logout", { method: "POST" });

    // Navegación dura para que no quede nada de la sesión anterior en el caché del router
    window.location.href = "/auth/login";
  }

  return (
    <div ref={ref} className="relative ml-1">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={`${navLinkClasses(false)} max-w-40`}
      >
        <UserCircle aria-hidden size={16} />
        <span className="truncate">{userName}</span>
        <ChevronDown aria-hidden size={14} className="text-zinc-400" />
      </button>
      {open && (
        <div className="absolute right-0 z-10 mt-1 w-44 rounded-md border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
          <Link href="/profile" onClick={() => setOpen(false)} className={menuItemClasses(false)}>
            <Settings aria-hidden size={16} />
            Perfil
          </Link>
          <button
            type="button"
            disabled={loading}
            onClick={handleLogout}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-zinc-50 disabled:pointer-events-none disabled:opacity-50 dark:text-red-400 dark:hover:bg-zinc-800"
          >
            <LogOut aria-hidden size={16} />
            {loading ? "Saliendo..." : "Cerrar sesión"}
          </button>
        </div>
      )}
    </div>
  );
}
