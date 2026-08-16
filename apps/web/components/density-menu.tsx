"use client";

import { Check, LayoutTemplate } from "lucide-react";
import { useDensity, type Density } from "@/lib/density";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const OPTIONS: { id: Density; label: string; hint: string }[] = [
  { id: "minimal", label: "Мінімальний", hint: "Щільні рядки для довгих списків файлів" },
  { id: "compact", label: "Компактний", hint: "Іконки; пошук і завантаження за потреби" },
  { id: "wide", label: "Широкий", hint: "Повна панель і зона завантаження" },
];

export function DensityMenu() {
  const { density, setDensity } = useDensity();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8 text-muted-foreground" aria-label="Щільність макета">
          <LayoutTemplate className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Макет</DropdownMenuLabel>
        {OPTIONS.map((option) => (
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
