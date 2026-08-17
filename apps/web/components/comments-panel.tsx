"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import type { CommentDto, ResourceType } from "@dataroom/shared";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

export function CommentsPanel({
  resourceType,
  resourceId,
  publicToken,
}: {
  resourceType: ResourceType;
  resourceId: string;
  publicToken?: string;
}) {
  const { t, locale } = useI18n();
  const { user, ready } = useAuth();
  const [rows, setRows] = useState<CommentDto[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  const query = publicToken ? `&token=${encodeURIComponent(publicToken)}` : "";

  const load = useCallback(async () => {
    try {
      const data = await api<CommentDto[]>(
        `/comments?resourceType=${resourceType}&resourceId=${resourceId}${query}`,
        { progress: false },
      );
      setRows(data);
      setLoaded(true);
    } catch {
      setLoaded(true);
      toast.error(t("comments.failed"));
    }
  }, [resourceType, resourceId, query, t]);

  useEffect(() => {
    setLoaded(false);
    setRows([]);
    void load();
  }, [load]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    setBusy(true);
    try {
      const created = await api<CommentDto>("/comments", {
        method: "POST",
        body: JSON.stringify({
          resourceType,
          resourceId,
          body: text,
          ...(publicToken ? { publicToken } : {}),
        }),
      });
      setRows((current) => [...current, created]);
      setBody("");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("comments.postFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: string) {
    try {
      await api(`/comments/${id}`, { method: "DELETE" });
      setRows((current) => current.filter((row) => row.id !== id));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("comments.deleteFailed"));
    }
  }

  return (
    <div className="mt-4 space-y-3 border-t pt-3">
      <h3 className="text-sm font-medium">{t("comments.title")}</h3>
      {!loaded ? <p className="text-sm text-muted-foreground">{t("common.loading")}</p> : null}
      {loaded && rows.length === 0 ? <p className="text-sm text-muted-foreground">{t("comments.none")}</p> : null}
      {rows.length > 0 ? (
        <ul className="max-h-60 space-y-3 overflow-y-auto pr-1">
          {rows.map((row) => (
            <li key={row.id} className="space-y-1">
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{row.author.name}</span>
                  {" · "}
                  {formatDateTime(row.createdAt, locale)}
                </p>
                {row.canDelete ? (
                  <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => void onDelete(row.id)}>
                    {t("comments.delete")}
                  </Button>
                ) : null}
              </div>
              <p className="whitespace-pre-wrap break-words text-sm">{row.body}</p>
            </li>
          ))}
        </ul>
      ) : null}
      {ready && user ? (
        <form onSubmit={(e) => void onSubmit(e)} className="space-y-2">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={2000}
            rows={3}
            placeholder={t("comments.placeholder")}
            className="flex min-h-[4.5rem] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          />
          <Button type="submit" size="sm" disabled={busy || !body.trim()}>
            {t("comments.post")}
          </Button>
        </form>
      ) : ready ? (
        <p className="text-sm text-muted-foreground">
          <Link className="text-foreground underline" href="/login">
            {t("comments.signIn")}
          </Link>
        </p>
      ) : null}
    </div>
  );
}
