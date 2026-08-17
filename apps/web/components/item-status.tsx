"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { ResourceType, StatusDefDto } from "@dataroom/shared";
import { api, ApiError } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

export function ItemStatus({
  resourceType,
  resourceId,
  status,
  canEdit,
  onChange,
}: {
  resourceType: ResourceType;
  resourceId: string;
  status: StatusDefDto | null;
  canEdit: boolean;
  onChange?: (status: StatusDefDto | null) => void;
}) {
  const { t } = useI18n();
  const [catalog, setCatalog] = useState<StatusDefDto[]>([]);
  const [selected, setSelected] = useState<StatusDefDto | null>(status);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setSelected(status);
  }, [status, resourceId]);

  useEffect(() => {
    if (!canEdit) return;
    api<StatusDefDto[]>("/me/statuses", { progress: false })
      .then(setCatalog)
      .catch(() => undefined);
  }, [canEdit]);

  async function choose(next: StatusDefDto | null) {
    setBusy(true);
    try {
      const saved = await api<StatusDefDto | null>("/statuses", {
        method: "PUT",
        body: JSON.stringify({ resourceType, resourceId, statusId: next?.id ?? null }),
      });
      setSelected(saved);
      onChange?.(saved);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("settings.saveFailed"));
    } finally {
      setBusy(false);
    }
  }

  if (!canEdit) {
    return (
      <div className="mt-4 border-t pt-3">
        <h3 className="mb-2 text-sm font-medium">{t("status.title")}</h3>
        <p className="text-sm text-muted-foreground">{selected?.name ?? t("status.none")}</p>
      </div>
    );
  }

  return (
    <div className="mt-4 border-t pt-3">
      <h3 className="mb-2 text-sm font-medium">{t("status.title")}</h3>
      <div className="flex flex-wrap gap-1.5">
        <Button
          type="button"
          size="sm"
          variant={!selected ? "default" : "outline"}
          className="h-7 px-2 text-xs"
          disabled={busy}
          onClick={() => void choose(null)}
        >
          {t("status.none")}
        </Button>
        {catalog.map((item) => (
          <Button
            key={item.id}
            type="button"
            size="sm"
            variant={selected?.id === item.id ? "default" : "outline"}
            className="h-7 px-2 text-xs"
            disabled={busy}
            onClick={() => void choose(item)}
          >
            {item.name}
          </Button>
        ))}
      </div>
    </div>
  );
}

export function StatusPill({ status }: { status?: StatusDefDto | null }) {
  if (!status) return null;
  return (
    <span
      className="max-w-[6rem] truncate rounded-full bg-secondary px-1.5 py-0 text-[10px] leading-4 text-secondary-foreground"
      title={status.name}
    >
      {status.name}
    </span>
  );
}
