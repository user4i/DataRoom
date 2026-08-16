"use client";

import { AppHeader } from "@/components/app-header";
import { useDensityFlags } from "@/lib/density";

export function ExplorerShell({
  children,
  title,
}: {
  children: React.ReactNode;
  title?: string;
}) {
  const { minimal, compact } = useDensityFlags();
  const pad = minimal ? "px-3 py-2" : compact ? "px-4 py-4" : "px-4 py-8";
  return (
    <div className="min-h-screen">
      <AppHeader title={title} />
      <main className={`mx-auto max-w-6xl ${pad}`}>{children}</main>
    </div>
  );
}
