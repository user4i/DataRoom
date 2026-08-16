"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/api";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeMenu } from "@/components/theme-menu";

export default function HomePage() {
  const router = useRouter();
  useEffect(() => {
    if (getToken()) router.replace("/rooms");
  }, [router]);

  return (
    <>
      <div className="fixed right-3 top-3 z-50">
        <ThemeMenu />
      </div>
      <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-6 px-6">
      <div>
        <p className="text-sm font-medium text-muted-foreground">GS1 Data Room</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">Віртуальна кімната даних для PDF</h1>
        <p className="mt-3 max-w-xl text-muted-foreground">
          Створюйте кімнати, вкладені папки, завантажуйте PDF і діліться посиланням лише для перегляду або запрошуйте людей за email.
        </p>
      </div>
      <div className="flex gap-3">
        <Button asChild>
          <Link href="/register">Створити обліковий запис</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/login">Увійти</Link>
        </Button>
      </div>
    </main>
    </>
  );
}
