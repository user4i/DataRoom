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
import { formatDateTime } from "@/lib/format";
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
  const { t, locale } = useI18n();
  const [data, setData] = useState<{
    file: FileDto;
    url: string | null;
    dataRoomName?: string;
    folderName?: string | null;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [versions, setVersions] = useState<{ id: string; version: number; size: string; createdAt: string }[]>([]);

  useEffect(() => {
    const path = publicToken ? `/public/${publicToken}/files/${fileId}` : `/files/${fileId}`;
    api<{ file: FileDto; url: string | null; dataRoomName?: string; folderName?: string | null }>(path)
      .then((res) => {
        setData(res);
        if (!publicToken) {
          api<{ id: string; version: number; size: string; createdAt: string }[]>(`/files/${fileId}/versions`)
            .then(setVersions)
            .catch(() => undefined);
        }
      })
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
              />
            </aside>
          </div>
        ) : null}
        {versions.length > 0 ? (
          <section className="mt-6">
            <h2 className="text-sm font-medium">{t("viewer.versions")}</h2>
            <ul className="mt-2 divide-y rounded-lg border bg-card text-sm">
              {versions.map((v) => (
                <li key={v.id} className="flex items-center justify-between px-3 py-2">
                  <span className="text-muted-foreground">
                    {t("viewer.version", { n: v.version })} · {formatDateTime(v.createdAt, locale)}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      try {
                        const res = await api<{ url: string }>(`/files/${fileId}/versions/${v.id}`);
                        setData((d) => (d ? { ...d, url: res.url } : d));
                      } catch (err) {
                        toast.error(err instanceof Error ? err.message : t("viewer.versionFailed"));
                      }
                    }}
                  >
                    {t("viewer.view")}
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </main>
    </div>
  );
}
