"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api, ApiError } from "@/lib/api";
import type { FileDto } from "@dataroom/shared";
import { detailsFromFile, ItemDetailsList } from "@/components/item-details";
import { formatDateTime } from "@/lib/format";

export function FileViewer({
  roomId,
  fileId,
  publicToken,
}: {
  roomId?: string;
  fileId: string;
  publicToken?: string;
}) {
  const [data, setData] = useState<{
    file: FileDto;
    url: string;
    dataRoomName?: string;
    folderName?: string | null;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [versions, setVersions] = useState<{ id: string; version: number; size: string; createdAt: string }[]>([]);

  useEffect(() => {
    const path = publicToken ? `/public/${publicToken}/files/${fileId}` : `/files/${fileId}`;
    api<{ file: FileDto; url: string; dataRoomName?: string; folderName?: string | null }>(path)
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
            ? "This item is no longer available"
            : err instanceof Error
              ? err.message
              : "Could not open file";
        setError(message);
        toast.error(message);
      });
  }, [fileId, publicToken]);

  const parentFolderId = data?.file.folderId;
  const backHref = publicToken
    ? parentFolderId
      ? `/s/${publicToken}/f/${parentFolderId}`
      : `/s/${publicToken}`
    : parentFolderId
      ? `/rooms/${roomId}/f/${parentFolderId}`
      : `/rooms/${roomId}`;
  const backLabel = publicToken
    ? "Back to shared folder"
    : parentFolderId
      ? "Back to folder"
      : "Back to room";

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
            <iframe title={data.file.name} src={data.url} className="h-[80vh] w-full rounded-lg border bg-white" />
            <aside className="rounded-lg border bg-card p-4">
              <h2 className="mb-3 text-sm font-medium">Details</h2>
              <ItemDetailsList
                details={detailsFromFile(data.file, {
                  location: [data.dataRoomName, data.folderName].filter(Boolean).join(" / "),
                })}
              />
            </aside>
          </div>
        ) : null}
        {versions.length > 0 ? (
          <section className="mt-6">
            <h2 className="text-sm font-medium">Previous versions</h2>
            <ul className="mt-2 divide-y rounded-lg border bg-card text-sm">
              {versions.map((v) => (
                <li key={v.id} className="flex items-center justify-between px-3 py-2">
                  <span className="text-muted-foreground">
                    Version {v.version} · {formatDateTime(v.createdAt)}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      try {
                        const res = await api<{ url: string }>(`/files/${fileId}/versions/${v.id}`);
                        setData((d) => (d ? { ...d, url: res.url } : d));
                      } catch (err) {
                        toast.error(err instanceof Error ? err.message : "Could not open version");
                      }
                    }}
                  >
                    View
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
