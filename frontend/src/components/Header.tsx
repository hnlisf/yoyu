'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useLocale } from './LocaleProvider';

export default function Header() {
  const t = useTranslations();
  const { locale, setLocale } = useLocale();
  const router = useRouter();
  const locales: Array<{ code: 'zh' | 'en' | 'ja'; label: string }> = [
    { code: 'zh', label: '中' },
    { code: 'en', label: 'EN' },
    { code: 'ja', label: '日' },
  ];
  return (
    <header className="bg-white/60 backdrop-blur-md border-b border-water-100 sticky top-0 z-30">
      <div className="mx-auto max-w-5xl flex items-center justify-between px-4 py-3">
        <Link href="/tank" className="flex items-center gap-2 group">
          <span className="text-2xl">🐟</span>
          <span className="text-lg font-semibold text-water-600 group-hover:text-coral-500 transition">
            {t('appName')}
          </span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link className="px-3 py-1.5 rounded-full text-water-600 hover:bg-water-50" href="/tank">{t('nav.tank')}</Link>
          <Link className="px-3 py-1.5 rounded-full text-water-600 hover:bg-water-50" href="/species">{t('nav.species')}</Link>
          <Link className="px-3 py-1.5 rounded-full text-water-600 hover:bg-water-50" href="/reminders">{t('nav.reminders')}</Link>
          <Link className="px-3 py-1.5 rounded-full text-water-600 hover:bg-water-50" href="/weather">{t('nav.weather')}</Link>
          <div className="ml-2 flex border border-water-200 rounded-full overflow-hidden text-xs">
            {locales.map((l) => (
              <button
                key={l.code}
                onClick={() => { setLocale(l.code); router.refresh(); }}
                className={`px-2.5 py-1 ${locale === l.code ? 'bg-water-400 text-white' : 'bg-white text-water-600 hover:bg-water-50'}`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </nav>
      </div>
    </header>
  );
}
