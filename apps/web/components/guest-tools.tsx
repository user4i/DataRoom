"use client";

import { LanguageMenu } from "@/components/language-menu";
import { ThemeMenu } from "@/components/theme-menu";

export function GuestTools() {
  return (
    <div className="fixed right-3 top-3 z-50 flex items-center gap-1">
      <LanguageMenu />
      <ThemeMenu />
    </div>
  );
}
