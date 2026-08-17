"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Bug } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import {
  DEV_DELAY_DEFAULT_SECONDS,
  getDevDelay,
  setDevDelay,
  subscribeDevDelay,
  type DevDelayState,
} from "@/lib/dev-delay";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Debug command menu with demo data seeders and an artificial API delay.
 * Shown for signed-in users on local and hosted preview (this take-home is not a locked-down production).
 */
export function DevCommands() {
  const { user } = useAuth();
  const { t } = useI18n();
  const pathname = usePathname();
  const [busy, setBusy] = useState(false);
  const [delay, setDelay] = useState<DevDelayState>(getDevDelay);
  const roomId = pathname.match(/^\/rooms\/([^/]+)/)?.[1] ?? null;

  useEffect(() => subscribeDevDelay(setDelay), []);

  if (!user) return null;

  const run = async (scale: "clear" | "minimal" | "medium" | "heavy") => {
    if (!roomId || busy) return;
    if (scale === "clear" && !confirm(t("dev.clearConfirm"))) return;
    setBusy(true);
    const toastId = toast.loading(scale === "clear" ? t("dev.clearing") : t("dev.filling"));
    try {
      const result = await api<{ folders: number; files: number }>(`/dev/seed`, {
        method: "POST",
        body: JSON.stringify({ dataRoomId: roomId, scale }),
      });
      toast.success(
        scale === "clear"
          ? t("dev.cleared")
          : t("dev.added", { folders: result.folders, files: result.files }),
        { id: toastId },
      );
      window.location.reload();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("dev.fillFailed"), { id: toastId });
      setBusy(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-amber-700 dark:text-amber-400"
          aria-label={t("dev.aria")}
          title={t("dev.title")}
        >
          <Bug className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>{t("dev.label")}</DropdownMenuLabel>
        <p className="px-2 pb-2 text-xs text-muted-foreground">{t("dev.hint")}</p>
        <DropdownMenuSeparator />
        <div
          className="px-2 py-1.5"
          onPointerDown={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm">{t("dev.delay")}</p>
              <p className="text-xs text-muted-foreground">
                {delay.enabled ? t("dev.delayOn", { n: delay.seconds }) : t("dev.delayOff")}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={delay.enabled}
              aria-label={t("dev.delay")}
              onClick={() => setDevDelay({ enabled: !delay.enabled })}
              className={`relative h-5 w-9 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                delay.enabled ? "bg-amber-600" : "bg-muted-foreground/30"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 block size-4 rounded-full bg-background shadow-sm transition-transform ${
                  delay.enabled ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
          </div>
          <label className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
            {t("dev.seconds", { n: DEV_DELAY_DEFAULT_SECONDS })}
            <Input
              type="number"
              min={1}
              max={30}
              step={1}
              className="h-8 w-16 text-foreground"
              value={delay.seconds}
              onChange={(event) => setDevDelay({ seconds: Number(event.target.value) })}
            />
          </label>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          {t("dev.fill")}
        </DropdownMenuLabel>
        {!roomId ? (
          <p className="px-2 py-1.5 text-xs text-muted-foreground">{t("dev.openRoom")}</p>
        ) : null}
        <DropdownMenuItem disabled={!roomId || busy} onClick={() => void run("clear")}>
          {t("dev.clear")}
        </DropdownMenuItem>
        <DropdownMenuItem disabled={!roomId || busy} onClick={() => void run("minimal")}>
          {t("dev.minimal")}
        </DropdownMenuItem>
        <DropdownMenuItem disabled={!roomId || busy} onClick={() => void run("medium")}>
          {t("dev.medium")}
        </DropdownMenuItem>
        <DropdownMenuItem disabled={!roomId || busy} onClick={() => void run("heavy")}>
          {t("dev.heavy")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
