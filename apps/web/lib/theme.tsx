"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type ThemePreference = "light" | "dark" | "medium" | "system";
export type ResolvedTheme = "light" | "dark" | "medium";

const STORAGE_KEY = "dataroom-theme";

const ThemeContext = createContext<{
  theme: ThemePreference;
  resolved: ResolvedTheme;
  systemDark: boolean;
  setTheme: (value: ThemePreference) => void;
}>({
  theme: "system",
  resolved: "light",
  systemDark: false,
  setTheme: () => undefined,
});

function isPreference(value: string | null): value is ThemePreference {
  return value === "light" || value === "dark" || value === "medium" || value === "system";
}

export function resolveTheme(preference: ThemePreference): ResolvedTheme {
  if (preference === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return preference;
}

export function applyResolvedTheme(resolved: ResolvedTheme) {
  const root = document.documentElement;
  root.dataset.theme = resolved;
  root.style.colorScheme = resolved === "dark" ? "dark" : "light";
  root.classList.toggle("dark", resolved === "dark");
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemePreference>("system");
  const [resolved, setResolved] = useState<ResolvedTheme>("light");
  const [systemDark, setSystemDark] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    setThemeState(isPreference(stored) ? stored : "system");
    setReady(true);
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const syncSystem = () => setSystemDark(media.matches);
    syncSystem();
    media.addEventListener("change", syncSystem);
    return () => media.removeEventListener("change", syncSystem);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const apply = () => {
      const next = resolveTheme(theme);
      setResolved(next);
      applyResolvedTheme(next);
    };
    apply();
    if (theme !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme, ready]);

  const setTheme = (value: ThemePreference) => {
    setThemeState(value);
    window.localStorage.setItem(STORAGE_KEY, value);
  };

  return <ThemeContext.Provider value={{ theme, resolved, systemDark, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
