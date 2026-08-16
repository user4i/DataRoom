"use client";

import type { FileDto, FolderDto, OwnerDto } from "@dataroom/shared";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  };
}

function typeLabel(details: ItemDetails) {
  if (details.kind === "folder") return "Folder";
  if (details.mimeType === "application/pdf" || details.name.toLowerCase().endsWith(".pdf")) return "PDF document";
  return details.mimeType || "File";
}

export function ItemDetailsList({ details }: { details: ItemDetails }) {
  const ownerLabel = details.owner
    ? details.owner.email
      ? `${details.owner.name} (${details.owner.email})`
      : details.owner.name
    : undefined;

  const rows: { label: string; value: string }[] = [
    { label: "Type", value: typeLabel(details) },
    { label: "Size", value: formatBytes(details.size) },
    ...(details.kind === "folder" ? [{ label: "Items", value: String(details.itemCount ?? 0) }] : []),
    ...(details.kind === "file" && details.versionCount
      ? [{ label: "Versions", value: String(details.versionCount) }]
      : []),
    ...(details.location ? [{ label: "Location", value: details.location }] : []),
    { label: "Created", value: formatDateTime(details.createdAt) },
    { label: "Modified", value: formatDateTime(details.updatedAt) },
    ...(ownerLabel ? [{ label: "Owner", value: ownerLabel }] : []),
  ];

  return (
    <dl className="grid grid-cols-[7rem_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm">
      {rows.map((row) => (
        <div key={row.label} className="contents">
          <dt className="text-muted-foreground">{row.label}</dt>
          <dd className="min-w-0 break-words">{row.value}</dd>
        </div>
      ))}
    </dl>
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
          <DialogTitle className="pr-6">{details ? `Details · ${details.name}` : "Details"}</DialogTitle>
        </DialogHeader>
        {details ? <ItemDetailsList details={details} /> : null}
      </DialogContent>
    </Dialog>
  );
}
