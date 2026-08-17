"use client";

import { Folder } from "lucide-react";
import type { FolderDto } from "@dataroom/shared";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useDensityFlags } from "@/lib/density";
import { formatBytes, formatDateTime } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { AnalysisStatusBadge } from "@/components/analysis-status-badge";
import { TagPills } from "@/components/item-tags";

export function FolderList({
  folders,
  onOpen,
  canEdit,
  onDetails,
  onRename,
  onShare,
  onDelete,
  onAnalyze,
}: {
  folders: FolderDto[];
  onOpen: (folder: FolderDto) => void;
  canEdit: boolean;
  onDetails: (folder: FolderDto) => void;
  onRename: (folder: FolderDto) => void;
  onShare: (folder: FolderDto) => void;
  onDelete: (folder: FolderDto) => void;
  onAnalyze?: (folder: FolderDto) => void;
}) {
  const { t, p, locale } = useI18n();
  const { dense, minimal } = useDensityFlags();
  if (folders.length === 0) return null;
  return (
    <div className={minimal ? "space-y-0" : "space-y-1"}>
      {minimal ? null : (
        <p className="px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("explorer.folders")}</p>
      )}
      <ul className={`divide-y bg-card ${minimal ? "border-y" : "rounded-lg border"}`}>
        {folders.map((folder) => (
          <li
            key={folder.id}
            className={`group flex items-center ${minimal ? "gap-1.5 px-2 py-0.5" : dense ? "gap-3 px-3 py-1.5" : "gap-3 px-3 py-2.5"}`}
          >
            <button type="button" className="flex min-w-0 flex-1 items-center gap-2 text-left" onClick={() => onOpen(folder)}>
              <Folder className={`shrink-0 text-sky-700 dark:text-sky-400 ${minimal ? "size-3.5" : "size-5"}`} />
              <div className="min-w-0 flex-1">
                <p className={`truncate ${minimal ? "text-sm" : "font-medium"}`}>{folder.name}</p>
                {minimal ? null : (
                <p className="text-xs text-muted-foreground">
                  {p("item", folder.itemCount)} · {formatBytes(folder.totalSize)}
                  {!dense && folder.createdAt ? ` · ${formatDateTime(folder.createdAt, locale)}` : ""}
                </p>
                )}
              </div>
              <AnalysisStatusBadge status={folder.analysisStatus} />
              <TagPills tags={folder.tags} />
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className={minimal ? "size-6 opacity-0 group-hover:opacity-100" : undefined}>
                  ⋯
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onOpen(folder)}>{t("common.open")}</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDetails(folder)}>{t("common.details")}</DropdownMenuItem>
                {canEdit && onAnalyze ? (
                  <DropdownMenuItem onClick={() => onAnalyze(folder)}>{t("ai.analyze")}</DropdownMenuItem>
                ) : null}
                {canEdit ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onRename(folder)}>{t("common.rename")}</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onShare(folder)}>{t("common.share")}</DropdownMenuItem>
                    <DropdownMenuItem variant="destructive" onClick={() => onDelete(folder)}>
                      {t("common.delete")}
                    </DropdownMenuItem>
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </li>
        ))}
      </ul>
    </div>
  );
}
