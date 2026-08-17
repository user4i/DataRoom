"use client";

import type { AnalysisPublicStatus } from "@dataroom/shared";
import { useI18n } from "@/lib/i18n";

export function AnalysisStatusBadge({ status }: { status?: AnalysisPublicStatus }) {
  const { t } = useI18n();
  if (!status || status === "no") return null;
  const label =
    status === "in_process" ? t("ai.inProcess") : status === "done" ? t("ai.done") : t("ai.failedStatus");
  const color =
    status === "in_process" ? "bg-amber-500" : status === "done" ? "bg-emerald-600" : "bg-destructive";
  return (
    <span className="inline-flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground" title={label}>
      <span className={`size-1.5 rounded-full ${color} ${status === "in_process" ? "animate-pulse" : ""}`} />
      <span className="hidden sm:inline">{label}</span>
    </span>
  );
}
