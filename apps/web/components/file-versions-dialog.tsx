"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { FileDto } from "@dataroom/shared";
import { api, ApiError } from "@/lib/api";
import { formatBytes, formatDateTime } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type VersionRow = {
  id: string;
  version: number;
  size: string;
  createdAt: string;
  current?: boolean;
};

export function FileVersionsDialog({
  fileId,
  open,
  onOpenChange,
}: {
  fileId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t, locale } = useI18n();
  const [file, setFile] = useState<{ file: FileDto; url: string | null } | null>(null);
  const [versions, setVersions] = useState<VersionRow[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLabel, setPreviewLabel] = useState<string>("");

  useEffect(() => {
    if (!open || !fileId) {
      setFile(null);
      setVersions([]);
      setPreviewUrl(null);
      return;
    }
    let cancelled = false;
    Promise.all([
      api<{ file: FileDto; url: string | null }>(`/files/${fileId}`, { progress: false }),
      api<VersionRow[]>(`/files/${fileId}/versions`, { progress: false }),
    ])
      .then(([data, rows]) => {
        if (cancelled) return;
        setFile(data);
        setVersions(rows);
        setPreviewUrl(data.url);
        setPreviewLabel(t("versions.current"));
      })
      .catch((err) => {
        if (!cancelled) toast.error(err instanceof ApiError ? err.message : t("viewer.versionFailed"));
      });
    return () => {
      cancelled = true;
    };
  }, [open, fileId, t]);

  const previous = versions.filter((row) => !row.current);

  const openCurrent = () => {
    setPreviewUrl(file?.url ?? null);
    setPreviewLabel(t("versions.current"));
  };

  const openPrevious = async (row: VersionRow) => {
    if (!fileId) return;
    try {
      const res = await api<{ url: string }>(`/files/${fileId}/versions/${row.id}`);
      setPreviewUrl(res.url);
      setPreviewLabel(t("viewer.version", { n: row.version }));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("viewer.versionFailed"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(90vh,48rem)] max-w-3xl flex-col gap-4 overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle className="pr-6">
            {t("versions.title", { name: file?.file.name ?? "" })}
          </DialogTitle>
        </DialogHeader>
        <div className="min-h-0 space-y-3 overflow-y-auto overscroll-contain pr-1">
          <ul className="divide-y rounded-lg border bg-card text-sm">
            <li className="flex items-center justify-between gap-2 px-3 py-2">
              <span>
                <span className="font-medium">{t("versions.current")}</span>
                {file ? (
                  <span className="ml-2 text-muted-foreground">
                    {formatBytes(file.file.size)} · {formatDateTime(file.file.updatedAt, locale)}
                  </span>
                ) : null}
              </span>
              <Button variant="outline" size="sm" onClick={openCurrent} disabled={!file?.url}>
                {t("viewer.view")}
              </Button>
            </li>
            {previous.map((row) => (
              <li key={row.id} className="flex items-center justify-between gap-2 px-3 py-2">
                <span>
                  <span className="font-medium">{t("viewer.version", { n: row.version })}</span>
                  <span className="ml-2 text-muted-foreground">
                    {formatBytes(row.size)} · {formatDateTime(row.createdAt, locale)}
                  </span>
                </span>
                <Button variant="outline" size="sm" onClick={() => void openPrevious(row)}>
                  {t("viewer.view")}
                </Button>
              </li>
            ))}
          </ul>
          {previous.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("versions.empty")}</p>
          ) : null}
          {previewUrl ? (
            <div>
              <p className="mb-2 text-xs text-muted-foreground">{previewLabel}</p>
              <iframe title={previewLabel} src={previewUrl} className="h-[50vh] w-full rounded-lg border bg-background" />
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
