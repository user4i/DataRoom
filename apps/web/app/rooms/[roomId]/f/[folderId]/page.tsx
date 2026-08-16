"use client";

import { AuthGate } from "@/components/auth-gate";
import { ExplorerShell } from "@/components/explorer-shell";
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
      <ExplorerShell>
        <Explorer roomId={roomId} folderId={folderId} />
      </ExplorerShell>
    </AuthGate>
  );
}
