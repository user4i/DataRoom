"use client";

import { use } from "react";
import { ExplorerShell } from "@/components/explorer-shell";
import { Explorer } from "@/components/Explorer";

export default function PublicFolderPage({
  params,
}: {
  params: Promise<{ token: string; folderId: string }>;
}) {
  const { token, folderId } = use(params);
  return (
    <ExplorerShell title="Спільне посилання">
      <Explorer publicToken={token} folderId={folderId} />
    </ExplorerShell>
  );
}
