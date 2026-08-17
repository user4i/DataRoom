"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { api, API_URL, ApiError } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import type { FileDto } from "@dataroom/shared";
import {
  UploadConflictDialog,
  type ConflictDecision,
  type NameConflict,
} from "@/components/upload-conflict-dialog";

type Item = {
  id: string;
  file: File;
  progress: number;
  status: "queued" | "uploading" | "done" | "error" | "skipped";
  error?: string;
};

type ConflictState = NameConflict & {
  resolve: (decision: ConflictDecision) => void;
};

export function UploadDropzone({
  dataRoomId,
  folderId,
  onUploaded,
  compact = false,
  onBusyChange,
}: {
  dataRoomId: string;
  folderId: string | null;
  onUploaded: (file: FileDto) => void;
  compact?: boolean;
  onBusyChange?: (busy: boolean) => void;
}) {
  const { t } = useI18n();
  const [items, setItems] = useState<Item[]>([]);
  const [drag, setDrag] = useState(false);
  const [conflict, setConflict] = useState<ConflictState | null>(null);
  const conflictLock = useRef(Promise.resolve());

  const askConflict = useCallback((payload: NameConflict) => {
    return new Promise<ConflictDecision>((resolve) => {
      const run = () =>
        new Promise<void>((done) => {
          let settled = false;
          setConflict({
            ...payload,
            resolve: (decision) => {
              if (settled) return;
              settled = true;
              setConflict(null);
              resolve(decision);
              done();
            },
          });
        });
      conflictLock.current = conflictLock.current.then(run, run);
    });
  }, []);

  const uploadOne = useCallback(
    async (item: Item, uploadName: string, conflictMode?: "replace" | "keep_both") => {
      const update = (patch: Partial<Item>) =>
        setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, ...patch } : it)));
      try {
        if (item.file.type && item.file.type !== "application/pdf" && !item.file.name.toLowerCase().endsWith(".pdf")) {
          throw new Error(t("upload.pdfOnly"));
        }
        update({ status: "uploading", progress: 5 });
        const presign = await api<{ storageKey: string; uploadUrl: string }>("/files/presign", {
          method: "POST",
          body: JSON.stringify({
            dataRoomId,
            folderId: folderId ?? undefined,
            name: uploadName,
            mimeType: item.file.type || "application/pdf",
            size: item.file.size,
          }),
        });
        await putWithProgress(presign.uploadUrl, item.file, (pct) => update({ progress: Math.max(10, Math.min(90, pct)) }), {
          saveFailed: t("upload.saveFailed"),
          connectFailed: t("upload.connectFailed", { url: API_URL }),
        });
        const created = await api<FileDto>("/files", {
          method: "POST",
          body: JSON.stringify({
            dataRoomId,
            folderId: folderId ?? undefined,
            name: uploadName,
            size: item.file.size,
            storageKey: presign.storageKey,
            mimeType: item.file.type || "application/pdf",
            ...(conflictMode ? { conflict: conflictMode } : {}),
          }),
        });
        update({ status: "done", progress: 100 });
        onUploaded(created);
      } catch (error) {
        const message = error instanceof ApiError || error instanceof Error ? error.message : t("upload.failed");
        update({ status: "error", error: message });
        toast.error(message);
      }
    },
    [dataRoomId, folderId, onUploaded, t],
  );

  const processItem = useCallback(
    async (item: Item) => {
      const update = (patch: Partial<Item>) =>
        setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, ...patch } : it)));
      try {
        const query = new URLSearchParams({ name: item.file.name });
        if (folderId) query.set("folderId", folderId);
        const check = await api<{
          existing: FileDto | null;
          suggestedNewName: string;
          suggestedOldName: string;
        }>(`/data-rooms/${dataRoomId}/file-conflict?${query.toString()}`);

        if (!check.existing) {
          await uploadOne(item, item.file.name);
          return;
        }

        update({ status: "queued" });
        const decision = await askConflict({
          existing: check.existing,
          suggestedNewName: check.suggestedNewName,
          suggestedOldName: check.suggestedOldName,
          incomingName: item.file.name,
        });

        if (decision.action === "skip") {
          update({ status: "skipped" });
          return;
        }
        if (decision.action === "rename_old" || decision.action === "rename_both") {
          await api(`/files/${check.existing.id}`, {
            method: "PATCH",
            body: JSON.stringify({ name: decision.oldName }),
          });
        }
        if (decision.action === "replace") {
          await uploadOne(item, item.file.name, "replace");
          return;
        }
        if (decision.action === "keep_both") {
          await uploadOne(item, item.file.name, "keep_both");
          return;
        }
        if (decision.action === "rename_new" || decision.action === "rename_both") {
          await uploadOne(item, decision.newName);
          return;
        }
        await uploadOne(item, item.file.name);
      } catch (error) {
        const message = error instanceof ApiError || error instanceof Error ? error.message : t("upload.failed");
        update({ status: "error", error: message });
        toast.error(message);
      }
    },
    [askConflict, dataRoomId, folderId, uploadOne, t],
  );

  const queueFiles = (fileList: FileList | File[]) => {
    const next = Array.from(fileList).map((file) => ({
      id: `${file.name}-${file.size}-${crypto.randomUUID()}`,
      file,
      progress: 0,
      status: "queued" as const,
    }));
    setItems((prev) => [...next, ...prev]);
    next.forEach((item) => void processItem(item));
  };

  const busy = items.some((i) => i.status === "queued" || i.status === "uploading") || Boolean(conflict);
  useEffect(() => {
    onBusyChange?.(busy);
  }, [busy, onBusyChange]);

  return (
    <div className="space-y-3">
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          if (e.dataTransfer.files.length) queueFiles(e.dataTransfer.files);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed text-center transition ${
          compact ? "px-4 py-4" : "px-6 py-8"
        } ${drag ? "border-primary bg-accent" : "bg-card hover:bg-accent/40"}`}
      >
        <p className="font-medium">{t("upload.drop")}</p>
        <p className="mt-1 text-sm text-muted-foreground">{t("upload.hint")}</p>
        <input
          type="file"
          accept="application/pdf,.pdf"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) queueFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </label>
      {items.length > 0 ? (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id} className="rounded-lg border bg-card p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="truncate font-medium">{item.file.name}</span>
                <span className="text-muted-foreground">
                  {item.status === "done"
                    ? t("upload.done")
                    : item.status === "skipped"
                      ? t("upload.skipped")
                      : item.status === "error"
                        ? item.error
                        : conflict?.incomingName === item.file.name
                          ? t("upload.waiting")
                          : `${item.progress}%`}
                </span>
              </div>
              {item.status !== "error" && item.status !== "done" && item.status !== "skipped" ? (
                <Progress className="mt-2" value={item.progress} />
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      {items.some((i) => i.status === "error" || i.status === "done" || i.status === "skipped") ? (
        <Button variant="ghost" size="sm" onClick={() => setItems([])}>
          {t("upload.clear")}
        </Button>
      ) : null}
      <UploadConflictDialog
        conflict={conflict}
        onResolve={(decision) => conflict?.resolve(decision)}
      />
    </div>
  );
}

function putWithProgress(
  url: string,
  file: File,
  onProgress: (pct: number) => void,
  errors: { saveFailed: string; connectFailed: string },
) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type || "application/pdf");
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(errors.saveFailed));
    };
    xhr.onerror = () => reject(new Error(errors.connectFailed));
    xhr.send(file);
  });
}
