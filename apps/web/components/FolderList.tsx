"use client";

import { Folder } from "lucide-react";
import type { FolderDto } from "@dataroom/shared";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useDensity } from "@/lib/density";

export function FolderList({
  folders,
  onOpen,
  canEdit,
  onRename,
  onShare,
  onDelete,
}: {
  folders: FolderDto[];
  onOpen: (folder: FolderDto) => void;
  canEdit: boolean;
  onRename: (folder: FolderDto) => void;
  onShare: (folder: FolderDto) => void;
  onDelete: (folder: FolderDto) => void;
}) {
  const compact = useDensity().density === "compact";
  if (folders.length === 0) return null;
  return (
    <div className="space-y-1">
      <p className="px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Folders</p>
      <ul className="divide-y rounded-lg border bg-card">
        {folders.map((folder) => (
          <li key={folder.id} className={`flex items-center gap-3 px-3 ${compact ? "py-1.5" : "py-2.5"}`}>
            <button type="button" className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => onOpen(folder)}>
              <Folder className="size-5 shrink-0 text-sky-700" />
              <div className="min-w-0">
                <p className="truncate font-medium">{folder.name}</p>
                <p className="text-xs text-muted-foreground">
                  {folder.itemCount} items · {formatBytes(folder.totalSize)}
                </p>
              </div>
            </button>
            {canEdit ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    ⋯
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onRename(folder)}>Rename</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onShare(folder)}>Share</DropdownMenuItem>
                  <DropdownMenuItem variant="destructive" onClick={() => onDelete(folder)}>
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    ⋯
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onOpen(folder)}>Open</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function formatBytes(value: string | number) {
  const n = typeof value === "string" ? Number(value) : value;
  if (!n) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let size = n;
  let i = 0;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i += 1;
  }
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}
