"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { dictionaries, LOCALE_STORAGE_KEY, type Locale, en } from "./messages";

type Vars = Record<string, string | number>;
type PluralKey = keyof typeof en.plural;

function interpolate(template: string, vars?: Vars) {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? ""));
}

function lookup(dict: typeof en, path: string): string {
  const parts = path.split(".");
  let node: unknown = dict;
  for (const part of parts) {
    if (!node || typeof node !== "object" || !(part in node)) return path;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === "string" ? node : path;
}

function pickPlural(locale: Locale, n: number, forms: { one: string; few: string; other: string }) {
  if (locale === "uk") {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return forms.one;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms.few;
    return forms.other;
  }
  return n === 1 ? forms.one : forms.other;
}

const LocaleContext = createContext<{
  locale: Locale;
  setLocale: (value: Locale) => void;
  t: (path: string, vars?: Vars) => string;
  p: (key: PluralKey, n: number) => string;
}>({
  locale: "en",
  setLocale: () => undefined,
  t: (path) => path,
  p: (_key, n) => String(n),
});

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    setLocaleState(stored === "uk" ? "uk" : "en");
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = (value: Locale) => {
    setLocaleState(value);
    window.localStorage.setItem(LOCALE_STORAGE_KEY, value);
    document.documentElement.lang = value;
  };

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t: (path: string, vars?: Vars) => interpolate(lookup(dictionaries[locale], path), vars),
      p: (key: PluralKey, n: number) => interpolate(pickPlural(locale, n, dictionaries[locale].plural[key]), { n }),
    }),
    [locale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useI18n() {
  return useContext(LocaleContext);
}

export function formatDateTime(iso: string | undefined, locale: Locale = "en") {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(locale === "uk" ? "uk-UA" : "en-US", { dateStyle: "medium", timeStyle: "short" });
}
