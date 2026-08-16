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
  { id: "minimal", label: "Minimal", hint: "Tight rows for long file lists" },
  { id: "compact", label: "Compact", hint: "Icons; search and upload on demand" },
  { id: "wide", label: "Wide", hint: "Full toolbar and dropzone" },
];

export function DensityMenu() {
  const { density, setDensity } = useDensity();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8 text-muted-foreground" aria-label="Layout density">
          <LayoutTemplate className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Layout</DropdownMenuLabel>
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
