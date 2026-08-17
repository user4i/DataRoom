"use client";

import { useEffect, useState } from "react";
import { Settings } from "lucide-react";
import { toast } from "sonner";
import { useAiSummaryLocale } from "@/lib/ai-summary-locale";
import { useAuth } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import type { AiProvider, AiSettingsDto, StatusDefDto, TagDefDto } from "@dataroom/shared";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CatalogEditor } from "@/components/catalog-editor";

export function SettingsDialog() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { locale, setLocale } = useAiSummaryLocale();
  const [open, setOpen] = useState(false);
  const [provider, setProvider] = useState<AiProvider>("GEMINI");
  const [baseUrl, setBaseUrl] = useState("");
  const [model, setModel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [hasKey, setHasKey] = useState(false);
  const [last4, setLast4] = useState<string | null>(null);
  const [tags, setTags] = useState<TagDefDto[]>([]);
  const [statuses, setStatuses] = useState<StatusDefDto[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    api<AiSettingsDto>("/me/ai-settings", { progress: false })
      .then((data) => {
        setLocale(data.locale === "en" ? "en" : "uk", false);
        setProvider(data.provider);
        setBaseUrl(data.baseUrl ?? "");
        setModel(data.model ?? "");
        setHasKey(data.hasKey);
        setLast4(data.apiKeyLast4);
        setApiKey("");
      })
      .catch((err) => toast.error(err instanceof ApiError ? err.message : t("settings.loadFailed")));
    api<TagDefDto[]>("/me/tags", { progress: false })
      .then(setTags)
      .catch(() => undefined);
    api<StatusDefDto[]>("/me/statuses", { progress: false })
      .then(setStatuses)
      .catch(() => undefined);
  }, [open, user, setLocale, t]);

  const save = async () => {
    if (!user) return;
    setBusy(true);
    try {
      const body: Record<string, string> = {
        locale,
        provider,
        baseUrl,
        model,
      };
      if (apiKey.trim()) body.apiKey = apiKey.trim();
      const data = await api<AiSettingsDto>("/me/ai-settings", {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      setHasKey(data.hasKey);
      setLast4(data.apiKeyLast4);
      setApiKey("");
      toast.success(t("settings.saved"));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("settings.saveFailed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8 text-muted-foreground" aria-label={t("settings.aria")}>
          <Settings className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[min(90vh,44rem)] max-w-md flex-col gap-4 overflow-hidden">
        <DialogHeader>
          <DialogTitle>{t("settings.title")}</DialogTitle>
        </DialogHeader>
        <div className="min-h-0 space-y-4 overflow-y-auto pr-1">
          <div className="space-y-2">
            <Label>{t("settings.aiLanguage")}</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant={locale === "en" ? "default" : "outline"} onClick={() => setLocale("en")}>
                {t("language.en")}
              </Button>
              <Button type="button" variant={locale === "uk" ? "default" : "outline"} onClick={() => setLocale("uk")}>
                {t("language.uk")}
              </Button>
            </div>
          </div>
          {user ? (
            <>
              <div className="space-y-2">
                <Label>{t("settings.provider")}</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={provider === "GEMINI" ? "default" : "outline"}
                    onClick={() => setProvider("GEMINI")}
                  >
                    {t("settings.gemini")}
                  </Button>
                  <Button
                    type="button"
                    variant={provider === "OPENAI_COMPATIBLE" ? "default" : "outline"}
                    onClick={() => {
                      setProvider("OPENAI_COMPATIBLE");
                      setBaseUrl((current) => current || "https://api.groq.com/openai/v1");
                      setModel((current) => current || "llama-3.3-70b-versatile");
                    }}
                  >
                    {t("settings.openaiCompat")}
                  </Button>
                </div>
              </div>
              {provider === "OPENAI_COMPATIBLE" ? (
                <div className="space-y-2">
                  <Label htmlFor="ai-url">{t("settings.baseUrl")}</Label>
                  <Input
                    id="ai-url"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder="https://api.groq.com/openai/v1"
                  />
                  <p className="text-xs text-muted-foreground">{t("settings.baseUrlHint")}</p>
                </div>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor="ai-model">{t("settings.model")}</Label>
                <Input
                  id="ai-model"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder={provider === "GEMINI" ? "gemini-3.6-flash" : "llama-3.3-70b-versatile"}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ai-key">{t("settings.apiKey")}</Label>
                <Input
                  id="ai-key"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={t("settings.apiKeyPlaceholder")}
                  autoComplete="off"
                />
                {hasKey && last4 ? (
                  <p className="text-xs text-muted-foreground">{t("settings.apiKeySaved", { n: last4 })}</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label>{t("settings.tags")}</Label>
                <p className="text-xs text-muted-foreground">{t("settings.tagsHint")}</p>
                <CatalogEditor
                  items={tags}
                  onCreate={async (name) => {
                    const created = await api<TagDefDto>("/me/tags", {
                      method: "POST",
                      body: JSON.stringify({ name }),
                    });
                    setTags((current) => [...current, created]);
                    return created;
                  }}
                  onRename={async (id, name) => {
                    const updated = await api<TagDefDto>(`/me/tags/${id}`, {
                      method: "PATCH",
                      body: JSON.stringify({ name }),
                    });
                    setTags((current) => current.map((item) => (item.id === id ? updated : item)));
                    return updated;
                  }}
                  onDelete={async (id) => {
                    await api(`/me/tags/${id}`, { method: "DELETE" });
                    setTags((current) => current.filter((item) => item.id !== id));
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("settings.statuses")}</Label>
                <p className="text-xs text-muted-foreground">{t("settings.statusesHint")}</p>
                <CatalogEditor
                  items={statuses}
                  onCreate={async (name) => {
                    const created = await api<StatusDefDto>("/me/statuses", {
                      method: "POST",
                      body: JSON.stringify({ name }),
                    });
                    setStatuses((current) => [...current, created]);
                    return created;
                  }}
                  onRename={async (id, name) => {
                    const updated = await api<StatusDefDto>(`/me/statuses/${id}`, {
                      method: "PATCH",
                      body: JSON.stringify({ name }),
                    });
                    setStatuses((current) => current.map((item) => (item.id === id ? updated : item)));
                    return updated;
                  }}
                  onDelete={async (id) => {
                    await api(`/me/statuses/${id}`, { method: "DELETE" });
                    setStatuses((current) => current.filter((item) => item.id !== id));
                  }}
                />
              </div>
            </>
          ) : null}
        </div>
        {user ? (
          <DialogFooter>
            <Button type="button" onClick={save} disabled={busy}>
              {t("settings.save")}
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
