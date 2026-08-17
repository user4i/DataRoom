"use client";

import { Check, Languages } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function LanguageMenu() {
  const { locale, setLocale, t } = useI18n();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8 text-muted-foreground" aria-label={t("language.label")}>
          <Languages className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>{t("language.label")}</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => setLocale("en")}>
          <span className="flex size-4 items-center justify-center">{locale === "en" ? <Check className="size-4" /> : null}</span>
          {t("language.en")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setLocale("uk")}>
          <span className="flex size-4 items-center justify-center">{locale === "uk" ? <Check className="size-4" /> : null}</span>
          {t("language.uk")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
