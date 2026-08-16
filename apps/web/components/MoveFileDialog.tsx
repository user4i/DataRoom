"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Node = { id: string; name: string; parentId: string | null };

export function MoveFileDialog({
  open,
  onOpenChange,
  dataRoomId,
  dataRoomName,
  onMove,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dataRoomId: string;
  dataRoomName: string;
  onMove: (folderId: string | null) => Promise<void>;
}) {
  const [parentId, setParentId] = useState<string | null>(null);
  const [crumbs, setCrumbs] = useState<{ id: string | null; name: string }[]>([{ id: null, name: dataRoomName }]);
  const [folders, setFolders] = useState<Node[]>([]);
  const [busy, setBusy] = useState(false);

  const load = async (id: string | null) => {
    try {
      const q = id ? `?parentId=${id}` : "";
      const data = await api<Node[]>(`/data-rooms/${dataRoomId}/folder-tree${q}`);
      setFolders(data);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not load folders");
    }
  };

  useEffect(() => {
    if (open) {
      setParentId(null);
      setCrumbs([{ id: null, name: dataRoomName }]);
      void load(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, dataRoomId, dataRoomName]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Move file</DialogTitle>
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
            <li className="px-3 py-6 text-center text-sm text-muted-foreground">No subfolders here</li>
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
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onMove(parentId);
                onOpenChange(false);
              } catch (error) {
                toast.error(error instanceof ApiError ? error.message : "Could not move file");
              } finally {
                setBusy(false);
              }
            }}
          >
            Move here
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
