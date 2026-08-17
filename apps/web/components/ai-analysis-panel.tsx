"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { AnalysisDto, AnalysisKind, ResourceType } from "@dataroom/shared";
import { api, ApiError } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

export function AiAnalysisPanel({
  resourceType,
  resourceId,
  canEdit,
  kinds,
  autoRunIfEmpty,
  onQueued,
}: {
  resourceType: ResourceType;
  resourceId: string;
  canEdit: boolean;
  kinds: AnalysisKind[];
  autoRunIfEmpty?: boolean;
  onQueued?: () => void;
}) {
  const { t } = useI18n();
  const kind = kinds[0];
  const [rows, setRows] = useState<AnalysisDto[]>([]);
  const [ready, setReady] = useState(false);
  const [listed, setListed] = useState(false);
  const [busy, setBusy] = useState(false);
  const autoStarted = useRef<string | null>(null);
  const onQueuedRef = useRef(onQueued);
  onQueuedRef.current = onQueued;

  const run = useCallback(async () => {
    setBusy(true);
    try {
      await api("/ai/analyze", {
        method: "POST",
        body: JSON.stringify({ resourceType, resourceId, kind }),
      });
      toast.success(t("ai.queued"));
      onQueuedRef.current?.();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("ai.failed"));
    } finally {
      setBusy(false);
    }
  }, [resourceType, resourceId, kind, t]);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    setListed(false);
    const load = async () => {
      try {
        const data = await api<AnalysisDto[]>(`/ai/${resourceType}/${resourceId}`, { progress: false });
        if (cancelled) return;
        setRows(data);
        setListed(true);
        setReady(true);
      } catch {
        if (!cancelled) setReady(true);
      }
    };
    load().catch(() => undefined);
    const timer = setInterval(() => load().catch(() => undefined), 2500);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [resourceType, resourceId]);

  useEffect(() => {
    if (!ready || !listed || !autoRunIfEmpty || !canEdit) return;
    const key = `${resourceType}:${resourceId}:${kind}`;
    const empty = !rows.some((row) => row.kind === kind);
    if (!empty || autoStarted.current === key) return;
    autoStarted.current = key;
    void run();
  }, [ready, listed, autoRunIfEmpty, canEdit, rows, resourceType, resourceId, kind, run]);

  const statusLabel = (status: AnalysisDto["status"]) => {
    if (status === "in_process") return t("ai.inProcess");
    if (status === "done") return t("ai.done");
    if (status === "failed") return t("ai.failedStatus");
    return t("ai.none");
  };

  return (
    <div className="mt-4 space-y-3 border-t pt-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium">{t("ai.title")}</h3>
        {canEdit ? (
          <Button size="sm" variant="outline" onClick={() => void run()} disabled={busy}>
            {t("ai.analyze")}
          </Button>
        ) : null}
      </div>
      {rows.length === 0 && !busy ? <p className="text-sm text-muted-foreground">{t("ai.none")}</p> : null}
      {rows.map((row) => (
        <div key={row.id} className="space-y-2">
          <p className="text-xs text-muted-foreground">
            {t(`ai.kind.${row.kind}`)} · {statusLabel(row.status)}
          </p>
          {row.error ? <p className="text-sm text-destructive">{row.error}</p> : null}
          {row.html && row.status === "done" ? (
            <div className="ai-html text-sm" dangerouslySetInnerHTML={{ __html: row.html }} />
          ) : null}
        </div>
      ))}
    </div>
  );
}
