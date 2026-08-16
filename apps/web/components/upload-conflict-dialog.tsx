"use client";

import { useEffect, useState } from "react";
import type { FileDto } from "@dataroom/shared";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
}: {
  conflict: NameConflict | null;
  onResolve: (decision: ConflictDecision) => void;
}) {
  const [action, setAction] = useState<ConflictAction>("replace");
  const [newName, setNewName] = useState("");
  const [oldName, setOldName] = useState("");

  useEffect(() => {
    if (!conflict) return;
    setAction("replace");
    setNewName(conflict.suggestedNewName);
    setOldName(conflict.suggestedNewName);
  }, [conflict]);

  const options: { id: ConflictAction; title: string; hint: string }[] = conflict
    ? [
        { id: "replace", title: "Замінити наявний файл", hint: "Поточний файл збережеться як попередня версія." },
        { id: "keep_both", title: "Залишити обидва", hint: `Завантажити новий файл як «${conflict.suggestedNewName}».` },
        { id: "rename_new", title: "Перейменувати новий файл", hint: "Оберіть назву для файлу, який завантажуєте." },
        { id: "rename_old", title: "Перейменувати наявний файл", hint: "Звільнити оригінальну назву для нового завантаження." },
        { id: "rename_both", title: "Перейменувати обидва файли", hint: "Дайте кожному файлу нову назву." },
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
          <DialogTitle>Файл уже існує</DialogTitle>
          <DialogDescription>
            Файл із назвою «{conflict?.incomingName}» уже є в цій папці. Оберіть, що зробити з новим завантаженням.
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
                name="upload-conflict"
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
            <Label htmlFor="conflict-new-name">Назва нового файлу</Label>
            <Input id="conflict-new-name" value={newName} onChange={(e) => setNewName(e.target.value)} />
          </div>
        ) : null}
        {action === "rename_old" || action === "rename_both" ? (
          <div className="space-y-1.5">
            <Label htmlFor="conflict-old-name">Назва наявного файлу</Label>
            <Input
              id="conflict-old-name"
              value={oldName}
              onChange={(e) => setOldName(e.target.value)}
            />
          </div>
        ) : null}
        <DialogFooter>
          <Button variant="outline" onClick={() => onResolve({ action: "skip" })}>
            Пропустити
          </Button>
          <Button disabled={!continueEnabled} onClick={submit}>
            Продовжити
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
