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
    load().catch((err) => toast.error(err instanceof ApiError ? err.message : "Could not load rooms"));
  }, []);

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-6xl space-y-8 px-4 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Data rooms</h1>
          <Button onClick={() => setOpen(true)}>New data room</Button>
        </div>
        {!owned ? (
          <Skeleton className="h-40 w-full" />
        ) : owned.length === 0 ? (
          <EmptyState
            title="No data rooms yet"
            description="Create a room to start adding folders and PDFs."
            action={<Button onClick={() => setOpen(true)}>Create your first room</Button>}
          />
        ) : (
          <RoomGrid
            rooms={owned}
            canEdit
            onOpen={(id) => router.push(`/rooms/${id}`)}
            onRename={setRename}
            onDelete={async (room) => {
              if (!confirm(`Delete data room “${room.name}”? All folders and files inside will be removed.`)) return;
              try {
                await api(`/data-rooms/${room.id}`, { method: "DELETE" });
                toast.success("Data room deleted");
                await load();
              } catch (err) {
                toast.error(err instanceof ApiError ? err.message : "Could not delete");
              }
            }}
          />
        )}
        <section>
          <h2 className="mb-3 text-lg font-medium">Shared with me</h2>
          {shared.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing has been shared with this account yet.</p>
          ) : (
            <RoomGrid rooms={shared} canEdit={false} onOpen={(id) => router.push(`/rooms/${id}`)} />
          )}
        </section>
      </main>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New data room</DialogTitle>
          </DialogHeader>
          <Label htmlFor="room-name">Name</Label>
          <Input id="room-name" value={name} onChange={(e) => setName(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                try {
                  const room = await api<DataRoomDto>("/data-rooms", { method: "POST", body: JSON.stringify({ name }) });
                  setName("");
                  setOpen(false);
                  router.push(`/rooms/${room.id}`);
                } catch (err) {
                  toast.error(err instanceof ApiError ? err.message : "Could not create room");
                }
              }}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(rename)} onOpenChange={(v) => !v && setRename(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename data room</DialogTitle>
          </DialogHeader>
          <Input value={rename?.name ?? ""} onChange={(e) => setRename((r) => (r ? { ...r, name: e.target.value } : r))} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRename(null)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!rename) return;
                try {
                  await api(`/data-rooms/${rename.id}`, { method: "PATCH", body: JSON.stringify({ name: rename.name }) });
                  setRename(null);
                  await load();
                } catch (err) {
                  toast.error(err instanceof ApiError ? err.message : "Could not rename");
                }
              }}
            >
              Save
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
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {rooms.map((room) => (
        <li key={room.id} className="rounded-xl border bg-card p-4">
          <button type="button" className="w-full text-left" onClick={() => onOpen(room.id)}>
            <p className="font-medium">{room.name}</p>
            <p className="mt-1 text-xs text-muted-foreground">{room.access === "OWNER" ? "Owned by you" : `Shared by ${room.owner?.name ?? "owner"}`}</p>
          </button>
          {canEdit ? (
            <div className="mt-3 flex gap-2">
              <Button size="sm" variant="outline" onClick={() => onRename?.(room)}>
                Rename
              </Button>
              <Button size="sm" variant="outline" onClick={() => onDelete?.(room)}>
                Delete
              </Button>
            </div>
          ) : (
            <Button asChild size="sm" variant="outline" className="mt-3">
              <Link href={`/rooms/${room.id}`}>Open</Link>
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
}
