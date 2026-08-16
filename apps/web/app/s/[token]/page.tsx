"use client";

import { use } from "react";
import { ExplorerShell } from "@/components/explorer-shell";
import { Explorer } from "@/components/Explorer";

export default function PublicSharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  return (
    <ExplorerShell title="Shared link">
      <Explorer publicToken={token} />
    </ExplorerShell>
  );
}
