"use client";

import { Check, Moon, Sun, SunMedium } from "lucide-react";
import { useTheme, type ThemePreference } from "@/lib/theme";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ThemeMenu() {
  const { theme, resolved, systemDark, setTheme } = useTheme();
  const { t } = useI18n();
  const options: { id: ThemePreference; label: string; hint: string }[] = [
    { id: "light", label: t("theme.light"), hint: t("theme.lightHint") },
    { id: "dark", label: t("theme.dark"), hint: t("theme.darkHint") },
    { id: "medium", label: t("theme.medium"), hint: t("theme.mediumHint") },
    { id: "system", label: t("theme.system"), hint: systemDark ? t("theme.systemDark") : t("theme.systemLight") },
  ];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8 text-muted-foreground" aria-label={t("theme.label")}>
          {resolved === "dark" ? <Moon className="size-4" /> : resolved === "medium" ? <SunMedium className="size-4" /> : <Sun className="size-4" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>{t("theme.label")}</DropdownMenuLabel>
        {options.map((option) => (
          <DropdownMenuItem key={option.id} onClick={() => setTheme(option.id)}>
            <span className="flex size-4 items-center justify-center">
              {theme === option.id ? <Check className="size-4" /> : null}
            </span>
            <span>
              <span className="block">{option.label}</span>
              <span className="block text-xs text-muted-foreground">{option.hint}</span>
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
