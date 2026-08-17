import { AsyncLocalStorage } from 'async_hooks';

export type Locale = 'en' | 'uk';

const localeAls = new AsyncLocalStorage<Locale>();

export function currentLocale(): Locale {
  return localeAls.getStore() ?? 'en';
}

export function localeFromHeader(header?: string | string[]): Locale {
  const raw = Array.isArray(header) ? header[0] : header;
  if (!raw) return 'en';
  const tag = raw.toLowerCase().split(',')[0]?.trim() ?? '';
  if (tag.startsWith('uk') || tag.startsWith('ua')) return 'uk';
  return 'en';
}

export function runWithLocale(locale: Locale, next: () => void) {
  localeAls.run(locale, next);
}
