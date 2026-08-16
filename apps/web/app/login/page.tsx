"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { startNavigation } from "@/lib/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeMenu } from "@/components/theme-menu";

export default function LoginPage() {
  const { login } = useAuth();
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
      toast.error(err instanceof ApiError ? err.message : "Не вдалося увійти");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="fixed right-3 top-3 z-50">
        <ThemeMenu />
      </div>
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <h1 className="text-2xl font-semibold">Вхід</h1>
      <p className="mt-1 text-sm text-muted-foreground">Увійдіть у свій обліковий запис кімнати даних.</p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Пароль</Label>
          <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "Вхід…" : "Увійти"}
        </Button>
      </form>
      <p className="mt-4 text-sm text-muted-foreground">
        Немає облікового запису?{" "}
        <Link className="text-foreground underline" href="/register">
          Створити
        </Link>
      </p>
    </main>
    </>
  );
}
