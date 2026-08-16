"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export function AppHeader({ title }: { title?: string }) {
  const { user, logout } = useAuth();
  return (
    <header className="border-b bg-card">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <Link href="/rooms" className="font-semibold tracking-tight">
            Data Room
          </Link>
          {title ? <span className="text-sm text-muted-foreground">{title}</span> : null}
        </div>
        <div className="flex items-center gap-3">
          {user ? <span className="hidden text-sm text-muted-foreground sm:inline">{user.email}</span> : null}
          {user ? (
            <Button variant="outline" size="sm" onClick={logout}>
              Log out
            </Button>
          ) : (
            <Button asChild size="sm">
              <Link href="/login">Sign in</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
