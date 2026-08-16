"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Bug } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
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
  const roomId = pathname.match(/^\/rooms\/([^/]+)/)?.[1] ?? null;

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
          className="size-8 text-amber-700"
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
