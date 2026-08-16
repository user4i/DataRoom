"use client";

import { useEffect, useState } from "react";
import type { FileDto, FolderDto, OwnerDto, ResourceType, ShareDto } from "@dataroom/shared";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api, ApiError } from "@/lib/api";
import { formatBytes, formatDateTime } from "@/lib/format";

export type ItemDetails = {
  kind: "file" | "folder";
  name: string;
  createdAt: string;
  updatedAt: string;
  size: string;
  owner?: OwnerDto;
  location?: string;
  mimeType?: string;
  itemCount?: number;
  versionCount?: number;
  resourceType?: ResourceType;
  resourceId?: string;
};

export function detailsFromFolder(
  folder: FolderDto,
  extras?: { location?: string; owner?: OwnerDto },
): ItemDetails {
  return {
    kind: "folder",
    name: folder.name,
    createdAt: folder.createdAt,
    updatedAt: folder.updatedAt,
    size: folder.totalSize,
    itemCount: folder.itemCount,
    owner: extras?.owner ?? folder.owner,
    location: extras?.location,
    resourceType: "FOLDER",
    resourceId: folder.id,
  };
}

export function detailsFromFile(
  file: FileDto,
  extras?: { location?: string; owner?: OwnerDto; versionCount?: number },
): ItemDetails {
  return {
    kind: "file",
    name: file.name,
    createdAt: file.createdAt,
    updatedAt: file.updatedAt,
    size: file.size,
    mimeType: file.mimeType,
    versionCount: extras?.versionCount ?? file.versionCount,
    owner: extras?.owner ?? file.owner,
    location: extras?.location,
    resourceType: "FILE",
    resourceId: file.id,
  };
}

function shareLabel(share: ShareDto) {
  if (share.kind === "PUBLIC_LINK") return "Публічне посилання";
  const email = share.user?.email || share.invitedEmail;
  if (share.user?.name && email) return `${share.user.name} (${email})`;
  return email || "Користувач";
}

function ShareAccessSection({ resourceType, resourceId }: { resourceType: ResourceType; resourceId: string }) {
  const [shares, setShares] = useState<ShareDto[] | "hidden" | "loading">("loading");

  useEffect(() => {
    let cancelled = false;
    setShares("loading");
    api<ShareDto[]>(`/shares?resourceType=${resourceType}&resourceId=${resourceId}`, { progress: false })
      .then((data) => {
        if (!cancelled) setShares(data);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) setShares("hidden");
        else setShares([]);
      });
    return () => {
      cancelled = true;
    };
  }, [resourceType, resourceId]);

  if (shares === "hidden") return null;
  if (shares === "loading") {
    return (
      <div className="mt-4 border-t pt-3">
        <h3 className="mb-2 text-sm font-medium">Спільний доступ</h3>
        <p className="text-sm text-muted-foreground">Завантаження…</p>
      </div>
    );
  }

  return (
    <div className="mt-4 border-t pt-3">
      <h3 className="mb-2 text-sm font-medium">Спільний доступ</h3>
      {shares.length === 0 ? (
        <p className="text-sm text-muted-foreground">Нікому не надано</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {shares.map((share) => (
            <li key={share.id} className="min-w-0">
              <p className="break-words">
                {shareLabel(share)}
                {share.kind === "USER" && !share.userId ? (
                  <span className="ml-1 text-muted-foreground">(очікує)</span>
                ) : null}
              </p>
              <p className="text-xs text-muted-foreground">Надано {formatDateTime(share.createdAt)}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function typeLabel(details: ItemDetails) {
  if (details.kind === "folder") return "Папка";
  if (details.mimeType === "application/pdf" || details.name.toLowerCase().endsWith(".pdf")) return "Документ PDF";
  return details.mimeType || "Файл";
}

export function ItemDetailsList({ details }: { details: ItemDetails }) {
  const ownerLabel = details.owner
    ? details.owner.email
      ? `${details.owner.name} (${details.owner.email})`
      : details.owner.name
    : undefined;

  const rows: { label: string; value: string }[] = [
    { label: "Тип", value: typeLabel(details) },
    { label: "Розмір", value: formatBytes(details.size) },
    ...(details.kind === "folder" ? [{ label: "Елементи", value: String(details.itemCount ?? 0) }] : []),
    ...(details.kind === "file" && details.versionCount
      ? [{ label: "Версії", value: String(details.versionCount) }]
      : []),
    ...(details.location ? [{ label: "Розташування", value: details.location }] : []),
    { label: "Створено", value: formatDateTime(details.createdAt) },
    { label: "Змінено", value: formatDateTime(details.updatedAt) },
    ...(ownerLabel ? [{ label: "Власник", value: ownerLabel }] : []),
  ];

  return (
    <div>
      <dl className="grid grid-cols-[7rem_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm">
        {rows.map((row) => (
          <div key={row.label} className="contents">
            <dt className="text-muted-foreground">{row.label}</dt>
            <dd className="min-w-0 break-words">{row.value}</dd>
          </div>
        ))}
      </dl>
      {details.resourceType && details.resourceId ? (
        <ShareAccessSection resourceType={details.resourceType} resourceId={details.resourceId} />
      ) : null}
    </div>
  );
}

export function ItemDetailsDialog({
  open,
  onOpenChange,
  details,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  details: ItemDetails | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="pr-6">{details ? `Деталі · ${details.name}` : "Деталі"}</DialogTitle>
        </DialogHeader>
        {details ? <ItemDetailsList details={details} /> : null}
      </DialogContent>
    </Dialog>
  );
}
