"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api, getToken, setToken } from "@/lib/api";
import type { AuthUser } from "@dataroom/shared";

type AuthState = {
  user: AuthUser | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setReady(true);
      return;
    }
    api<AuthUser>("/auth/me")
      .then(setUser)
      .catch(() => setToken(null))
      .finally(() => setReady(true));
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      ready,
      async login(email, password) {
        const res = await api<{ accessToken: string; user: AuthUser }>("/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password }),
          token: null,
        });
        setToken(res.accessToken);
        setUser(res.user);
      },
      async register(name, email, password) {
        const res = await api<{ accessToken: string; user: AuthUser }>("/auth/register", {
          method: "POST",
          body: JSON.stringify({ name, email, password }),
          token: null,
        });
        setToken(res.accessToken);
        setUser(res.user);
      },
      logout() {
        setToken(null);
        setUser(null);
      },
    }),
    [user, ready],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
