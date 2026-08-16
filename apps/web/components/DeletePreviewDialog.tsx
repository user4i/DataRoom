"use client";

import type { DeletionPreviewDto } from "@dataroom/shared";
import { formatBytes, ukPlural } from "@/lib/format";
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
          <AlertDialogTitle>Видалити цю папку?</AlertDialogTitle>
          <AlertDialogDescription>
            {preview
              ? `Буде остаточно видалено ${ukPlural(preview.folderCount, "папку", "папки", "папок")} і ${ukPlural(preview.fileCount, "файл", "файли", "файлів")} (${formatBytes(preview.totalSize)}). Вкладені елементи відновити не можна.`
              : "Завантаження списку того, що буде видалено…"}
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
          <AlertDialogCancel>Скасувати</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-destructive text-white hover:bg-destructive/90">
            Видалити все
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
