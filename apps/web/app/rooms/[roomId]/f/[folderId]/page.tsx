"use client";

import { AuthGate } from "@/components/auth-gate";
import { AppHeader } from "@/components/app-header";
import { Explorer } from "@/components/Explorer";
import { use } from "react";

export default function FolderPage({
  params,
}: {
  params: Promise<{ roomId: string; folderId: string }>;
}) {
  const { roomId, folderId } = use(params);
  return (
    <AuthGate>
      <div className="min-h-screen">
        <AppHeader />
        <main className="mx-auto max-w-6xl px-4 py-8">
          <Explorer roomId={roomId} folderId={folderId} />
        </main>
      </div>
    </AuthGate>
  );
}
