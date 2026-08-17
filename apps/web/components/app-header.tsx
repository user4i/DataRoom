"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { useDensityFlags } from "@/lib/density";
import { Button } from "@/components/ui/button";
import { DensityMenu } from "@/components/density-menu";
import { DevCommands } from "@/components/dev-commands";
import { LanguageMenu } from "@/components/language-menu";
import { SettingsDialog } from "@/components/settings-dialog";
import { ThemeMenu } from "@/components/theme-menu";

export function AppHeader({ title }: { title?: string }) {
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const { minimal } = useDensityFlags();
  return (
    <header className="border-b bg-card">
      <div className={`mx-auto flex max-w-6xl items-center justify-between px-4 ${minimal ? "h-11" : "h-14"}`}>
        <div className="flex items-center gap-3">
          <Link href="/rooms" className="font-semibold tracking-tight">
            {t("header.product")}
          </Link>
          {title ? <span className="text-sm text-muted-foreground">{title}</span> : null}
        </div>
        <div className="flex items-center gap-2">
          <DevCommands />
          <LanguageMenu />
          <ThemeMenu />
          <DensityMenu />
          <SettingsDialog />
          {user ? <span className="hidden text-sm text-muted-foreground sm:inline">{user.email}</span> : null}
          {user ? (
            <Button variant="outline" size="sm" onClick={logout}>
              {t("header.logout")}
            </Button>
          ) : (
            <Button asChild size="sm" variant="outline">
              <Link href="/login">{t("header.login")}</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
