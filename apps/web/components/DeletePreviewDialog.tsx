"use client";

import { useEffect, useState } from "react";
import type { DeletionPreviewDto } from "@dataroom/shared";
import { ukPlural } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

const CONFIRM_WORD = "ВИДАЛИТИ";

function hasViewers(preview: DeletionPreviewDto | null) {
  if (!preview?.viewers) return false;
  return preview.viewers.publicLinkCount + preview.viewers.peopleCount > 0;
}

function viewerSummary(preview: DeletionPreviewDto) {
  const parts: string[] = [];
  if (preview.viewers.publicLinkCount > 0) {
    parts.push(
      ukPlural(preview.viewers.publicLinkCount, "публічне посилання", "публічні посилання", "публічних посилань"),
    );
  }
  if (preview.viewers.peopleCount > 0) {
    const emails = preview.viewers.people.length
      ? ` (${preview.viewers.people.join(", ")}${preview.viewers.peopleCount > preview.viewers.people.length ? "…" : ""})`
      : "";
    parts.push(`${ukPlural(preview.viewers.peopleCount, "людина", "людини", "людей")}${emails}`);
  }
  return parts.join(" і ");
}

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
  const [ownerConfirm, setOwnerConfirm] = useState(false);
  const [typed, setTyped] = useState("");
  const viewers = hasViewers(preview);
  const wordMatches = typed.trim().toUpperCase() === CONFIRM_WORD;
  const canDelete = Boolean(preview) && wordMatches && (!viewers || ownerConfirm);

  useEffect(() => {
    if (!open) return;
    setOwnerConfirm(false);
    setTyped("");
  }, [open, preview]);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Видалити цю папку?</AlertDialogTitle>
          <AlertDialogDescription>
            {preview
              ? `Ця папка містить ${ukPlural(preview.fileCount, "файл", "файли", "файлів")}. Ви впевнені, що хочете видалити її та весь її вміст?`
              : "Завантаження списку того, що буде видалено…"}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {preview ? (
          <p className="text-xs text-muted-foreground">Відновити вміст не можна.</p>
        ) : null}
        {preview?.sampleNames?.length ? (
          <ul className="list-disc pl-5 text-sm text-muted-foreground">
            {preview.sampleNames.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        ) : null}
        {preview && viewers ? (
          <div className="space-y-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
            <p>
              Цю папку зараз можуть переглядати інші: {viewerSummary(preview)}. Після видалення їхній доступ
              зникне.
            </p>
            <p className="text-xs">
              Щоб уникнути цього, спочатку скасуйте спільний доступ у меню папки. Або підтвердьте видалення з
              правами власника.
            </p>
            <label className="flex cursor-pointer items-start gap-2">
              <input
                type="checkbox"
                className="mt-1"
                checked={ownerConfirm}
                onChange={(event) => setOwnerConfirm(event.target.checked)}
              />
              <span>Я власник і підтверджую відкликання доступу для всіх, хто зараз може переглядати цю папку.</span>
            </label>
          </div>
        ) : null}
        <div className="space-y-1.5">
          <Label htmlFor="delete-confirm-word">
            Щоб підтвердити, введіть <span className="font-semibold">{CONFIRM_WORD}</span>
          </Label>
          <Input
            id="delete-confirm-word"
            autoComplete="off"
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            placeholder={CONFIRM_WORD}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Скасувати</AlertDialogCancel>
          <AlertDialogAction
            disabled={!canDelete}
            onClick={onConfirm}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            {viewers ? "Відкликати доступ і видалити" : "Видалити все"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
