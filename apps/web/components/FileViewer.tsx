"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { AppHeader } from "@/components/app-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api, ApiError } from "@/lib/api";
import type { FileDto } from "@dataroom/shared";
import { detailsFromFile, ItemDetailsList } from "@/components/item-details";
import { FileVersionsDialog } from "@/components/file-versions-dialog";
import { useI18n } from "@/lib/i18n";

export function FileViewer({
  roomId,
  fileId,
  publicToken,
}: {
  roomId?: string;
  fileId: string;
  publicToken?: string;
}) {
  const { t } = useI18n();
  const [data, setData] = useState<{
    file: FileDto;
    url: string | null;
    dataRoomName?: string;
    folderName?: string | null;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [versionsOpen, setVersionsOpen] = useState(false);

  useEffect(() => {
    const path = publicToken ? `/public/${publicToken}/files/${fileId}` : `/files/${fileId}`;
    api<{ file: FileDto; url: string | null; dataRoomName?: string; folderName?: string | null }>(path)
      .then(setData)
      .catch((err) => {
        const message =
          err instanceof ApiError && (err.status === 404 || err.status === 403)
            ? t("explorer.itemGone")
            : err instanceof Error
              ? err.message
              : t("viewer.openFailed");
        setError(message);
        toast.error(message);
      });
  }, [fileId, publicToken, t]);

  const parentFolderId = data?.file.folderId;
  const backHref = publicToken
    ? parentFolderId
      ? `/s/${publicToken}/f/${parentFolderId}`
      : `/s/${publicToken}`
    : parentFolderId
      ? `/rooms/${roomId}/f/${parentFolderId}`
      : `/rooms/${roomId}`;
  const backLabel = publicToken
    ? t("viewer.backShared")
    : parentFolderId
      ? t("viewer.backFolder")
      : t("viewer.backRoom");

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <Button asChild variant="outline" size="sm">
              <Link href={backHref}>{backLabel}</Link>
            </Button>
            <h1 className="mt-3 text-xl font-semibold">{data?.file.name ?? "PDF"}</h1>
          </div>
          {data && !publicToken ? (
            <Button variant="outline" size="sm" onClick={() => setVersionsOpen(true)}>
              {t("versions.open")}
            </Button>
          ) : null}
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {!data && !error ? <Skeleton className="h-[80vh] w-full" /> : null}
        {data ? (
          <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
            {data.url ? (
              <iframe title={data.file.name} src={data.url} className="h-[80vh] w-full rounded-lg border bg-background" />
            ) : (
              <div className="flex h-[80vh] w-full items-center">
                <EmptyState
                  title={t("viewer.missingTitle")}
                  description={t("viewer.missingDescription")}
                />
              </div>
            )}
            <aside className="rounded-lg border bg-card p-4">
              <h2 className="mb-3 text-sm font-medium">{t("viewer.details")}</h2>
              <ItemDetailsList
                details={detailsFromFile(data.file, {
                  location: [data.dataRoomName, data.folderName].filter(Boolean).join(" / "),
                  canAnalyze: !publicToken,
                })}
                onOpenVersions={!publicToken ? () => setVersionsOpen(true) : undefined}
              />
            </aside>
          </div>
        ) : null}
      </main>
      {!publicToken ? (
        <FileVersionsDialog fileId={fileId} open={versionsOpen} onOpenChange={setVersionsOpen} />
      ) : null}
    </div>
  );
}
