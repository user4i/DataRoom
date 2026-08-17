"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { ApiError } from "@/lib/api";
import { startNavigation } from "@/lib/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GuestTools } from "@/components/guest-tools";

export default function LoginPage() {
  const { login } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await login(email, password);
      startNavigation();
      router.replace("/rooms");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("login.failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <GuestTools />
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <h1 className="text-2xl font-semibold">{t("login.title")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t("login.subtitle")}</p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">{t("common.email")}</Label>
          <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">{t("common.password")}</Label>
          <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? t("login.submitting") : t("login.submit")}
        </Button>
      </form>
      <p className="mt-4 text-sm text-muted-foreground">
        {t("login.noAccount")}{" "}
        <Link className="text-foreground underline" href="/register">
          {t("login.create")}
        </Link>
      </p>
    </main>
    </>
  );
}
