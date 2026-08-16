"use client";

import type { DeletionPreviewDto } from "@dataroom/shared";
import { formatBytes } from "@/lib/format";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function DeletePreviewDialog({
  open,
  onOpenChange,
  preview,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preview: DeletionPreviewDto | null;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this folder?</AlertDialogTitle>
          <AlertDialogDescription>
            {preview
              ? `This will permanently delete ${preview.folderCount} folder${preview.folderCount === 1 ? "" : "s"} and ${preview.fileCount} file${preview.fileCount === 1 ? "" : "s"} (${formatBytes(preview.totalSize)}). Nested items cannot be recovered.`
              : "Loading what will be deleted…"}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {preview?.sampleNames?.length ? (
          <ul className="list-disc pl-5 text-sm text-muted-foreground">
            {preview.sampleNames.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-destructive text-white hover:bg-destructive/90">
            Delete everything
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
