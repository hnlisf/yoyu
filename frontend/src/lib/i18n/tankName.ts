import { useTranslations } from 'next-intl';

/**
 * Known keys in the `tankNames` i18n namespace.
 * Guards against non-key strings (user input) being passed to t(),
 * which would otherwise leak the namespace prefix (e.g. "tankNames.My Tank").
 */
const KNOWN_KEYS: ReadonlySet<string> = new Set([
  '我的鱼缸',
  '客厅大缸',
  '书房小缸',
  '阳台中缸',
  'My Tank',
]);

/**
 * Resolve a backend-provided tank name to the current locale.
 *
 * Strategy (Two-Step Guard):
 * 1. If the name is a known i18n key → translate it via `t()`.
 * 2. Otherwise → echo the name directly (it's a user-created custom name).
 *
 * This prevents `next-intl` from falling back to the raw key with namespace
 * prefix when the key doesn't exist in the translation JSON.
 *
 * Usage: const tName = useTranslateTankName(); ... tName(tk.name)
 */
export function useTranslateTankName() {
  const t = useTranslations('tankNames');
  return (name: string): string => {
    if (KNOWN_KEYS.has(name)) {
      try {
        return t(name as any);
      } catch {
        return name;
      }
    }
    // Custom user-entered names are displayed as-is
    return name;
  };
}
