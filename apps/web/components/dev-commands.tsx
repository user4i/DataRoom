"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Bug } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
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
 * Debug command menu with demo data seeders.
 * Visible only in development (`next dev`). Production builds omit this component.
 */
export function DevCommands() {
  const { user } = useAuth();
  const pathname = usePathname();
  const [busy, setBusy] = useState(false);
  const [delay, setDelay] = useState<DevDelayState>(getDevDelay);
  const roomId = pathname.match(/^\/rooms\/([^/]+)/)?.[1] ?? null;

  useEffect(() => subscribeDevDelay(setDelay), []);

  if (process.env.NODE_ENV !== "development" || !user) return null;

  const run = async (scale: "clear" | "minimal" | "medium" | "heavy") => {
    if (!roomId || busy) return;
    if (scale === "clear" && !confirm("Видалити всі папки і файли в цій data room?")) return;
    setBusy(true);
    const toastId = toast.loading(scale === "clear" ? "Очищення…" : "Наповнення демо-даними…");
    try {
      const result = await api<{ folders: number; files: number }>(`/dev/seed`, {
        method: "POST",
        body: JSON.stringify({ dataRoomId: roomId, scale }),
      });
      toast.success(
        scale === "clear"
          ? "Кімнату очищено"
          : `Додано ${result.folders} папок і ${result.files} файлів`,
        { id: toastId },
      );
      window.location.reload();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Не вдалося наповнити", { id: toastId });
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
          aria-label="Команди розробки"
          title="Команди розробки (лише development)"
        >
          <Bug className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>Команди розробки</DropdownMenuLabel>
        <p className="px-2 pb-2 text-xs text-muted-foreground">
          Видно лише в режимі розробки. У production-збірці цього меню немає.
        </p>
        <DropdownMenuSeparator />
        <div
          className="px-2 py-1.5"
          onPointerDown={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm">Штучна затримка</p>
              <p className="text-xs text-muted-foreground">
                {delay.enabled ? `Увімкнено · ${delay.seconds} с` : "Вимкнено"}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={delay.enabled}
              aria-label="Штучна затримка"
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
            Секунд (за замовчуванням {DEV_DELAY_DEFAULT_SECONDS} с)
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
          Наповнити файлами і папками
        </DropdownMenuLabel>
        {!roomId ? (
          <p className="px-2 py-1.5 text-xs text-muted-foreground">Відкрийте data room, щоб виконати команду.</p>
        ) : null}
        <DropdownMenuItem disabled={!roomId || busy} onClick={() => void run("clear")}>
          Очистити
        </DropdownMenuItem>
        <DropdownMenuItem disabled={!roomId || busy} onClick={() => void run("minimal")}>
          Мінімально
        </DropdownMenuItem>
        <DropdownMenuItem disabled={!roomId || busy} onClick={() => void run("medium")}>
          Середнє
        </DropdownMenuItem>
        <DropdownMenuItem disabled={!roomId || busy} onClick={() => void run("heavy")}>
          Дуже
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
