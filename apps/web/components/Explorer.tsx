"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Search, Share2, Upload } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { DeletionPreviewDto, FileDto, FolderDto, ListingDto, ResourceType } from "@dataroom/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { FolderList } from "@/components/FolderList";
import { FileRow } from "@/components/FileRow";
import { UploadDropzone } from "@/components/UploadDropzone";
import { ShareDialog } from "@/components/ShareDialog";
import { MoveFileDialog } from "@/components/MoveFileDialog";
import { DeletePreviewDialog } from "@/components/DeletePreviewDialog";
import { EmptyState } from "@/components/empty-state";
import { useDensity } from "@/lib/density";

export function Explorer({
  roomId,
  folderId,
  publicToken,
}: {
  roomId?: string;
  folderId?: string;
  publicToken?: string;
}) {
  const router = useRouter();
  const { density } = useDensity();
  const compact = density === "compact";
  const [listing, setListing] = useState<ListingDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [renameTarget, setRenameTarget] = useState<{ type: "folder" | "file"; id: string; name: string } | null>(null);
  const [share, setShare] = useState<{ type: ResourceType; id: string } | null>(null);
  const [moveFile, setMoveFile] = useState<FileDto | null>(null);
  const [deletePreview, setDeletePreview] = useState<DeletionPreviewDto | null>(null);
  const [deleteFolderId, setDeleteFolderId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ folders: { id: string; name: string }[]; files: { id: string; name: string }[] } | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);

  const isPublic = Boolean(publicToken);
  const canEdit = listing?.access === "OWNER" && !isPublic;

  const load = useCallback(async () => {
    try {
      setError(null);
      const path = publicToken
        ? folderId
          ? `/public/${publicToken}/folders/${folderId}`
          : `/public/${publicToken}`
        : folderId
          ? `/folders/${folderId}`
          : `/data-rooms/${roomId}`;
      const data = publicToken && !folderId
        ? await api<{ listing?: ListingDto; file?: unknown; share: { resourceType: string } }>(path)
        : await api<ListingDto>(path);
      if (publicToken && !folderId && "listing" in data && data.listing) {
        setListing(data.listing);
      } else if (publicToken && !folderId && "file" in data && data.file) {
        const file = (data as { file: { file: FileDto } }).file.file;
        router.replace(`/s/${publicToken}/files/${file.id}`);
        return;
      } else {
        setListing(data as ListingDto);
      }
    } catch (err) {
      const status = err instanceof ApiError ? err.status : 0;
      if (status === 404) setError("This item is no longer available");
      else if (status === 403) setError("You do not have access to this item");
      else if (status === 401) setError("Please sign in");
      else setError(err instanceof Error ? err.message : "Could not load");
    }
  }, [roomId, folderId, publicToken, router]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!query.trim() || isPublic || !listing) {
      setResults(null);
      return;
    }
    const handle = setTimeout(async () => {
      try {
        const data = await api<{ folders: { id: string; name: string }[]; files: { id: string; name: string }[] }>(
          `/data-rooms/${listing.dataRoom.id}/search?q=${encodeURIComponent(query.trim())}`,
        );
        setResults(data);
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : "Search failed");
      }
    }, 250);
    return () => clearTimeout(handle);
  }, [query, isPublic, listing]);

  const hrefFor = (item: { id: string }, index: number) => {
    if (!listing) return null;
    if (index === 0) {
      return publicToken ? `/s/${publicToken}` : `/rooms/${listing.dataRoom.id}`;
    }
    return publicToken ? `/s/${publicToken}/f/${item.id}` : `/rooms/${listing.dataRoom.id}/f/${item.id}`;
  };

  const openFolder = (folder: FolderDto) => {
    if (publicToken) router.push(`/s/${publicToken}/f/${folder.id}`);
    else router.push(`/rooms/${folder.dataRoomId}/f/${folder.id}`);
  };
  const openFile = (file: FileDto) => {
    if (publicToken) router.push(`/s/${publicToken}/files/${file.id}`);
    else router.push(`/rooms/${file.dataRoomId}/files/${file.id}`);
  };

  if (error) {
    return (
      <EmptyState
        title={error}
        description="It may have been deleted or the share was revoked. Try going back to your rooms."
        action={
          <Button asChild>
            <a href={publicToken ? "/" : "/rooms"}>Back</a>
          </Button>
        }
      />
    );
  }

  if (!listing) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className={compact ? "space-y-3" : "space-y-6"}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Breadcrumbs items={listing.breadcrumbs} hrefFor={hrefFor} />
        {canEdit ? (
          compact ? (
          <div className="flex items-center gap-1">
            {!isPublic ? (
              <Button
                variant={searchOpen || query ? "secondary" : "ghost"}
                size="icon"
                className="size-8"
                aria-label="Search"
                onClick={() => setSearchOpen((v) => !v)}
              >
                <Search className="size-4" />
              </Button>
            ) : null}
            <Button
              variant={uploadOpen || uploadBusy ? "secondary" : "ghost"}
              size="icon"
              className="size-8"
              aria-label="Upload PDFs"
              onClick={() => setUploadOpen((v) => !v)}
            >
              <Upload className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              aria-label="Share"
              onClick={() =>
                setShare({
                  type: listing.folder ? "FOLDER" : "DATA_ROOM",
                  id: listing.folder?.id ?? listing.dataRoom.id,
                })
              }
            >
              <Share2 className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              aria-label="New folder"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="size-4" />
            </Button>
          </div>
          ) : (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() =>
                setShare({
                  type: listing.folder ? "FOLDER" : "DATA_ROOM",
                  id: listing.folder?.id ?? listing.dataRoom.id,
                })
              }
            >
              <Share2 className="size-4" /> Share
            </Button>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" /> New folder
            </Button>
          </div>
          )
        ) : (
          <div className="flex items-center gap-1">
            {!isPublic && compact ? (
              <Button
                variant={searchOpen || query ? "secondary" : "ghost"}
                size="icon"
                className="size-8"
                aria-label="Search"
                onClick={() => setSearchOpen((v) => !v)}
              >
                <Search className="size-4" />
              </Button>
            ) : null}
            <p className="text-sm text-muted-foreground">View only</p>
          </div>
        )}
      </div>

      {!isPublic && (!compact || searchOpen || query.trim()) ? (
        <Input
          autoFocus={compact}
          placeholder="Search files and folders by name"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setQuery("");
              setSearchOpen(false);
            }
          }}
        />
      ) : null}

      {results && query.trim() ? (
        <div className="rounded-lg border bg-card p-3">
          <p className="mb-2 text-sm font-medium">Search results</p>
          {results.folders.length === 0 && results.files.length === 0 ? (
            <p className="text-sm text-muted-foreground">No matches</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {results.folders.map((f) => (
                <li key={f.id}>
                  <button className="text-left hover:underline" onClick={() => openFolder(f as FolderDto)}>
                    Folder: {f.name}
                  </button>
                </li>
              ))}
              {results.files.map((f) => (
                <li key={f.id}>
                  <button className="text-left hover:underline" onClick={() => openFile({ ...f, dataRoomId: listing.dataRoom.id, folderId: null, size: "0", mimeType: "application/pdf", createdAt: "", updatedAt: "" })}>
                    File: {f.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {canEdit && (!compact || uploadOpen || uploadBusy) ? (
        <UploadDropzone
          compact={compact}
          dataRoomId={listing.dataRoom.id}
          folderId={listing.folder?.id ?? null}
          onUploaded={() => void load()}
          onBusyChange={setUploadBusy}
        />
      ) : null}

      {listing.folders.length === 0 && listing.files.length === 0 ? (
        <EmptyState
          title={canEdit ? "This folder is empty" : "Nothing to show yet"}
          description={canEdit ? "Create a folder or drop PDFs above." : "The owner has not added files here."}
        />
      ) : (
        <div
          className={
            compact && listing.folders.length > 0 && listing.files.length > 0
              ? "grid items-start gap-3 md:grid-cols-[minmax(0,16rem)_minmax(0,1fr)] lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]"
              : compact
                ? "space-y-3"
                : "space-y-6"
          }
        >
          <div className="min-w-0">
          <FolderList
            folders={listing.folders}
            onOpen={openFolder}
            canEdit={canEdit}
            onRename={(folder) => setRenameTarget({ type: "folder", id: folder.id, name: folder.name })}
            onShare={(folder) => setShare({ type: "FOLDER", id: folder.id })}
            onDelete={async (folder) => {
              try {
                const preview = await api<DeletionPreviewDto>(`/folders/${folder.id}/deletion-preview`);
                setDeleteFolderId(folder.id);
                setDeletePreview(preview);
              } catch (err) {
                toast.error(err instanceof ApiError ? err.message : "Could not prepare delete");
              }
            }}
          />
          </div>
          {listing.files.length > 0 ? (
            <div className="min-w-0 space-y-1">
              <p className="px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Files</p>
              <ul className="divide-y rounded-lg border bg-card">
                {listing.files.map((file) => (
                  <FileRow
                    key={file.id}
                    file={file}
                    onOpen={openFile}
                    canEdit={canEdit}
                    onRename={(f) => setRenameTarget({ type: "file", id: f.id, name: f.name })}
                    onMove={setMoveFile}
                    onShare={(f) => setShare({ type: "FILE", id: f.id })}
                    onDelete={async (f) => {
                      if (!confirm(`Delete ${f.name}? This cannot be undone.`)) return;
                      try {
                        await api(`/files/${f.id}`, { method: "DELETE" });
                        toast.success("File deleted");
                        await load();
                      } catch (err) {
                        toast.error(err instanceof ApiError ? err.message : "Could not delete file");
                      }
                    }}
                  />
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New folder</DialogTitle>
          </DialogHeader>
          <Label htmlFor="folder-name">Name</Label>
          <Input id="folder-name" value={folderName} onChange={(e) => setFolderName(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                try {
                  await api(`/data-rooms/${listing.dataRoom.id}/folders`, {
                    method: "POST",
                    body: JSON.stringify({ name: folderName, parentId: listing.folder?.id }),
                  });
                  setFolderName("");
                  setCreateOpen(false);
                  toast.success("Folder created");
                  await load();
                } catch (err) {
                  toast.error(err instanceof ApiError ? err.message : "Could not create folder");
                }
              }}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(renameTarget)} onOpenChange={(v) => !v && setRenameTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename</DialogTitle>
          </DialogHeader>
          <Input value={renameTarget?.name ?? ""} onChange={(e) => setRenameTarget((t) => (t ? { ...t, name: e.target.value } : t))} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameTarget(null)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!renameTarget) return;
                try {
                  if (renameTarget.type === "folder") {
                    await api(`/folders/${renameTarget.id}`, { method: "PATCH", body: JSON.stringify({ name: renameTarget.name }) });
                  } else {
                    await api(`/files/${renameTarget.id}`, { method: "PATCH", body: JSON.stringify({ name: renameTarget.name }) });
                  }
                  setRenameTarget(null);
                  toast.success("Renamed");
                  await load();
                } catch (err) {
                  toast.error(err instanceof ApiError ? err.message : "Choose another name");
                }
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {share ? (
        <ShareDialog
          open
          onOpenChange={(v) => !v && setShare(null)}
          resourceType={share.type}
          resourceId={share.id}
        />
      ) : null}

      {moveFile ? (
        <MoveFileDialog
          open
          onOpenChange={(v) => !v && setMoveFile(null)}
          dataRoomId={listing.dataRoom.id}
          dataRoomName={listing.dataRoom.name}
          onMove={async (dest) => {
            await api(`/files/${moveFile.id}/move`, { method: "POST", body: JSON.stringify({ folderId: dest }) });
            toast.success("File moved");
            await load();
          }}
        />
      ) : null}

      <DeletePreviewDialog
        open={Boolean(deleteFolderId)}
        onOpenChange={(v) => {
          if (!v) {
            setDeleteFolderId(null);
            setDeletePreview(null);
          }
        }}
        preview={deletePreview}
        onConfirm={async () => {
          if (!deleteFolderId) return;
          try {
            await api(`/folders/${deleteFolderId}`, { method: "DELETE" });
            toast.success("Folder deleted");
            setDeleteFolderId(null);
            setDeletePreview(null);
            await load();
          } catch (err) {
            toast.error(err instanceof ApiError ? err.message : "Could not delete folder");
          }
        }}
      />
    </div>
  );
}
