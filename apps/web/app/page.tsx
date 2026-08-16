"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/api";
import { HealthBadge } from "@/components/health-badge";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  const router = useRouter();
  useEffect(() => {
    if (getToken()) router.replace("/rooms");
  }, [router]);

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-6 px-6">
      <div>
        <p className="text-sm font-medium text-muted-foreground">GS1 Data Room</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">A virtual data room for PDFs</h1>
        <p className="mt-3 max-w-xl text-muted-foreground">
          Create rooms, nest folders, upload PDFs, and share a read-only link or invite people by email.
        </p>
      </div>
      <div className="flex gap-3">
        <Button asChild>
          <Link href="/register">Create account</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/login">Sign in</Link>
        </Button>
      </div>
      <HealthBadge />
    </main>
  );
}
