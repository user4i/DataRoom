"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import type { ResourceType, ShareDto } from "@dataroom/shared";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDateTime } from "@/lib/format";

export function ShareDialog({
  open,
  onOpenChange,
  resourceType,
  resourceId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resourceType: ResourceType;
  resourceId: string;
}) {
  const [shares, setShares] = useState<ShareDto[]>([]);
  const [email, setEmail] = useState("");
  const [copied, setCopied] = useState(false);
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const load = async () => {
    try {
      const data = await api<ShareDto[]>(`/shares?resourceType=${resourceType}&resourceId=${resourceId}`);
      setShares(data);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Не вдалося завантажити доступ");
    }
  };

  useEffect(() => {
    if (open) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, resourceType, resourceId]);

  const publicShare = shares.find((s) => s.kind === "PUBLIC_LINK");
  const people = shares.filter((s) => s.kind === "USER");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Спільний доступ</DialogTitle>
          <DialogDescription>Той, хто має доступ, може переглядати цей елемент і вкладений вміст. Отримувачі мають лише перегляд.</DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="link">
          <TabsList>
            <TabsTrigger value="link">Посилання</TabsTrigger>
            <TabsTrigger value="people">Люди</TabsTrigger>
          </TabsList>
          <TabsContent value="link" className="space-y-3">
            {publicShare?.token ? (
              <>
                <Input readOnly value={`${origin}/s/${publicShare.token}`} />
                <p className="text-xs text-muted-foreground">Надано {formatDateTime(publicShare.createdAt)}</p>
                <div className="flex gap-2">
                  <Button
                    onClick={async () => {
                      await navigator.clipboard.writeText(`${origin}/s/${publicShare.token}`);
                      setCopied(true);
                      toast.success("Посилання скопійовано");
                      setTimeout(() => setCopied(false), 1500);
                    }}
                  >
                    {copied ? "Скопійовано" : "Копіювати посилання"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={async () => {
                      if (!confirm("Скасувати це публічне посилання?")) return;
                      await api(`/shares/${publicShare.id}`, { method: "DELETE" });
                      toast.success("Посилання скасовано");
                      await load();
                    }}
                  >
                    Скасувати
                  </Button>
                </div>
              </>
            ) : (
              <Button
                onClick={async () => {
                  try {
                    await api("/shares", {
                      method: "POST",
                      body: JSON.stringify({ resourceType, resourceId, kind: "PUBLIC_LINK" }),
                    });
                    await load();
                  } catch (error) {
                    toast.error(error instanceof ApiError ? error.message : "Не вдалося створити посилання");
                  }
                }}
              >
                Створити публічне посилання
              </Button>
            )}
          </TabsContent>
          <TabsContent value="people" className="space-y-3">
            <div className="flex gap-2">
              <div className="flex-1">
                <Label htmlFor="share-email" className="sr-only">
                  Email
                </Label>
                <Input
                  id="share-email"
                  placeholder="person@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <Button
                onClick={async () => {
                  try {
                    await api("/shares", {
                      method: "POST",
                      body: JSON.stringify({ resourceType, resourceId, kind: "USER", email }),
                    });
                    setEmail("");
                    toast.success("Запрошення надіслано");
                    await load();
                  } catch (error) {
                    toast.error(error instanceof ApiError ? error.message : "Не вдалося поділитися");
                  }
                }}
              >
                Запросити
              </Button>
            </div>
            {people.length === 0 ? (
              <p className="text-sm text-muted-foreground">Поки нікого немає. Очікувані запрошення з’являться після додавання email.</p>
            ) : (
              <ul className="space-y-2">
                {people.map((share) => (
                  <li key={share.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                    <span>
                      <span className="block">{share.user?.email || share.invitedEmail}</span>
                      <span className="block text-xs text-muted-foreground">
                        Надано {formatDateTime(share.createdAt)}
                        {!share.userId ? " · очікує" : ""}
                      </span>
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        if (!confirm("Скасувати доступ цієї людини?")) return;
                        await api(`/shares/${share.id}`, { method: "DELETE" });
                        toast.success("Доступ скасовано");
                        await load();
                      }}
                    >
                      Скасувати
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>
        </Tabs>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Закрити
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
