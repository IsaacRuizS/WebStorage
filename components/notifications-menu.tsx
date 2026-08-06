"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { useClickOutside } from "@/lib/hooks";
import { formatDateTime } from "@/lib/format";

interface NotificationRow {
  id: string;
  message: string;
  link: string | null;
  read: boolean;
  created_at: string;
}

const POLL_INTERVAL_MS = 30000;

async function fetchNotifications() {
  const response = await fetch("/api/notifications");
  if (!response.ok) return null;
  return (await response.json()) as { notifications: NotificationRow[]; unreadCount: number };
}

export function NotificationsMenu() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const ref = useClickOutside<HTMLDivElement>(() => setOpen(false));

  async function load() {
    const data = await fetchNotifications();
    if (!data) return;
    setNotifications(data.notifications);
    setUnreadCount(data.unreadCount);
  }

  // El polling vive dentro del efecto para que el linter distinga esta actualización
  // periódica de un setState disparado por una acción del usuario (como load()).
  useEffect(() => {
    async function poll() {
      const data = await fetchNotifications();
      if (!data) return;
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    }

    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  async function markRead(id: string) {
    setNotifications((items) => items.map((item) => (item.id === id ? { ...item, read: true } : item)));
    setUnreadCount((count) => Math.max(0, count - 1));
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
  }

  async function markAllRead() {
    setNotifications((items) => items.map((item) => ({ ...item, read: true })));
    setUnreadCount(0);
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
  }

  function toggleOpen() {
    if (!open) load();
    setOpen((value) => !value);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={toggleOpen}
        aria-label="Notificaciones"
        className="relative flex items-center rounded-md p-2 text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
      >
        <Bell aria-hidden size={18} />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-medium text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-10 mt-1 w-80 rounded-md border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between border-b border-zinc-200 px-3 py-2 dark:border-zinc-800">
            <p className="text-sm font-medium">Notificaciones</p>
            {unreadCount > 0 && (
              <button type="button" onClick={markAllRead} className="text-xs text-zinc-500 hover:underline">
                Marcar todas como leídas
              </button>
            )}
          </div>
          <ul className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <li className="px-3 py-4 text-center text-sm text-zinc-500">No tienes notificaciones.</li>
            ) : (
              notifications.map((item) => (
                <NotificationItem key={item.id} item={item} onOpen={() => markRead(item.id)} />
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

function NotificationItem({ item, onOpen }: { item: NotificationRow; onOpen: () => void }) {
  const body = (
    <div
      className={`flex flex-col gap-0.5 border-b border-zinc-100 px-3 py-2.5 text-sm last:border-0 dark:border-zinc-800 ${
        item.read
          ? "text-zinc-500 dark:text-zinc-400"
          : "bg-zinc-50 font-medium text-zinc-900 dark:bg-zinc-800/60 dark:text-white"
      }`}
    >
      <span>{item.message}</span>
      <span className="text-xs font-normal text-zinc-400">{formatDateTime(item.created_at)}</span>
    </div>
  );

  if (!item.link) {
    return (
      <li>
        <button
          type="button"
          onClick={onOpen}
          disabled={item.read}
          className="block w-full text-left disabled:cursor-default"
        >
          {body}
        </button>
      </li>
    );
  }

  return (
    <li>
      <Link href={item.link} onClick={onOpen} className="block hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
        {body}
      </Link>
    </li>
  );
}
