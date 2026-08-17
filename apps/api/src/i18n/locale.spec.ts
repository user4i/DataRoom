import { currentLocale, localeFromHeader, runWithLocale } from './locale';

describe('localeFromHeader', () => {
  it('defaults to English', () => {
    expect(localeFromHeader()).toBe('en');
    expect(localeFromHeader('en-US,en;q=0.9')).toBe('en');
  });

  it('detects Ukrainian', () => {
    expect(localeFromHeader('uk')).toBe('uk');
    expect(localeFromHeader('uk-UA')).toBe('uk');
    expect(localeFromHeader('ua')).toBe('uk');
  });

  it('reads the locale from async local storage', () => {
    expect(currentLocale()).toBe('en');
    runWithLocale('uk', () => {
      expect(currentLocale()).toBe('uk');
    });
  });
});
