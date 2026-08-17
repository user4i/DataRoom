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

export default function RegisterPage() {
  const { register } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await register(name, email, password);
      startNavigation();
      router.replace("/rooms");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("register.failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <GuestTools />
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <h1 className="text-2xl font-semibold">{t("register.title")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t("register.subtitle")}</p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">{t("register.name")}</Label>
          <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">{t("common.email")}</Label>
          <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">{t("register.password")}</Label>
          <Input id="password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? t("register.submitting") : t("register.submit")}
        </Button>
      </form>
      <p className="mt-4 text-sm text-muted-foreground">
        {t("register.hasAccount")}{" "}
        <Link className="text-foreground underline" href="/login">
          {t("register.logIn")}
        </Link>
      </p>
    </main>
    </>
  );
}
