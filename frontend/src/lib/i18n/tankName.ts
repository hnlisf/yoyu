import { useTranslations } from 'next-intl';
import { parseLocalized } from './parseLocalized';

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
 * P4 PR 22 改进：调用 parseLocalized 单一来源（消除内联 fallback 三元）
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
    // P4 PR 22：用 parseLocalized helper 替代内联 fallback
    return parseLocalized(name, typeof window !== 'undefined' ? (document.documentElement.lang || 'zh') : 'zh', name);
  };
}
