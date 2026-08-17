"use client";

import { useEffect, useState } from "react";
import type { FileDto } from "@dataroom/shared";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/lib/i18n";

export type ConflictAction = "replace" | "keep_both" | "rename_new" | "rename_old" | "rename_both";

export type ConflictDecision =
  | { action: "skip" }
  | { action: "replace" }
  | { action: "keep_both" }
  | { action: "rename_new"; newName: string }
  | { action: "rename_old"; oldName: string }
  | { action: "rename_both"; newName: string; oldName: string };

export type NameConflict = {
  existing: FileDto;
  suggestedNewName: string;
  suggestedOldName: string;
  incomingName: string;
};

function withPdf(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return "";
  return trimmed.toLowerCase().endsWith(".pdf") ? trimmed : `${trimmed}.pdf`;
}

export function UploadConflictDialog({
  conflict,
  onResolve,
  mode = "upload",
}: {
  conflict: NameConflict | null;
  onResolve: (decision: ConflictDecision) => void;
  mode?: "upload" | "move";
}) {
  const { t } = useI18n();
  const [action, setAction] = useState<ConflictAction>("replace");
  const [newName, setNewName] = useState("");
  const [oldName, setOldName] = useState("");

  useEffect(() => {
    if (!conflict) return;
    setAction("replace");
    setNewName(conflict.suggestedNewName);
    setOldName(conflict.suggestedNewName);
  }, [conflict]);

  const moving = mode === "move";
  const options: { id: ConflictAction; title: string; hint: string }[] = conflict
    ? [
        {
          id: "replace",
          title: t("conflict.replace"),
          hint: t("conflict.replaceHint"),
        },
        {
          id: "keep_both",
          title: t("conflict.keepBoth"),
          hint: moving
            ? t("conflict.keepBothMove", { name: conflict.suggestedNewName })
            : t("conflict.keepBothUpload", { name: conflict.suggestedNewName }),
        },
        {
          id: "rename_new",
          title: moving ? t("conflict.renameIncomingMove") : t("conflict.renameIncomingUpload"),
          hint: moving ? t("conflict.renameIncomingMoveHint") : t("conflict.renameIncomingUploadHint"),
        },
        {
          id: "rename_old",
          title: t("conflict.renameExisting"),
          hint: moving ? t("conflict.renameExistingMoveHint") : t("conflict.renameExistingUploadHint"),
        },
        { id: "rename_both", title: t("conflict.renameBoth"), hint: t("conflict.renameBothHint") },
      ]
    : [];

  const continueEnabled =
    action === "replace" ||
    action === "keep_both" ||
    (action === "rename_new" && Boolean(withPdf(newName))) ||
    (action === "rename_old" && Boolean(withPdf(oldName))) ||
    (action === "rename_both" && Boolean(withPdf(newName)) && Boolean(withPdf(oldName)) && withPdf(newName).toLowerCase() !== withPdf(oldName).toLowerCase());

  const submit = () => {
    if (!conflict || !continueEnabled) return;
    if (action === "replace") onResolve({ action: "replace" });
    else if (action === "keep_both") onResolve({ action: "keep_both" });
    else if (action === "rename_new") onResolve({ action: "rename_new", newName: withPdf(newName) });
    else if (action === "rename_old") onResolve({ action: "rename_old", oldName: withPdf(oldName) });
    else onResolve({ action: "rename_both", newName: withPdf(newName), oldName: withPdf(oldName) });
  };

  return (
    <Dialog open={Boolean(conflict)} onOpenChange={(open) => !open && onResolve({ action: "skip" })}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("conflict.title")}</DialogTitle>
          <DialogDescription>
            {t("conflict.body", { name: conflict?.incomingName ?? "" })}
            {moving ? t("conflict.bodyMove") : t("conflict.bodyUpload")}
          </DialogDescription>
        </DialogHeader>
        <fieldset className="space-y-2">
          {options.map((option) => (
            <label
              key={option.id}
              className={`flex cursor-pointer gap-3 rounded-lg border p-3 ${action === option.id ? "border-primary bg-accent/60" : "hover:bg-accent/40"}`}
            >
              <input
                type="radio"
                name="file-name-conflict"
                className="mt-1"
                checked={action === option.id}
                onChange={() => {
                  setAction(option.id);
                  if (!conflict) return;
                  if (option.id === "rename_new") setNewName(conflict.suggestedNewName);
                  if (option.id === "rename_old") setOldName(conflict.suggestedNewName);
                  if (option.id === "rename_both") {
                    setOldName(conflict.suggestedNewName);
                    setNewName(conflict.suggestedOldName);
                  }
                }}
              />
              <span>
                <span className="block text-sm font-medium">{option.title}</span>
                <span className="block text-xs text-muted-foreground">{option.hint}</span>
              </span>
            </label>
          ))}
        </fieldset>
        {action === "rename_new" || action === "rename_both" ? (
          <div className="space-y-1.5">
            <Label htmlFor="conflict-new-name">{moving ? t("conflict.newNameMove") : t("conflict.newNameUpload")}</Label>
            <Input id="conflict-new-name" value={newName} onChange={(e) => setNewName(e.target.value)} />
          </div>
        ) : null}
        {action === "rename_old" || action === "rename_both" ? (
          <div className="space-y-1.5">
            <Label htmlFor="conflict-old-name">{t("conflict.oldName")}</Label>
            <Input
              id="conflict-old-name"
              value={oldName}
              onChange={(e) => setOldName(e.target.value)}
            />
          </div>
        ) : null}
        <DialogFooter>
          <Button variant="outline" onClick={() => onResolve({ action: "skip" })}>
            {moving ? t("common.cancel") : t("conflict.skip")}
          </Button>
          <Button disabled={!continueEnabled} onClick={submit}>
            {t("conflict.continue")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
