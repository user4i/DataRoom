"use client";

import { AuthGate } from "@/components/auth-gate";
import { ExplorerShell } from "@/components/explorer-shell";
import { Explorer } from "@/components/Explorer";
import { use } from "react";

export default function RoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = use(params);
  return (
    <AuthGate>
      <ExplorerShell>
        <Explorer roomId={roomId} />
      </ExplorerShell>
    </AuthGate>
  );
}
