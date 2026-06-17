import { useTranslations } from 'next-intl';

/**
 * Resolve a backend-provided tank name to the current locale.
 * Backend seed data hard-codes Chinese names ('我的鱼缸', '客厅大缸', etc.).
 * The frontend translates them via the `tankNames` i18n map; custom
 * user-created names fall through unchanged.
 *
 * Usage: const tName = useTranslateTankName(); ... tName(tk.name)
 */
export function useTranslateTankName() {
  const t = useTranslations('tankNames');
  return (name: string): string => {
    try {
      // t.has(...) is not part of the public API; we use the resolver pattern:
      // if the key exists, return translation; otherwise echo the name.
      return t(name as any);
    } catch {
      return name;
    }
  };
}
