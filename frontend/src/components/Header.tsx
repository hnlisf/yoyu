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
      <div className="mx-auto max-w-5xl flex items-center justify-between gap-2 px-3 py-2.5">
        <Link href="/tanks" className="flex items-center gap-2 group shrink-0">
          <span className="text-2xl" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#7dd3fc" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 12c2-3 5-5 8-5s6 2 8 5c-2 3-5 5-8 5s-6-2-8-5z" />
              <circle cx="14" cy="11" r="1" fill="#7dd3fc" stroke="none" />
              <path d="M22 12l-2-2M22 12l-2 2" />
            </svg>
          </span>
          <span className="text-base font-light text-text-primary group-hover:text-accent transition whitespace-nowrap">
            {t('appName')}
          </span>
        </Link>
        <nav className="flex items-center gap-0.5 flex-1 justify-end min-w-0">
          <Link className="px-1.5 py-1 rounded-full text-text-secondary hover:text-accent text-[11px] font-light transition whitespace-nowrap" href="/tanks">{t('nav.tank')}</Link>
          <Link className="px-1.5 py-1 rounded-full text-text-secondary hover:text-accent text-[11px] font-light transition whitespace-nowrap" href="/species">{t('nav.species')}</Link>
          <Link className="px-1.5 py-1 rounded-full text-text-secondary hover:text-accent text-[11px] font-light transition whitespace-nowrap" href="/stats">{t('nav.stats')}</Link>
          <Link className="px-1.5 py-1 rounded-full text-text-secondary hover:text-accent text-[11px] font-light transition whitespace-nowrap" href="/profile">{t('nav.profile')}</Link>
          <div className="ml-1 flex items-center shrink-0">
            <select
              value={locale}
              onChange={(e) => handleLocaleChange(e.target.value as 'zh' | 'en' | 'ja')}
              aria-label="Language"
              className="text-[11px] border border-glass-border rounded-full bg-glass text-text-secondary px-2 py-1 cursor-pointer hover:border-glass-border-accent focus:outline-none"
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
