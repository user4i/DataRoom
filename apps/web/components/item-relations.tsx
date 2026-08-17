"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Folder, X } from "lucide-react";
import { toast } from "sonner";
import type { ListingDto, RelatedItemDto, ResourceType } from "@dataroom/shared";
import { api, ApiError } from "@/lib/api";
import { startNavigation } from "@/lib/progress";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function itemKey(item: { resourceType: string; resourceId: string }) {
  return `${item.resourceType}:${item.resourceId}`;
}

function relatedHref(item: RelatedItemDto, publicToken?: string) {
  if (publicToken) {
    return item.resourceType === "FILE"
      ? `/s/${publicToken}/files/${item.resourceId}`
      : `/s/${publicToken}/f/${item.resourceId}`;
  }
  return item.resourceType === "FILE"
    ? `/rooms/${item.dataRoomId}/files/${item.resourceId}`
    : `/rooms/${item.dataRoomId}/f/${item.resourceId}`;
}

export function ItemRelations({
  resourceType,
  resourceId,
  dataRoomId,
  publicToken,
  relations,
  canEdit,
  onChange,
  onNavigate,
}: {
  resourceType: ResourceType;
  resourceId: string;
  dataRoomId?: string;
  publicToken?: string;
  relations: RelatedItemDto[];
  canEdit: boolean;
  onChange?: (items: RelatedItemDto[]) => void;
  onNavigate?: () => void;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [selected, setSelected] = useState<RelatedItemDto[]>(relations);
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setSelected(relations);
    setPicking(false);
  }, [relations, resourceId]);

  async function save(next: RelatedItemDto[]) {
    setBusy(true);
    try {
      const saved = await api<RelatedItemDto[]>("/relations", {
        method: "PUT",
        body: JSON.stringify({
          resourceType,
          resourceId,
          items: next.map((item) => ({ resourceType: item.resourceType, resourceId: item.resourceId })),
        }),
      });
      setSelected(saved);
      onChange?.(saved);
      return saved;
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("settings.saveFailed"));
      return null;
    } finally {
      setBusy(false);
    }
  }

  function openRelated(item: RelatedItemDto) {
    onNavigate?.();
    startNavigation();
    router.push(relatedHref(item, publicToken));
  }

  async function remove(item: RelatedItemDto) {
    await save(selected.filter((row) => itemKey(row) !== itemKey(item)));
  }

  return (
    <div className="mt-4 border-t pt-3">
      <h3 className="mb-2 text-sm font-medium">{t("relations.title")}</h3>
      {selected.length === 0 && !picking ? (
        <p className="text-sm text-muted-foreground">{t("relations.none")}</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((item) => (
            <span
              key={itemKey(item)}
              className="inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-0.5 text-xs"
            >
              <button
                type="button"
                className="inline-flex min-w-0 items-center gap-1 hover:underline"
                onClick={() => openRelated(item)}
              >
                {item.resourceType === "FOLDER" ? (
                  <Folder className="size-3 shrink-0 text-sky-700 dark:text-sky-400" />
                ) : (
                  <FileText className="size-3 shrink-0 text-red-700 dark:text-red-400" />
                )}
                <span className="truncate">{item.name}</span>
              </button>
              {canEdit && !picking ? (
                <button
                  type="button"
                  className="rounded-full p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                  aria-label={t("common.delete")}
                  disabled={busy}
                  onClick={() => void remove(item)}
                >
                  <X className="size-3" />
                </button>
              ) : null}
            </span>
          ))}
        </div>
      )}
      {canEdit && dataRoomId && !picking ? (
        <Button type="button" size="sm" variant="outline" className="mt-2 h-7 px-2 text-xs" onClick={() => setPicking(true)}>
          {t("relations.add")}
        </Button>
      ) : null}
      {canEdit && dataRoomId && picking ? (
        <RelationPicker
          dataRoomId={dataRoomId}
          resourceType={resourceType}
          resourceId={resourceId}
          initial={selected}
          busy={busy}
          onCancel={() => setPicking(false)}
          onSave={async (next) => {
            const saved = await save(next);
            if (saved) setPicking(false);
          }}
        />
      ) : null}
    </div>
  );
}

function RelationPicker({
  dataRoomId,
  resourceType,
  resourceId,
  initial,
  busy,
  onCancel,
  onSave,
}: {
  dataRoomId: string;
  resourceType: ResourceType;
  resourceId: string;
  initial: RelatedItemDto[];
  busy: boolean;
  onCancel: () => void;
  onSave: (items: RelatedItemDto[]) => Promise<void>;
}) {
  const { t } = useI18n();
  const [draft, setDraft] = useState<RelatedItemDto[]>(initial);
  const [query, setQuery] = useState("");
  const [applied, setApplied] = useState("");
  const [folderId, setFolderId] = useState<string | null>(null);
  const [crumbs, setCrumbs] = useState<{ id: string | null; name: string }[]>([]);
  const [rows, setRows] = useState<RelatedItemDto[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handle = setTimeout(() => setApplied(query.trim()), 250);
    return () => clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const load = async () => {
      try {
        if (applied) {
          const data = await api<{
            folders: { id: string; name: string }[];
            files: { id: string; name: string }[];
          }>(`/data-rooms/${dataRoomId}/search?q=${encodeURIComponent(applied)}`, { progress: false });
          if (cancelled) return;
          setRows([
            ...data.folders.map((folder) => ({
              resourceType: "FOLDER" as const,
              resourceId: folder.id,
              name: folder.name,
              dataRoomId,
            })),
            ...data.files.map((file) => ({
              resourceType: "FILE" as const,
              resourceId: file.id,
              name: file.name,
              dataRoomId,
            })),
          ]);
          return;
        }
        const path = folderId
          ? `/folders/${folderId}?page=1&pageSize=100`
          : `/data-rooms/${dataRoomId}?page=1&pageSize=100`;
        const listing = await api<ListingDto>(path, { progress: false });
        if (cancelled) return;
        if (!folderId) {
          setCrumbs([{ id: null, name: listing.dataRoom.name }]);
        }
        setRows([
          ...listing.folders.map((folder) => ({
            resourceType: "FOLDER" as const,
            resourceId: folder.id,
            name: folder.name,
            dataRoomId,
          })),
          ...listing.files.map((file) => ({
            resourceType: "FILE" as const,
            resourceId: file.id,
            name: file.name,
            dataRoomId,
          })),
        ]);
      } catch (err) {
        if (!cancelled) {
          toast.error(err instanceof ApiError ? err.message : t("explorer.searchFailed"));
          setRows([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [applied, dataRoomId, folderId, t]);

  const selectedKeys = new Set(draft.map(itemKey));
  const selfKey = `${resourceType}:${resourceId}`;

  function toggle(item: RelatedItemDto) {
    if (itemKey(item) === selfKey) return;
    setDraft((current) =>
      selectedKeys.has(itemKey(item))
        ? current.filter((row) => itemKey(row) !== itemKey(item))
        : [...current, item],
    );
  }

  async function openFolder(item: RelatedItemDto) {
    setQuery("");
    setApplied("");
    setFolderId(item.resourceId);
    setCrumbs((current) => [...current, { id: item.resourceId, name: item.name }]);
  }

  return (
    <div className="mt-3 space-y-2 rounded-md border p-2">
      {draft.length ? (
        <div className="flex flex-wrap gap-1">
          {draft.map((item) => (
            <button
              key={itemKey(item)}
              type="button"
              className="inline-flex max-w-full items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[11px]"
              onClick={() => toggle(item)}
            >
              <span className="truncate">{item.name}</span>
              <X className="size-3 shrink-0" />
            </button>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">{t("relations.pickHint")}</p>
      )}
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={t("relations.search")}
      />
      {!applied && crumbs.length > 0 ? (
        <div className="flex flex-wrap gap-1 text-xs text-muted-foreground">
          {crumbs.map((crumb, index) => (
            <button
              key={`${crumb.id}-${index}`}
              type="button"
              className="hover:text-foreground"
              onClick={() => {
                setCrumbs(crumbs.slice(0, index + 1));
                setFolderId(crumb.id);
              }}
            >
              {crumb.name}
              {index < crumbs.length - 1 ? " / " : ""}
            </button>
          ))}
        </div>
      ) : null}
      <ul className="max-h-48 divide-y overflow-auto rounded-md border">
        {loading ? (
          <li className="px-3 py-4 text-center text-xs text-muted-foreground">{t("common.loading")}</li>
        ) : rows.length === 0 ? (
          <li className="px-3 py-4 text-center text-xs text-muted-foreground">{t("relations.empty")}</li>
        ) : (
          rows.map((item) => {
            const self = itemKey(item) === selfKey;
            const checked = selectedKeys.has(itemKey(item));
            return (
              <li key={itemKey(item)} className="flex items-center gap-2 px-2 py-1.5">
                <input
                  type="checkbox"
                  className="shrink-0"
                  checked={checked}
                  disabled={self}
                  onChange={() => toggle(item)}
                />
                {item.resourceType === "FOLDER" ? (
                  <Folder className="size-3.5 shrink-0 text-sky-700 dark:text-sky-400" />
                ) : (
                  <FileText className="size-3.5 shrink-0 text-red-700 dark:text-red-400" />
                )}
                {item.resourceType === "FOLDER" && !applied ? (
                  <button
                    type="button"
                    className="min-w-0 flex-1 truncate text-left text-sm hover:underline disabled:no-underline"
                    disabled={self}
                    onClick={() => void openFolder(item)}
                  >
                    {item.name}
                  </button>
                ) : (
                  <span className={`min-w-0 flex-1 truncate text-sm ${self ? "text-muted-foreground" : ""}`}>
                    {item.name}
                  </span>
                )}
              </li>
            );
          })
        )}
      </ul>
      <div className="flex justify-end gap-2">
        <Button type="button" size="sm" variant="outline" onClick={onCancel} disabled={busy}>
          {t("common.cancel")}
        </Button>
        <Button type="button" size="sm" disabled={busy} onClick={() => void onSave(draft)}>
          {t("common.save")}
        </Button>
      </div>
    </div>
  );
}

export function RelationPills({ relations }: { relations?: RelatedItemDto[] }) {
  if (!relations?.length) return null;
  return (
    <span className="flex max-w-[7rem] flex-wrap justify-end gap-1">
      {relations.slice(0, 2).map((item) => (
        <span
          key={itemKey(item)}
          className="max-w-[3.5rem] truncate rounded-full border border-dashed px-1.5 py-0 text-[10px] leading-4 text-muted-foreground"
          title={item.name}
        >
          {item.name}
        </span>
      ))}
    </span>
  );
}
