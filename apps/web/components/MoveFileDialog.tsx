"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Node = { id: string; name: string; parentId: string | null };

type ViewerImpact = {
  publicLinkCount: number;
  peopleCount: number;
  people: string[];
};

export function MoveFileDialog({
  open,
  onOpenChange,
  dataRoomId,
  dataRoomName,
  fileId,
  onMove,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dataRoomId: string;
  dataRoomName: string;
  fileId: string;
  onMove: (folderId: string | null, options?: { confirmViewers?: boolean }) => Promise<void>;
}) {
  const { t, p } = useI18n();
  const [parentId, setParentId] = useState<string | null>(null);
  const [crumbs, setCrumbs] = useState<{ id: string | null; name: string }[]>([{ id: null, name: dataRoomName }]);
  const [folders, setFolders] = useState<Node[]>([]);
  const [busy, setBusy] = useState(false);
  const [impact, setImpact] = useState<ViewerImpact | null>(null);
  const [ownerConfirm, setOwnerConfirm] = useState(false);

  const viewers = Boolean(impact && impact.publicLinkCount + impact.peopleCount > 0);

  const load = async (id: string | null) => {
    try {
      const q = id ? `?parentId=${id}` : "";
      const data = await api<Node[]>(`/data-rooms/${dataRoomId}/folder-tree${q}`);
      setFolders(data);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t("move.loadFailed"));
    }
  };

  useEffect(() => {
    if (open) {
      setParentId(null);
      setCrumbs([{ id: null, name: dataRoomName }]);
      setOwnerConfirm(false);
      void load(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, dataRoomId, dataRoomName]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setOwnerConfirm(false);
    const query = parentId ? `?folderId=${parentId}` : "";
    api<ViewerImpact>(`/files/${fileId}/move-impact${query}`, { progress: false })
      .then((data) => {
        if (!cancelled) setImpact(data);
      })
      .catch(() => {
        if (!cancelled) setImpact(null);
      });
    return () => {
      cancelled = true;
    };
  }, [open, fileId, parentId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("move.title")}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-wrap gap-1 text-sm text-muted-foreground">
          {crumbs.map((c, i) => (
            <button
              key={`${c.id}-${i}`}
              className="hover:text-foreground"
              type="button"
              onClick={() => {
                const next = crumbs.slice(0, i + 1);
                setCrumbs(next);
                setParentId(c.id);
                void load(c.id);
              }}
            >
              {c.name}
              {i < crumbs.length - 1 ? " / " : ""}
            </button>
          ))}
        </div>
        <ul className="max-h-64 divide-y overflow-auto rounded-md border">
          {folders.length === 0 ? (
            <li className="px-3 py-6 text-center text-sm text-muted-foreground">{t("move.noFolders")}</li>
          ) : (
            folders.map((folder) => (
              <li key={folder.id}>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm hover:bg-accent"
                  onClick={() => {
                    setParentId(folder.id);
                    setCrumbs((prev) => [...prev, { id: folder.id, name: folder.name }]);
                    void load(folder.id);
                  }}
                >
                  {folder.name}
                </button>
              </li>
            ))
          )}
        </ul>
        {viewers && impact ? (
          <div className="space-y-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
            <p>
              {t("move.viewers")}
              {impact.publicLinkCount ? ` · ${p("publicLink", impact.publicLinkCount)}` : ""}
              {impact.peopleCount ? ` · ${p("person", impact.peopleCount)}` : ""}. {t("move.after")}
            </p>
            <label className="flex cursor-pointer items-start gap-2">
              <input
                type="checkbox"
                className="mt-1"
                checked={ownerConfirm}
                onChange={(event) => setOwnerConfirm(event.target.checked)}
              />
              <span>{t("move.ownerConfirm")}</span>
            </label>
          </div>
        ) : null}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button
            disabled={busy || (viewers && !ownerConfirm)}
            onClick={async () => {
              setBusy(true);
              try {
                await onMove(parentId, { confirmViewers: viewers });
                onOpenChange(false);
              } catch (error) {
                toast.error(error instanceof ApiError ? error.message : t("move.failed"));
              } finally {
                setBusy(false);
              }
            }}
          >
            {viewers ? t("move.moveAsOwner") : t("move.moveHere")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
