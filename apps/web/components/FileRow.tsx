"use client";

import { FileText } from "lucide-react";
import type { FileDto } from "@dataroom/shared";
import { useDensityFlags } from "@/lib/density";
import { formatBytes, formatDateTime } from "@/lib/format";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export function FileRow({
  file,
  onOpen,
  canEdit,
  onDetails,
  onRename,
  onMove,
  onShare,
  onDelete,
}: {
  file: FileDto;
  onOpen: (file: FileDto) => void;
  canEdit: boolean;
  onDetails: (file: FileDto) => void;
  onRename: (file: FileDto) => void;
  onMove: (file: FileDto) => void;
  onShare: (file: FileDto) => void;
  onDelete: (file: FileDto) => void;
}) {
  const { dense, minimal } = useDensityFlags();
  return (
    <li
      className={`group flex items-center ${minimal ? "gap-1.5 px-2 py-0.5" : dense ? "gap-3 px-3 py-1.5" : "gap-3 px-3 py-2.5"}`}
    >
      <button type="button" className="flex min-w-0 flex-1 items-center gap-2 text-left" onClick={() => onOpen(file)}>
        <FileText className={`shrink-0 text-red-700 ${minimal ? "size-3.5" : "size-5"}`} />
        <div className="min-w-0 flex-1">
          <p className={`truncate ${minimal ? "text-sm" : "font-medium"}`}>{file.name}</p>
          {minimal ? null : (
            <p className="text-xs text-muted-foreground">
              {formatBytes(file.size)}
              {!dense && file.createdAt ? ` · ${formatDateTime(file.createdAt)}` : ""}
            </p>
          )}
        </div>
        {minimal ? <span className="shrink-0 text-[11px] text-muted-foreground">{formatBytes(file.size)}</span> : null}
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className={minimal ? "size-6 opacity-0 group-hover:opacity-100" : undefined}>
            ⋯
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onOpen(file)}>View</DropdownMenuItem>
          <DropdownMenuItem onClick={() => onDetails(file)}>Details</DropdownMenuItem>
          {canEdit ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onRename(file)}>Rename</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onMove(file)}>Move</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onShare(file)}>Share</DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onClick={() => onDelete(file)}>
                Delete
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}
