"use client";

import { use } from "react";
import { ExplorerShell } from "@/components/explorer-shell";
import { Explorer } from "@/components/Explorer";
import { useI18n } from "@/lib/i18n";

export default function PublicFolderPage({
  params,
}: {
  params: Promise<{ token: string; folderId: string }>;
}) {
  const { token, folderId } = use(params);
  const { t } = useI18n();
  return (
    <ExplorerShell title={t("explorer.publicLinkTitle")}>
      <Explorer publicToken={token} folderId={folderId} />
    </ExplorerShell>
  );
}
