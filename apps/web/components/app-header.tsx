"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { useDensityFlags } from "@/lib/density";
import { Button } from "@/components/ui/button";
import { DensityMenu } from "@/components/density-menu";
import { DevCommands } from "@/components/dev-commands";

export function AppHeader({ title }: { title?: string }) {
  const { user, logout } = useAuth();
  const { minimal } = useDensityFlags();
  return (
    <header className="border-b bg-card">
      <div className={`mx-auto flex max-w-6xl items-center justify-between px-4 ${minimal ? "h-11" : "h-14"}`}>
        <div className="flex items-center gap-3">
          <Link href="/rooms" className="font-semibold tracking-tight">
            Кімната даних
          </Link>
          {title ? <span className="text-sm text-muted-foreground">{title}</span> : null}
        </div>
        <div className="flex items-center gap-2">
          <DevCommands />
          <DensityMenu />
          {user ? <span className="hidden text-sm text-muted-foreground sm:inline">{user.email}</span> : null}
          {user ? (
            <Button variant="outline" size="sm" onClick={logout}>
              Вийти
            </Button>
          ) : (
            <Button asChild size="sm" variant="outline" className="bg-white">
              <Link href="/login">Увійти</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
