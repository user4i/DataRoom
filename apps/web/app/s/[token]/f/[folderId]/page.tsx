"use client";

import { use } from "react";
import { AppHeader } from "@/components/app-header";
import { Explorer } from "@/components/Explorer";

export default function PublicFolderPage({
  params,
}: {
  params: Promise<{ token: string; folderId: string }>;
}) {
  const { token, folderId } = use(params);
  return (
    <div className="min-h-screen">
      <AppHeader title="Shared link" />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Explorer publicToken={token} folderId={folderId} />
      </main>
    </div>
  );
}
