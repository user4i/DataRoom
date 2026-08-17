"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { Locale } from "./messages";

const STORAGE_KEY = "dataroom-ai-summary-locale";

const AiSummaryLocaleContext = createContext<{
  locale: Locale;
  setLocale: (value: Locale) => void;
}>({
  locale: "en",
  setLocale: () => undefined,
});

export function AiSummaryLocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    setLocaleState(stored === "uk" ? "uk" : "en");
  }, []);

  const setLocale = (value: Locale) => {
    setLocaleState(value);
    window.localStorage.setItem(STORAGE_KEY, value);
  };

  return <AiSummaryLocaleContext.Provider value={{ locale, setLocale }}>{children}</AiSummaryLocaleContext.Provider>;
}

export function useAiSummaryLocale() {
  return useContext(AiSummaryLocaleContext);
}
