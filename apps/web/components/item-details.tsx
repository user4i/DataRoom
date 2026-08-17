"use client";

import { useEffect, useState } from "react";
import type { FileDto, FolderDto, OwnerDto, ResourceType, ShareDto } from "@dataroom/shared";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api";
import { formatBytes, formatDateTime } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { AiAnalysisPanel } from "@/components/ai-analysis-panel";
import { CommentsPanel } from "@/components/comments-panel";

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
  canAnalyze?: boolean;
  autoAnalyze?: boolean;
  publicToken?: string;
  onAnalysisQueued?: () => void;
};

export function detailsFromFolder(
  folder: FolderDto,
  extras?: { location?: string; owner?: OwnerDto; canAnalyze?: boolean; autoAnalyze?: boolean; publicToken?: string; onAnalysisQueued?: () => void },
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
    canAnalyze: extras?.canAnalyze,
    autoAnalyze: extras?.autoAnalyze,
    publicToken: extras?.publicToken,
    onAnalysisQueued: extras?.onAnalysisQueued,
  };
}

export function detailsFromFile(
  file: FileDto,
  extras?: {
    location?: string;
    owner?: OwnerDto;
    versionCount?: number;
    canAnalyze?: boolean;
    autoAnalyze?: boolean;
    publicToken?: string;
    onAnalysisQueued?: () => void;
  },
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
    canAnalyze: extras?.canAnalyze,
    autoAnalyze: extras?.autoAnalyze,
    publicToken: extras?.publicToken,
    onAnalysisQueued: extras?.onAnalysisQueued,
  };
}

function ShareAccessSection({ resourceType, resourceId }: { resourceType: ResourceType; resourceId: string }) {
  const { t, locale } = useI18n();
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

  const shareLabel = (share: ShareDto) => {
    if (share.kind === "PUBLIC_LINK") return t("details.publicLink");
    const email = share.user?.email || share.invitedEmail;
    if (share.user?.name && email) return `${share.user.name} (${email})`;
    return email || t("details.user");
  };

  if (shares === "hidden") return null;
  if (shares === "loading") {
    return (
      <div className="mt-4 border-t pt-3">
        <h3 className="mb-2 text-sm font-medium">{t("details.sharing")}</h3>
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      </div>
    );
  }

  return (
    <div className="mt-4 border-t pt-3">
      <h3 className="mb-2 text-sm font-medium">{t("details.sharing")}</h3>
      {shares.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("details.none")}</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {shares.map((share) => (
            <li key={share.id} className="min-w-0">
              <p className="break-words">
                {shareLabel(share)}
                {share.kind === "USER" && !share.userId ? (
                  <span className="ml-1 text-muted-foreground">({t("details.pending")})</span>
                ) : null}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("details.granted", { date: formatDateTime(share.createdAt, locale) })}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ItemDetailsList({
  details,
  onOpenVersions,
}: {
  details: ItemDetails;
  onOpenVersions?: () => void;
}) {
  const { t, locale } = useI18n();
  const ownerLabel = details.owner
    ? details.owner.email
      ? `${details.owner.name} (${details.owner.email})`
      : details.owner.name
    : undefined;

  const typeLabel =
    details.kind === "folder"
      ? t("common.folder")
      : details.mimeType === "application/pdf" || details.name.toLowerCase().endsWith(".pdf")
        ? t("details.pdf")
        : details.mimeType || t("details.file");

  const rows: { label: string; value: string }[] = [
    { label: t("details.type"), value: typeLabel },
    { label: t("details.size"), value: formatBytes(details.size) },
    ...(details.kind === "folder" ? [{ label: t("details.items"), value: String(details.itemCount ?? 0) }] : []),
    ...(details.location ? [{ label: t("details.location"), value: details.location }] : []),
    { label: t("details.created"), value: formatDateTime(details.createdAt, locale) },
    { label: t("details.updated"), value: formatDateTime(details.updatedAt, locale) },
    ...(ownerLabel ? [{ label: t("details.owner"), value: ownerLabel }] : []),
  ];

  const showVersions = details.kind === "file" && details.versionCount;
  const canOpenVersions = Boolean(onOpenVersions && (details.versionCount ?? 0) > 1);

  return (
    <div>
      <dl className="grid grid-cols-[7rem_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm">
        {rows.slice(0, 2).map((row) => (
          <div key={row.label} className="contents">
            <dt className="text-muted-foreground">{row.label}</dt>
            <dd className="min-w-0 break-words">{row.value}</dd>
          </div>
        ))}
        {showVersions ? (
          <div className="contents">
            <dt className="text-muted-foreground">{t("details.versions")}</dt>
            <dd className="flex min-w-0 items-center gap-2">
              <span className="break-words">{String(details.versionCount)}</span>
              {canOpenVersions ? (
                <Button type="button" variant="outline" size="sm" onClick={onOpenVersions}>
                  {t("versions.open")}
                </Button>
              ) : null}
            </dd>
          </div>
        ) : null}
        {rows.slice(2).map((row) => (
          <div key={row.label} className="contents">
            <dt className="text-muted-foreground">{row.label}</dt>
            <dd className="min-w-0 break-words">{row.value}</dd>
          </div>
        ))}
      </dl>
      {details.resourceType && details.resourceId ? (
        <ShareAccessSection resourceType={details.resourceType} resourceId={details.resourceId} />
      ) : null}
      {details.resourceType && details.resourceId ? (
        <CommentsPanel
          resourceType={details.resourceType}
          resourceId={details.resourceId}
          publicToken={details.publicToken}
        />
      ) : null}
      {details.resourceType && details.resourceId ? (
        <AiAnalysisPanel
          resourceType={details.resourceType}
          resourceId={details.resourceId}
          canEdit={Boolean(details.canAnalyze)}
          kinds={details.kind === "folder" ? ["FOLDER_SUMMARY"] : ["FILE_SUMMARY"]}
          autoRunIfEmpty={details.autoAnalyze}
          onQueued={details.onAnalysisQueued}
        />
      ) : null}
    </div>
  );
}

export function ItemDetailsDialog({
  open,
  onOpenChange,
  details,
  onOpenVersions,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  details: ItemDetails | null;
  onOpenVersions?: () => void;
}) {
  const { t } = useI18n();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(90vh,44rem)] max-w-2xl flex-col gap-4 overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle className="pr-6">
            {details ? t("details.title", { name: details.name }) : t("details.titlePlain")}
          </DialogTitle>
        </DialogHeader>
        {details ? (
          <div className="min-h-0 overflow-y-auto overscroll-contain pr-1">
            <ItemDetailsList details={details} onOpenVersions={onOpenVersions} />
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
