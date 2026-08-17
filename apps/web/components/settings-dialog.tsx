"use client";

import { useEffect, useState } from "react";
import { Settings } from "lucide-react";
import { toast } from "sonner";
import { useAiSummaryLocale } from "@/lib/ai-summary-locale";
import { useAuth } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import type { AiProvider, AiSettingsDto } from "@dataroom/shared";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    api<AiSettingsDto>("/me/ai-settings", { progress: false })
      .then((data) => {
        setLocale(data.locale === "uk" ? "uk" : "en", false);
        setProvider(data.provider);
        setBaseUrl(data.baseUrl ?? "");
        setModel(data.model ?? "");
        setHasKey(data.hasKey);
        setLast4(data.apiKeyLast4);
        setApiKey("");
      })
      .catch((err) => toast.error(err instanceof ApiError ? err.message : t("settings.loadFailed")));
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("settings.title")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
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
                  placeholder={provider === "GEMINI" ? "gemini-2.0-flash" : "llama-3.3-70b-versatile"}
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
