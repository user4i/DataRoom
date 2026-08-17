"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type CatalogItem = { id: string; name: string };

export function CatalogEditor({
  items,
  onCreate,
  onRename,
  onDelete,
}: {
  items: CatalogItem[];
  onCreate: (name: string) => Promise<CatalogItem>;
  onRename: (id: string, name: string) => Promise<CatalogItem>;
  onDelete: (id: string) => Promise<void>;
}) {
  const { t } = useI18n();
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  async function add() {
    const name = draft.trim();
    if (!name) return;
    setBusy(true);
    try {
      await onCreate(name);
      setDraft("");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("settings.saveFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <ul className="space-y-2">
        {items.map((item) => (
          <CatalogRow key={item.id} item={item} onRename={onRename} onDelete={onDelete} />
        ))}
      </ul>
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={40}
          placeholder={t("settings.catalogAdd")}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void add();
            }
          }}
        />
        <Button type="button" variant="outline" onClick={() => void add()} disabled={busy || !draft.trim()}>
          {t("common.create")}
        </Button>
      </div>
    </div>
  );
}

function CatalogRow({
  item,
  onRename,
  onDelete,
}: {
  item: CatalogItem;
  onRename: (id: string, name: string) => Promise<CatalogItem>;
  onDelete: (id: string) => Promise<void>;
}) {
  const { t } = useI18n();
  const [name, setName] = useState(item.name);
  const [busy, setBusy] = useState(false);
  const dirty = name.trim() !== item.name;

  useEffect(() => {
    setName(item.name);
  }, [item.name]);

  async function save() {
    const next = name.trim();
    if (!next || next === item.name) return;
    setBusy(true);
    try {
      await onRename(item.id, next);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("settings.saveFailed"));
      setName(item.name);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await onDelete(item.id);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("settings.saveFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex gap-2">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={40}
        onBlur={() => void save()}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            void save();
          }
        }}
      />
      {dirty ? (
        <Button type="button" variant="outline" size="sm" onClick={() => void save()} disabled={busy}>
          {t("common.save")}
        </Button>
      ) : (
        <Button type="button" variant="ghost" size="sm" onClick={() => void remove()} disabled={busy}>
          {t("common.delete")}
        </Button>
      )}
    </div>
  );
}
