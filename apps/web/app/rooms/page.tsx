"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AuthGate } from "@/components/auth-gate";
import { AppHeader } from "@/components/app-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { api, ApiError } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { startNavigation } from "@/lib/progress";
import type { DataRoomDto } from "@dataroom/shared";

export default function RoomsPage() {
  return (
    <AuthGate>
      <RoomsInner />
    </AuthGate>
  );
}

function RoomsInner() {
  const router = useRouter();
  const { t } = useI18n();
  const [owned, setOwned] = useState<DataRoomDto[] | null>(null);
  const [shared, setShared] = useState<DataRoomDto[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [rename, setRename] = useState<DataRoomDto | null>(null);

  const load = async () => {
    const data = await api<{ owned: DataRoomDto[]; shared: DataRoomDto[] }>("/data-rooms");
    setOwned(data.owned);
    setShared(data.shared);
  };

  useEffect(() => {
    load().catch((err) => toast.error(err instanceof ApiError ? err.message : t("rooms.loadFailed")));
  }, [t]);

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-6xl space-y-8 px-4 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">{t("rooms.title")}</h1>
          <Button onClick={() => setOpen(true)}>{t("rooms.new")}</Button>
        </div>
        {!owned ? (
          <Skeleton className="h-40 w-full" />
        ) : owned.length === 0 ? (
          <EmptyState
            title={t("rooms.emptyTitle")}
            description={t("rooms.emptyDescription")}
            action={<Button onClick={() => setOpen(true)}>{t("rooms.createFirst")}</Button>}
          />
        ) : (
          <RoomGrid
            rooms={owned}
            canEdit
            onOpen={(id) => {
              startNavigation();
              router.push(`/rooms/${id}`);
            }}
            onRename={setRename}
            onDelete={async (room) => {
              if (!confirm(t("rooms.deleteConfirm", { name: room.name }))) return;
              try {
                await api(`/data-rooms/${room.id}`, { method: "DELETE" });
                toast.success(t("rooms.deleted"));
                await load();
              } catch (err) {
                toast.error(err instanceof ApiError ? err.message : t("rooms.deleteFailed"));
              }
            }}
          />
        )}
        <section>
          <h2 className="mb-3 text-lg font-medium">{t("rooms.sharedWithMe")}</h2>
          {shared.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("rooms.sharedEmpty")}</p>
          ) : (
            <RoomGrid
              rooms={shared}
              canEdit={false}
              onOpen={(id) => {
                startNavigation();
                router.push(`/rooms/${id}`);
              }}
            />
          )}
        </section>
      </main>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("rooms.new")}</DialogTitle>
          </DialogHeader>
          <Label htmlFor="room-name">{t("common.name")}</Label>
          <Input id="room-name" value={name} onChange={(e) => setName(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={async () => {
                try {
                  const room = await api<DataRoomDto>("/data-rooms", { method: "POST", body: JSON.stringify({ name }) });
                  setName("");
                  setOpen(false);
                  startNavigation();
                  router.push(`/rooms/${room.id}`);
                } catch (err) {
                  toast.error(err instanceof ApiError ? err.message : t("rooms.createFailed"));
                }
              }}
            >
              {t("common.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(rename)} onOpenChange={(v) => !v && setRename(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("rooms.renameTitle")}</DialogTitle>
          </DialogHeader>
          <Input value={rename?.name ?? ""} onChange={(e) => setRename((r) => (r ? { ...r, name: e.target.value } : r))} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRename(null)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={async () => {
                if (!rename) return;
                try {
                  await api(`/data-rooms/${rename.id}`, { method: "PATCH", body: JSON.stringify({ name: rename.name }) });
                  setRename(null);
                  await load();
                } catch (err) {
                  toast.error(err instanceof ApiError ? err.message : t("rooms.renameFailed"));
                }
              }}
            >
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RoomGrid({
  rooms,
  canEdit,
  onOpen,
  onRename,
  onDelete,
}: {
  rooms: DataRoomDto[];
  canEdit: boolean;
  onOpen: (id: string) => void;
  onRename?: (room: DataRoomDto) => void;
  onDelete?: (room: DataRoomDto) => void;
}) {
  const { t } = useI18n();
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {rooms.map((room) => (
        <li key={room.id} className="rounded-xl border bg-card p-4">
          <button type="button" className="w-full text-left" onClick={() => onOpen(room.id)}>
            <p className="font-medium">{room.name}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {room.access === "OWNER"
                ? t("rooms.yours")
                : t("rooms.sharedBy", { name: room.owner?.name ?? t("rooms.sharedByOwner") })}
            </p>
          </button>
          {canEdit ? (
            <div className="mt-3 flex gap-2">
              <Button size="sm" variant="outline" onClick={() => onRename?.(room)}>
                {t("common.rename")}
              </Button>
              <Button size="sm" variant="outline" onClick={() => onDelete?.(room)}>
                {t("common.delete")}
              </Button>
            </div>
          ) : (
            <Button asChild size="sm" variant="outline" className="mt-3">
              <Link href={`/rooms/${room.id}`}>{t("common.open")}</Link>
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
}
