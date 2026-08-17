import { currentLocale } from './locale';
import { apiMessages, type ApiMsg } from './messages';

export function t(key: ApiMsg): string {
  const locale = currentLocale();
  return apiMessages[locale][key] ?? apiMessages.en[key];
}
