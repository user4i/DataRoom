"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
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
  const { t, locale } = useI18n();
  const [shares, setShares] = useState<ShareDto[]>([]);
  const [email, setEmail] = useState("");
  const [copied, setCopied] = useState(false);
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const load = async () => {
    try {
      const data = await api<ShareDto[]>(`/shares?resourceType=${resourceType}&resourceId=${resourceId}`);
      setShares(data);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t("share.loadFailed"));
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
          <DialogTitle>{t("share.title")}</DialogTitle>
          <DialogDescription>{t("share.description")}</DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="link">
          <TabsList>
            <TabsTrigger value="link">{t("share.link")}</TabsTrigger>
            <TabsTrigger value="people">{t("share.people")}</TabsTrigger>
          </TabsList>
          <TabsContent value="link" className="space-y-3">
            {publicShare?.token ? (
              <>
                <Input readOnly value={`${origin}/s/${publicShare.token}`} />
                <p className="text-xs text-muted-foreground">
                  {t("share.granted", { date: formatDateTime(publicShare.createdAt, locale) })}
                </p>
                <div className="flex gap-2">
                  <Button
                    onClick={async () => {
                      await navigator.clipboard.writeText(`${origin}/s/${publicShare.token}`);
                      setCopied(true);
                      toast.success(t("share.linkCopied"));
                      setTimeout(() => setCopied(false), 1500);
                    }}
                  >
                    {copied ? t("share.copied") : t("share.copyLink")}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={async () => {
                      if (!confirm(t("share.revokeLinkConfirm"))) return;
                      await api(`/shares/${publicShare.id}`, { method: "DELETE" });
                      toast.success(t("share.linkRevoked"));
                      await load();
                    }}
                  >
                    {t("share.revoke")}
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
                    toast.error(error instanceof ApiError ? error.message : t("share.createLinkFailed"));
                  }
                }}
              >
                {t("share.createPublicLink")}
              </Button>
            )}
          </TabsContent>
          <TabsContent value="people" className="space-y-3">
            <div className="flex gap-2">
              <div className="flex-1">
                <Label htmlFor="share-email" className="sr-only">
                  {t("common.email")}
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
                    toast.success(t("share.invited"));
                    await load();
                  } catch (error) {
                    toast.error(error instanceof ApiError ? error.message : t("share.shareFailed"));
                  }
                }}
              >
                {t("share.invite")}
              </Button>
            </div>
            {people.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("share.noPeople")}</p>
            ) : (
              <ul className="space-y-2">
                {people.map((share) => (
                  <li key={share.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                    <span>
                      <span className="block">{share.user?.email || share.invitedEmail}</span>
                      <span className="block text-xs text-muted-foreground">
                        {t("share.granted", { date: formatDateTime(share.createdAt, locale) })}
                        {!share.userId ? ` · ${t("share.pending")}` : ""}
                      </span>
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        if (!confirm(t("share.revokePersonConfirm"))) return;
                        await api(`/shares/${share.id}`, { method: "DELETE" });
                        toast.success(t("share.accessRevoked"));
                        await load();
                      }}
                    >
                      {t("share.revoke")}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>
        </Tabs>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
