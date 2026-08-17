"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/api";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { GuestTools } from "@/components/guest-tools";
import { useI18n } from "@/lib/i18n";

export default function HomePage() {
  const router = useRouter();
  const { t } = useI18n();
  useEffect(() => {
    if (getToken()) router.replace("/rooms");
  }, [router]);

  return (
    <>
      <GuestTools />
      <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-6 px-6">
      <div>
        <p className="text-sm font-medium text-muted-foreground">{t("brand")}</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">{t("home.title")}</h1>
        <p className="mt-3 max-w-xl text-muted-foreground">{t("home.subtitle")}</p>
      </div>
      <div className="flex gap-3">
        <Button asChild>
          <Link href="/register">{t("home.createAccount")}</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/login">{t("home.logIn")}</Link>
        </Button>
      </div>
    </main>
    </>
  );
}
