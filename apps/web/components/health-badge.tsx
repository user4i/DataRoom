"use client";

import { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export function HealthBadge() {
  const [status, setStatus] = useState<"checking" | "ok" | "down">("checking");

  useEffect(() => {
    fetch(`${API_URL}/health`)
      .then((res) => (res.ok ? setStatus("ok") : setStatus("down")))
      .catch(() => setStatus("down"));
  }, []);

  const label =
    status === "ok" ? "API healthy" : status === "down" ? "API unreachable" : "Checking API…";

  return (
    <div className="inline-flex w-fit items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-sm">
      <span
        className={
          status === "ok"
            ? "size-2 rounded-full bg-emerald-500"
            : status === "down"
              ? "size-2 rounded-full bg-red-500"
              : "size-2 animate-pulse rounded-full bg-zinc-400"
        }
      />
      {label}
    </div>
  );
}
