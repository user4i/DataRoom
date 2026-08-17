"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Info, Plus, Search, Share2, Upload } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { startNavigation } from "@/lib/progress";
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
import { ListingPager, DEFAULT_PAGE_SIZE, isPageSize, PAGE_SIZE_STORAGE_KEY } from "@/components/listing-pager";
import { useDensityFlags } from "@/lib/density";
import { detailsFromFile, detailsFromFolder, ItemDetailsDialog, type ItemDetails } from "@/components/item-details";
import { FileVersionsDialog } from "@/components/file-versions-dialog";
import {
  UploadConflictDialog,
  type ConflictDecision,
  type NameConflict,
} from "@/components/upload-conflict-dialog";

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
  const { t } = useI18n();
  const { dense, minimal } = useDensityFlags();
  const [listing, setListing] = useState<ListingDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [renameTarget, setRenameTarget] = useState<{ type: "folder" | "file"; id: string; name: string } | null>(null);
  const [share, setShare] = useState<{ type: ResourceType; id: string } | null>(null);
  const [moveFile, setMoveFile] = useState<FileDto | null>(null);
  const [pendingMove, setPendingMove] = useState<{
    fileId: string;
    folderId: string | null;
    confirmViewers?: boolean;
  } | null>(null);
  const [moveConflict, setMoveConflict] = useState<NameConflict | null>(null);
  const [deletePreview, setDeletePreview] = useState<DeletionPreviewDto | null>(null);
  const [deleteFolderId, setDeleteFolderId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [results, setResults] = useState<{ folders: { id: string; name: string }[]; files: { id: string; name: string }[] } | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [details, setDetails] = useState<ItemDetails | null>(null);
  const [versionsFileId, setVersionsFileId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [pageSizeReady, setPageSizeReady] = useState(false);

  const isPublic = Boolean(publicToken);
  const canEdit = listing?.access === "OWNER" && !isPublic;
  const location = listing?.breadcrumbs.map((item) => item.name).join(" / ") ?? "";
  const owner = listing?.dataRoom.owner;

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = Boolean(opts?.silent);
    try {
      if (!silent) setError(null);
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (appliedQuery) params.set("q", appliedQuery);
      const path = publicToken
        ? folderId
          ? `/public/${publicToken}/folders/${folderId}?${params}`
          : `/public/${publicToken}?${params}`
        : folderId
          ? `/folders/${folderId}?${params}`
          : `/data-rooms/${roomId}?${params}`;
      const request = { progress: !silent };
      const data = publicToken && !folderId
        ? await api<{ listing?: ListingDto; file?: unknown; share: { resourceType: string } }>(path, request)
        : await api<ListingDto>(path, request);
      if (publicToken && !folderId && "listing" in data && data.listing) {
        setListing(data.listing);
        if (data.listing.page !== page) setPage(data.listing.page);
      } else if (publicToken && !folderId && "file" in data && data.file) {
        const file = (data as { file: { file: FileDto } }).file.file;
        startNavigation();
        router.replace(`/s/${publicToken}/files/${file.id}`);
        return;
      } else {
        const listingData = data as ListingDto;
        setListing(listingData);
        if (listingData.page !== page) setPage(listingData.page);
      }
    } catch (err) {
      if (silent) return;
      const status = err instanceof ApiError ? err.status : 0;
      if (status === 404) setError(t("explorer.itemGone"));
      else if (status === 403) setError(t("explorer.noAccess"));
      else if (status === 401) setError(t("explorer.signIn"));
      else setError(err instanceof Error ? err.message : t("explorer.loadFailed"));
    }
  }, [roomId, folderId, publicToken, router, page, pageSize, appliedQuery, t]);

  useEffect(() => {
    const stored = Number(window.localStorage.getItem(PAGE_SIZE_STORAGE_KEY));
    if (isPageSize(stored)) setPageSize(stored);
    setPageSizeReady(true);
  }, []);

  useEffect(() => {
    setPage(1);
  }, [roomId, folderId, publicToken]);

  useEffect(() => {
    const handle = setTimeout(() => {
      setAppliedQuery(query.trim());
      setPage(1);
    }, 250);
    return () => clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    if (!pageSizeReady) return;
    void load();
  }, [load, pageSizeReady]);

  useEffect(() => {
    if (!listing) return;
    const busy = [...listing.folders, ...listing.files].some((item) => item.analysisStatus === "in_process");
    if (!busy) return;
    const timer = setInterval(() => void load({ silent: true }), 2500);
    return () => clearInterval(timer);
  }, [listing, load]);

  useEffect(() => {
    if (!query.trim() || isPublic || !listing) {
      setResults(null);
      return;
    }
    const handle = setTimeout(async () => {
      try {
        const data = await api<{ folders: { id: string; name: string }[]; files: { id: string; name: string }[] }>(
          `/data-rooms/${listing.dataRoom.id}/search?q=${encodeURIComponent(query.trim())}`,
          { progress: false },
        );
        setResults(data);
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : t("explorer.searchFailed"));
      }
    }, 250);
    return () => clearTimeout(handle);
  }, [query, isPublic, listing, t]);

  const hrefFor = (item: { id: string }, index: number) => {
    if (!listing) return null;
    if (index === 0) {
      return publicToken ? `/s/${publicToken}` : `/rooms/${listing.dataRoom.id}`;
    }
    return publicToken ? `/s/${publicToken}/f/${item.id}` : `/rooms/${listing.dataRoom.id}/f/${item.id}`;
  };

  const openFolder = (folder: FolderDto) => {
    startNavigation();
    if (publicToken) router.push(`/s/${publicToken}/f/${folder.id}`);
    else router.push(`/rooms/${folder.dataRoomId}/f/${folder.id}`);
  };
  const openFile = (file: FileDto) => {
    startNavigation();
    if (publicToken) router.push(`/s/${publicToken}/files/${file.id}`);
    else router.push(`/rooms/${file.dataRoomId}/files/${file.id}`);
  };

  const resolveMoveConflict = async (decision: ConflictDecision) => {
    const pending = pendingMove;
    const conflict = moveConflict;
    setMoveConflict(null);
    setPendingMove(null);
    setMoveFile(null);
    if (!pending || !conflict || decision.action === "skip") return;
    try {
      if (decision.action === "rename_old" || decision.action === "rename_both") {
        await api(`/files/${conflict.existing.id}`, {
          method: "PATCH",
          body: JSON.stringify({ name: decision.oldName }),
        });
      }
      if (decision.action === "replace") {
        await api(`/files/${pending.fileId}/move`, {
          method: "POST",
          body: JSON.stringify({
            folderId: pending.folderId,
            conflict: "replace",
            ...(pending.confirmViewers ? { confirmViewers: true } : {}),
          }),
        });
      } else if (decision.action === "keep_both") {
        await api(`/files/${pending.fileId}/move`, {
          method: "POST",
          body: JSON.stringify({
            folderId: pending.folderId,
            conflict: "keep_both",
            ...(pending.confirmViewers ? { confirmViewers: true } : {}),
          }),
        });
      } else if (decision.action === "rename_new" || decision.action === "rename_both") {
        await api(`/files/${pending.fileId}/move`, {
          method: "POST",
          body: JSON.stringify({
            folderId: pending.folderId,
            name: decision.newName,
            ...(pending.confirmViewers ? { confirmViewers: true } : {}),
          }),
        });
      } else {
        await api(`/files/${pending.fileId}/move`, {
          method: "POST",
          body: JSON.stringify({
            folderId: pending.folderId,
            ...(pending.confirmViewers ? { confirmViewers: true } : {}),
          }),
        });
      }
      toast.success(t("explorer.fileMoved"));
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("explorer.moveFailed"));
    }
  };

  if (error) {
    return (
      <EmptyState
        title={error}
        description={t("explorer.goneDescription")}
        action={
          <Button asChild>
            <a href={publicToken ? "/" : "/rooms"}>{t("common.back")}</a>
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

  const elsewhereFolders =
    results && query.trim()
      ? results.folders.filter((folder) => !listing.folders.some((item) => item.id === folder.id))
      : [];
  const elsewhereFiles =
    results && query.trim()
      ? results.files.filter((file) => !listing.files.some((item) => item.id === file.id))
      : [];

  return (
    <div className={minimal ? "space-y-2" : dense ? "space-y-3" : "space-y-6"}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1">
          <Breadcrumbs items={listing.breadcrumbs} hrefFor={hrefFor} />
          {listing.folder ? (
            <Button
              variant="ghost"
              size="icon"
              className="size-8 shrink-0 text-muted-foreground"
              aria-label={t("explorer.folderDetails")}
              onClick={() => {
                const folder = listing.folder;
                if (!folder) return;
                setDetails(
                  detailsFromFolder(folder, {
                    owner,
                    location: listing.breadcrumbs.slice(0, -1).map((item) => item.name).join(" / "),
                    canAnalyze: canEdit,
                    publicToken,
                    onStatusChange: () => void load({ silent: true }),
                  }),
                );
              }}
            >
              <Info className="size-4" />
            </Button>
          ) : null}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant={searchOpen || query ? "secondary" : "ghost"}
            size="icon"
            className="size-8"
            aria-label={t("explorer.search")}
            onClick={() => setSearchOpen((v) => !v)}
          >
            <Search className="size-4" />
          </Button>
          {canEdit ? (
            <>
              <Button
                variant={uploadOpen || uploadBusy ? "secondary" : "ghost"}
                size="icon"
                className="size-8"
                aria-label={t("explorer.uploadPdf")}
                onClick={() => setUploadOpen((v) => !v)}
              >
                <Upload className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                aria-label={t("common.share")}
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
                aria-label={t("explorer.newFolder")}
                onClick={() => setCreateOpen(true)}
              >
                <Plus className="size-4" />
              </Button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">{t("explorer.viewOnly")}</p>
          )}
        </div>
      </div>

      {searchOpen || query.trim() ? (
        <Input
          autoFocus
          placeholder={t("explorer.searchPlaceholder")}
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

      {!isPublic && (elsewhereFolders.length > 0 || elsewhereFiles.length > 0) ? (
        <div className="rounded-lg border bg-card p-3">
          <p className="mb-2 text-sm font-medium">{t("explorer.elsewhere")}</p>
          <ul className="space-y-1 text-sm">
            {elsewhereFolders.map((f) => (
              <li key={f.id}>
                <button className="text-left hover:underline" onClick={() => openFolder(f as FolderDto)}>
                  {t("common.folder")}: {f.name}
                </button>
              </li>
            ))}
            {elsewhereFiles.map((f) => (
              <li key={f.id}>
                <button
                  className="text-left hover:underline"
                  onClick={() =>
                    openFile({
                      ...f,
                      dataRoomId: listing.dataRoom.id,
                      folderId: null,
                      size: "0",
                      mimeType: "application/pdf",
                      createdAt: "",
                      updatedAt: "",
                    })
                  }
                >
                  {t("common.file")}: {f.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {canEdit && (!dense || uploadOpen || uploadBusy) ? (
        <UploadDropzone
          compact={dense}
          dataRoomId={listing.dataRoom.id}
          folderId={listing.folder?.id ?? null}
          onUploaded={() => void load()}
          onBusyChange={setUploadBusy}
        />
      ) : null}

      {listing.total === 0 ? (
        <EmptyState
          title={appliedQuery ? t("explorer.nothingFound") : canEdit ? t("explorer.emptyTitle") : t("explorer.emptyTitleViewer")}
          description={
            appliedQuery
              ? t("explorer.filterEmpty")
              : canEdit
                ? t("explorer.emptyDescription")
                : t("explorer.emptyDescriptionViewer")
          }
        />
      ) : (
        <div
          className={
            dense && listing.folders.length > 0 && listing.files.length > 0
              ? `grid items-start md:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] lg:grid-cols-[minmax(0,16rem)_minmax(0,1fr)] ${minimal ? "gap-2" : "gap-3"}`
              : dense
                ? "space-y-2"
                : "space-y-6"
          }
        >
          <div className="min-w-0">
          <FolderList
            folders={listing.folders}
            onOpen={openFolder}
            canEdit={canEdit}
            onDetails={(folder) =>
              setDetails(detailsFromFolder(folder, { owner, location, canAnalyze: canEdit, publicToken, onAnalysisQueued: () => void load({ silent: true }), onStatusChange: () => void load({ silent: true }) }))
            }
            onRename={(folder) => setRenameTarget({ type: "folder", id: folder.id, name: folder.name })}
            onShare={(folder) => setShare({ type: "FOLDER", id: folder.id })}
            onAnalyze={(folder) =>
              setDetails(
                detailsFromFolder(folder, {
                  owner,
                  location,
                  canAnalyze: canEdit,
                  publicToken,
                  autoAnalyze: true,
                  onAnalysisQueued: () => void load({ silent: true }),
                  onStatusChange: () => void load({ silent: true }),
                }),
              )
            }
            onDelete={async (folder) => {
              try {
                const preview = await api<DeletionPreviewDto>(`/folders/${folder.id}/deletion-preview`);
                setDeleteFolderId(folder.id);
                setDeletePreview(preview);
              } catch (err) {
                toast.error(err instanceof ApiError ? err.message : t("explorer.deletePrepFailed"));
              }
            }}
          />
          </div>
          {listing.files.length > 0 ? (
            <div className={`min-w-0 ${minimal ? "space-y-0" : "space-y-1"}`}>
              {minimal ? null : (
              <p className="px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("explorer.files")}</p>
              )}
              <ul className={`divide-y bg-card ${minimal ? "border-y" : "rounded-lg border"}`}>
                {listing.files.map((file) => (
                  <FileRow
                    key={file.id}
                    file={file}
                    onOpen={openFile}
                    canEdit={canEdit}
                    onDetails={(f) =>
                      setDetails(detailsFromFile(f, { owner, location, canAnalyze: canEdit, publicToken, onAnalysisQueued: () => void load({ silent: true }), onStatusChange: () => void load({ silent: true }) }))
                    }
                    onVersions={!isPublic ? (f) => setVersionsFileId(f.id) : undefined}
                    onRename={(f) => setRenameTarget({ type: "file", id: f.id, name: f.name })}
                    onMove={setMoveFile}
                    onShare={(f) => setShare({ type: "FILE", id: f.id })}
                    onAnalyze={(f) =>
                      setDetails(
                        detailsFromFile(f, {
                          owner,
                          location,
                          canAnalyze: canEdit,
                          publicToken,
                          autoAnalyze: true,
                          onAnalysisQueued: () => void load({ silent: true }),
                          onStatusChange: () => void load({ silent: true }),
                        }),
                      )
                    }
                    onDelete={async (f) => {
                      if (!confirm(t("explorer.deleteFileConfirm", { name: f.name }))) return;
                      try {
                        await api(`/files/${f.id}`, { method: "DELETE" });
                        toast.success(t("explorer.fileDeleted"));
                        await load();
                      } catch (err) {
                        toast.error(err instanceof ApiError ? err.message : t("explorer.deleteFileFailed"));
                      }
                    }}
                  />
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}

      <ListingPager
        page={listing.page}
        pageSize={listing.pageSize}
        total={listing.total}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          if (!isPageSize(size)) return;
          window.localStorage.setItem(PAGE_SIZE_STORAGE_KEY, String(size));
          setPageSize(size);
          setPage(1);
        }}
      />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("explorer.newFolder")}</DialogTitle>
          </DialogHeader>
          <Label htmlFor="folder-name">{t("common.name")}</Label>
          <Input id="folder-name" value={folderName} onChange={(e) => setFolderName(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              {t("common.cancel")}
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
                  toast.success(t("explorer.folderCreated"));
                  await load();
                } catch (err) {
                  toast.error(err instanceof ApiError ? err.message : t("explorer.createFolderFailed"));
                }
              }}
            >
              {t("common.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(renameTarget)} onOpenChange={(v) => !v && setRenameTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("common.rename")}</DialogTitle>
          </DialogHeader>
          <Input value={renameTarget?.name ?? ""} onChange={(e) => setRenameTarget((t) => (t ? { ...t, name: e.target.value } : t))} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameTarget(null)}>
              {t("common.cancel")}
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
                  toast.success(t("explorer.renamed"));
                  await load();
                } catch (err) {
                  toast.error(err instanceof ApiError ? err.message : t("explorer.pickAnotherName"));
                }
              }}
            >
              {t("common.save")}
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

      {moveFile && !moveConflict ? (
        <MoveFileDialog
          open
          onOpenChange={(v) => !v && setMoveFile(null)}
          dataRoomId={listing.dataRoom.id}
          dataRoomName={listing.dataRoom.name}
          fileId={moveFile.id}
          onMove={async (dest, options) => {
            const query = new URLSearchParams({ name: moveFile.name, excludeId: moveFile.id });
            if (dest) query.set("folderId", dest);
            const check = await api<{
              existing: FileDto | null;
              suggestedNewName: string;
              suggestedOldName: string;
            }>(`/data-rooms/${listing.dataRoom.id}/file-conflict?${query.toString()}`);
            if (!check.existing) {
              await api(`/files/${moveFile.id}/move`, {
                method: "POST",
                body: JSON.stringify({
                  folderId: dest,
                  ...(options?.confirmViewers ? { confirmViewers: true } : {}),
                }),
              });
              toast.success(t("explorer.fileMoved"));
              setMoveFile(null);
              await load();
              return;
            }
            setPendingMove({ fileId: moveFile.id, folderId: dest, confirmViewers: options?.confirmViewers });
            setMoveConflict({
              existing: check.existing,
              suggestedNewName: check.suggestedNewName,
              suggestedOldName: check.suggestedOldName,
              incomingName: moveFile.name,
            });
          }}
        />
      ) : null}

      <UploadConflictDialog
        mode="move"
        conflict={moveConflict}
        onResolve={(decision) => void resolveMoveConflict(decision)}
      />

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
            const viewers = deletePreview?.viewers;
            const confirmViewers = Boolean(viewers && viewers.publicLinkCount + viewers.peopleCount > 0);
            const query = confirmViewers ? "?confirmViewers=true" : "";
            await api(`/folders/${deleteFolderId}${query}`, { method: "DELETE" });
            toast.success(t("explorer.folderDeleted"));
            setDeleteFolderId(null);
            setDeletePreview(null);
            await load();
          } catch (err) {
            toast.error(err instanceof ApiError ? err.message : t("explorer.deleteFolderFailed"));
          }
        }}
      />
      <ItemDetailsDialog
        open={Boolean(details)}
        onOpenChange={(v) => !v && setDetails(null)}
        details={details}
        onOpenVersions={
          !isPublic && details?.kind === "file" && details.resourceId
            ? () => {
                setVersionsFileId(details.resourceId!);
                setDetails(null);
              }
            : undefined
        }
      />
      <FileVersionsDialog
        fileId={versionsFileId}
        open={Boolean(versionsFileId)}
        onOpenChange={(open) => {
          if (!open) setVersionsFileId(null);
        }}
      />
    </div>
  );
}
