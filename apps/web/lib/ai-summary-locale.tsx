"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Locale } from "./messages";
import type { AiSettingsDto } from "@dataroom/shared";

const STORAGE_KEY = "dataroom-ai-summary-locale";

const AiSummaryLocaleContext = createContext<{
  locale: Locale;
  setLocale: (value: Locale, persist?: boolean) => void;
}>({
  locale: "uk",
  setLocale: () => undefined,
});

export function AiSummaryLocaleProvider({ children }: { children: React.ReactNode }) {
  const { user, ready } = useAuth();
  const [locale, setLocaleState] = useState<Locale>("uk");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    setLocaleState(stored === "en" ? "en" : "uk");
  }, []);

  useEffect(() => {
    if (!ready || !user) return;
    api<AiSettingsDto>("/me/ai-settings", { progress: false })
      .then((data) => {
        const next = data.locale === "en" ? "en" : "uk";
        setLocaleState(next);
        window.localStorage.setItem(STORAGE_KEY, next);
      })
      .catch(() => undefined);
  }, [ready, user]);

  const setLocale = useCallback(
    (value: Locale, persist = true) => {
      setLocaleState(value);
      window.localStorage.setItem(STORAGE_KEY, value);
      if (persist && user) {
        api("/me/ai-settings", {
          method: "PATCH",
          body: JSON.stringify({ locale: value }),
          progress: false,
        }).catch(() => undefined);
      }
    },
    [user],
  );

  return <AiSummaryLocaleContext.Provider value={{ locale, setLocale }}>{children}</AiSummaryLocaleContext.Provider>;
}

export function useAiSummaryLocale() {
  return useContext(AiSummaryLocaleContext);
}
