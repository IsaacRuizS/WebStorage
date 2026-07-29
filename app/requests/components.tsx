"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, ErrorText } from "@/components/ui";

export function RequestActions({ id }: { id: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function respond(status: "approved" | "rejected") {
    setError(null);
    setLoading(true);

    const response = await fetch("/api/requests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });

    setLoading(false);

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error ?? "No se pudo responder la solicitud");
      return;
    }

    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      {error && <ErrorText>{error}</ErrorText>}
      <Button disabled={loading} onClick={() => respond("approved")}>
        Aprobar
      </Button>
      <Button variant="secondary" disabled={loading} onClick={() => respond("rejected")}>
        Rechazar
      </Button>
    </div>
  );
}

export function RevokeShareButton({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleRevoke() {
    if (!confirm("¿Quitar el acceso a esta persona?")) return;

    setLoading(true);
    await fetch(`/api/shares?id=${id}`, { method: "DELETE" });
    setLoading(false);
    router.refresh();
  }

  return (
    <Button variant="danger" disabled={loading} onClick={handleRevoke}>
      Quitar acceso
    </Button>
  );
}
