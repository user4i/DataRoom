"use client";

import { Check, LayoutTemplate } from "lucide-react";
import { useDensity, type Density } from "@/lib/density";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function DensityMenu() {
  const { density, setDensity } = useDensity();
  const { t } = useI18n();
  const options: { id: Density; label: string; hint: string }[] = [
    { id: "minimal", label: t("density.minimal"), hint: t("density.minimalHint") },
    { id: "compact", label: t("density.compact"), hint: t("density.compactHint") },
    { id: "wide", label: t("density.wide"), hint: t("density.wideHint") },
  ];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8 text-muted-foreground" aria-label={t("density.aria")}>
          <LayoutTemplate className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>{t("density.label")}</DropdownMenuLabel>
        {options.map((option) => (
          <DropdownMenuItem key={option.id} onClick={() => setDensity(option.id)}>
            <span className="flex size-4 items-center justify-center">
              {density === option.id ? <Check className="size-4" /> : null}
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
