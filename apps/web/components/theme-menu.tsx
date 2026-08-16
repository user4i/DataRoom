"use client";

import { Check, Moon, Sun, SunMedium } from "lucide-react";
import { useTheme, type ThemePreference } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const OPTIONS: { id: ThemePreference; label: string; hint: string }[] = [
  { id: "light", label: "Світла тема", hint: "Світлий фон" },
  { id: "dark", label: "Темна", hint: "Темний фон" },
  { id: "medium", label: "Середня", hint: "Приглушений сірий фон" },
  { id: "system", label: "Системна", hint: "Як у системі" },
];

export function ThemeMenu() {
  const { theme, resolved, systemDark, setTheme } = useTheme();
  const systemHint = systemDark ? "Як у системі · зараз темна" : "Як у системі · зараз світла";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8 text-muted-foreground" aria-label="Тема">
          {resolved === "dark" ? <Moon className="size-4" /> : resolved === "medium" ? <SunMedium className="size-4" /> : <Sun className="size-4" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Тема</DropdownMenuLabel>
        {OPTIONS.map((option) => (
          <DropdownMenuItem key={option.id} onClick={() => setTheme(option.id)}>
            <span className="flex size-4 items-center justify-center">
              {theme === option.id ? <Check className="size-4" /> : null}
            </span>
            <span>
              <span className="block">{option.label}</span>
              <span className="block text-xs text-muted-foreground">
                {option.id === "system" ? systemHint : option.hint}
              </span>
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
