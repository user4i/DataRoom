"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { api, API_URL, ApiError } from "@/lib/api";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import type { FileDto } from "@dataroom/shared";

type Item = {
  id: string;
  file: File;
  progress: number;
  status: "queued" | "uploading" | "done" | "error";
  error?: string;
};

export function UploadDropzone({
  dataRoomId,
  folderId,
  onUploaded,
}: {
  dataRoomId: string;
  folderId: string | null;
  onUploaded: (file: FileDto) => void;
}) {
  const [items, setItems] = useState<Item[]>([]);
  const [drag, setDrag] = useState(false);

  const uploadOne = useCallback(
    async (item: Item) => {
      const update = (patch: Partial<Item>) =>
        setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, ...patch } : it)));
      try {
        if (item.file.type && item.file.type !== "application/pdf" && !item.file.name.toLowerCase().endsWith(".pdf")) {
          throw new Error("Only PDF files are allowed");
        }
        update({ status: "uploading", progress: 5 });
        const presign = await api<{ storageKey: string; uploadUrl: string }>("/files/presign", {
          method: "POST",
          body: JSON.stringify({
            dataRoomId,
            folderId: folderId ?? undefined,
            name: item.file.name,
            mimeType: item.file.type || "application/pdf",
            size: item.file.size,
          }),
        });
        await putWithProgress(presign.uploadUrl, item.file, (pct) => update({ progress: Math.max(10, Math.min(90, pct)) }));
        const created = await api<FileDto>("/files", {
          method: "POST",
          body: JSON.stringify({
            dataRoomId,
            folderId: folderId ?? undefined,
            name: item.file.name,
            size: item.file.size,
            storageKey: presign.storageKey,
            mimeType: item.file.type || "application/pdf",
          }),
        });
        update({ status: "done", progress: 100 });
        onUploaded(created);
      } catch (error) {
        const message = error instanceof ApiError || error instanceof Error ? error.message : "Upload failed";
        update({ status: "error", error: message });
        toast.error(message);
      }
    },
    [dataRoomId, folderId, onUploaded],
  );

  const queueFiles = (fileList: FileList | File[]) => {
    const next = Array.from(fileList).map((file) => ({
      id: `${file.name}-${file.size}-${crypto.randomUUID()}`,
      file,
      progress: 0,
      status: "queued" as const,
    }));
    setItems((prev) => [...next, ...prev]);
    next.forEach((item) => void uploadOne(item));
  };

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
        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-6 py-8 text-center transition ${
          drag ? "border-primary bg-accent" : "bg-card hover:bg-accent/40"
        }`}
      >
        <p className="font-medium">Drop PDFs here or click to upload</p>
        <p className="mt-1 text-sm text-muted-foreground">Multiple files supported · PDF only · max 50 MB each</p>
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
                  {item.status === "done" ? "Uploaded" : item.status === "error" ? item.error : `${item.progress}%`}
                </span>
              </div>
              {item.status !== "error" && item.status !== "done" ? <Progress className="mt-2" value={item.progress} /> : null}
            </li>
          ))}
        </ul>
      ) : null}
      {items.some((i) => i.status === "error" || i.status === "done") ? (
        <Button variant="ghost" size="sm" onClick={() => setItems([])}>
          Clear list
        </Button>
      ) : null}
    </div>
  );
}

function putWithProgress(url: string, file: File, onProgress: (pct: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type || "application/pdf");
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error("Could not store the file"));
    };
    xhr.onerror = () => reject(new Error(`Could not reach storage (${API_URL})`));
    xhr.send(file);
  });
}
