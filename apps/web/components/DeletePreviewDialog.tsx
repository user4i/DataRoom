"use client";

import { useEffect, useState } from "react";
import type { DeletionPreviewDto } from "@dataroom/shared";
import { useI18n } from "@/lib/i18n";
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

function hasViewers(preview: DeletionPreviewDto | null) {
  if (!preview?.viewers) return false;
  return preview.viewers.publicLinkCount + preview.viewers.peopleCount > 0;
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
  const { t, p } = useI18n();
  const CONFIRM_WORD = t("deleteFolder.confirmWord");
  const [ownerConfirm, setOwnerConfirm] = useState(false);
  const [typed, setTyped] = useState("");
  const viewers = hasViewers(preview);
  const wordMatches = typed.trim().toUpperCase() === CONFIRM_WORD;
  const canDelete = Boolean(preview) && wordMatches && (!viewers || ownerConfirm);
  const [typeLabelBefore, typeLabelAfter] = t("deleteFolder.typeLabel").split("{word}");

  const viewerSummary = (item: DeletionPreviewDto) => {
    const parts: string[] = [];
    if (item.viewers.publicLinkCount > 0) {
      parts.push(p("publicLink", item.viewers.publicLinkCount));
    }
    if (item.viewers.peopleCount > 0) {
      const emails = item.viewers.people.length
        ? ` (${item.viewers.people.join(", ")}${item.viewers.peopleCount > item.viewers.people.length ? "…" : ""})`
        : "";
      parts.push(`${p("person", item.viewers.peopleCount)}${emails}`);
    }
    return parts.join(t("and"));
  };

  useEffect(() => {
    if (!open) return;
    setOwnerConfirm(false);
    setTyped("");
  }, [open, preview]);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("deleteFolder.title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {preview
              ? t("deleteFolder.contains", { count: p("file", preview.fileCount) })
              : t("deleteFolder.loading")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {preview ? (
          <p className="text-xs text-muted-foreground">{t("deleteFolder.irreversible")}</p>
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
            <p>{t("deleteFolder.viewers", { summary: viewerSummary(preview) })}</p>
            <p className="text-xs">{t("deleteFolder.avoid")}</p>
            <label className="flex cursor-pointer items-start gap-2">
              <input
                type="checkbox"
                className="mt-1"
                checked={ownerConfirm}
                onChange={(event) => setOwnerConfirm(event.target.checked)}
              />
              <span>{t("deleteFolder.ownerConfirm")}</span>
            </label>
          </div>
        ) : null}
        <div className="space-y-1.5">
          <Label htmlFor="delete-confirm-word">
            {typeLabelBefore}
            <span className="font-semibold">{CONFIRM_WORD}</span>
            {typeLabelAfter}
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
          <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            disabled={!canDelete}
            onClick={onConfirm}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            {viewers ? t("deleteFolder.revokeAndDelete") : t("deleteFolder.deleteAll")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
