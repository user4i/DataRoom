"use client";

import { use } from "react";
import { AppHeader } from "@/components/app-header";
import { Explorer } from "@/components/Explorer";

export default function PublicSharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  return (
    <div className="min-h-screen">
      <AppHeader title="Shared link" />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Explorer publicToken={token} />
      </main>
    </div>
  );
}
