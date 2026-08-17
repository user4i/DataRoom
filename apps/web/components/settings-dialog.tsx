"use client";

import { Settings } from "lucide-react";
import { useAiSummaryLocale } from "@/lib/ai-summary-locale";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export function SettingsDialog() {
  const { t } = useI18n();
  const { locale, setLocale } = useAiSummaryLocale();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8 text-muted-foreground" aria-label={t("settings.aria")}>
          <Settings className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("settings.title")}</DialogTitle>
        </DialogHeader>
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
      </DialogContent>
    </Dialog>
  );
}
