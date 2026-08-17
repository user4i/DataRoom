"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { ResourceType, TagDefDto } from "@dataroom/shared";
import { api, ApiError } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

export function ItemTags({
  resourceType,
  resourceId,
  tags,
  canEdit,
  onChange,
}: {
  resourceType: ResourceType;
  resourceId: string;
  tags: TagDefDto[];
  canEdit: boolean;
  onChange?: (tags: TagDefDto[]) => void;
}) {
  const { t } = useI18n();
  const [catalog, setCatalog] = useState<TagDefDto[]>([]);
  const [selected, setSelected] = useState<TagDefDto[]>(tags);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setSelected(tags);
  }, [tags, resourceId]);

  useEffect(() => {
    if (!canEdit) return;
    api<TagDefDto[]>("/me/tags", { progress: false })
      .then(setCatalog)
      .catch(() => undefined);
  }, [canEdit]);

  async function toggle(tag: TagDefDto) {
    const exists = selected.some((item) => item.id === tag.id);
    const next = exists ? selected.filter((item) => item.id !== tag.id) : [...selected, tag];
    setBusy(true);
    try {
      const saved = await api<TagDefDto[]>("/tags", {
        method: "PUT",
        body: JSON.stringify({ resourceType, resourceId, tagIds: next.map((item) => item.id) }),
      });
      setSelected(saved);
      onChange?.(saved);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("settings.saveFailed"));
    } finally {
      setBusy(false);
    }
  }

  const visible = canEdit ? catalog : selected;
  if (visible.length === 0 && selected.length === 0) {
    return (
      <div className="mt-4 border-t pt-3">
        <h3 className="mb-2 text-sm font-medium">{t("tags.title")}</h3>
        <p className="text-sm text-muted-foreground">{t("tags.none")}</p>
      </div>
    );
  }

  return (
    <div className="mt-4 border-t pt-3">
      <h3 className="mb-2 text-sm font-medium">{t("tags.title")}</h3>
      <div className="flex flex-wrap gap-1.5">
        {visible.map((tag) => {
          const active = selected.some((item) => item.id === tag.id);
          return (
            <Button
              key={tag.id}
              type="button"
              size="sm"
              variant={active ? "default" : "outline"}
              className="h-7 px-2 text-xs"
              disabled={!canEdit || busy}
              onClick={() => canEdit && void toggle(tag)}
            >
              {tag.name}
            </Button>
          );
        })}
      </div>
    </div>
  );
}

export function TagPills({ tags }: { tags?: TagDefDto[] }) {
  if (!tags?.length) return null;
  return (
    <span className="flex max-w-[9rem] flex-wrap justify-end gap-1">
      {tags.slice(0, 3).map((tag) => (
        <span
          key={tag.id}
          className="max-w-[4.5rem] truncate rounded-full border px-1.5 py-0 text-[10px] leading-4 text-muted-foreground"
          title={tag.name}
        >
          {tag.name}
        </span>
      ))}
    </span>
  );
}
