'use client';

import { useTranslations } from 'next-intl';
import { Link, useRouter, usePathname, routing } from '@/i18n/routing';
import { useLocale } from './LocaleProvider';

/**
 * Glass top header with locale switcher.
 * - Default locale (zh) keeps no URL prefix (/tanks, /species, ...).
 * - Other locales (/en/tanks, /ja/tanks) use the next-intl URL prefix router.
 */
export default function Header() {
  const t = useTranslations();
  const { locale, setLocale } = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const handleLocaleChange = (newLocale: 'zh' | 'en' | 'ja') => {
    if (newLocale === locale) return;
    setLocale(newLocale);
    router.replace(pathname, { locale: newLocale });
  };

  return (
    <header className="sticky top-0 z-30 backdrop-blur-xl bg-deep/80 border-b border-glass-border">
      <div className="mx-auto max-w-5xl flex items-center justify-between px-4 py-3">
        <Link href="/tanks" className="flex items-center gap-2 group">
          <span className="text-2xl" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#7dd3fc" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 12c2-3 5-5 8-5s6 2 8 5c-2 3-5 5-8 5s-6-2-8-5z" />
              <circle cx="14" cy="11" r="1" fill="#7dd3fc" stroke="none" />
              <path d="M22 12l-2-2M22 12l-2 2" />
            </svg>
          </span>
          <span className="text-lg font-light text-text-primary group-hover:text-accent transition">
            {t('appName')}
          </span>
        </Link>
        <nav className="flex items-center gap-1">
          <Link className="px-3 py-1.5 rounded-full text-text-secondary hover:text-accent text-sm font-light transition" href="/tanks">{t('nav.tank')}</Link>
          <Link className="px-3 py-1.5 rounded-full text-text-secondary hover:text-accent text-sm font-light transition" href="/species">{t('nav.species')}</Link>
          <Link className="px-3 py-1.5 rounded-full text-text-secondary hover:text-accent text-sm font-light transition" href="/stats">{t('nav.stats')}</Link>
          <Link className="px-3 py-1.5 rounded-full text-text-secondary hover:text-accent text-sm font-light transition" href="/profile">{t('nav.profile')}</Link>
          <div className="ml-2 flex items-center">
            <select
              value={locale}
              onChange={(e) => handleLocaleChange(e.target.value as 'zh' | 'en' | 'ja')}
              aria-label="Language"
              className="text-xs border border-glass-border rounded-full bg-glass text-text-secondary px-2.5 py-1.5 cursor-pointer hover:border-glass-border-accent focus:outline-none"
            >
              {routing.locales.map((l) => (
                <option key={l} value={l}>
                  {l === 'zh' ? '中文' : l === 'en' ? 'English' : '日本語'}
                </option>
              ))}
            </select>
          </div>
        </nav>
      </div>
    </header>
  );
}
