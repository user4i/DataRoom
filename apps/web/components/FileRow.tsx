"use client";

import { FileText } from "lucide-react";
import type { FileDto } from "@dataroom/shared";
import { useDensity } from "@/lib/density";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { formatBytes } from "@/components/FolderList";

export function FileRow({
  file,
  onOpen,
  canEdit,
  onRename,
  onMove,
  onShare,
  onDelete,
}: {
  file: FileDto;
  onOpen: (file: FileDto) => void;
  canEdit: boolean;
  onRename: (file: FileDto) => void;
  onMove: (file: FileDto) => void;
  onShare: (file: FileDto) => void;
  onDelete: (file: FileDto) => void;
}) {
  const { density } = useDensity();
  const compact = density === "compact";
  return (
    <li className={`flex items-center gap-3 px-3 ${compact ? "py-1.5" : "py-2.5"}`}>
      <button type="button" className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => onOpen(file)}>
        <FileText className="size-5 shrink-0 text-red-700" />
        <div className="min-w-0">
          <p className="truncate font-medium">{file.name}</p>
          <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
        </div>
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            ⋯
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onOpen(file)}>View</DropdownMenuItem>
          {canEdit ? (
            <>
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
