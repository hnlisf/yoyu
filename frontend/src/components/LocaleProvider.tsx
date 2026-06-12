'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

type Locale = 'zh' | 'en' | 'ja';
const LocaleCtx = createContext<{ locale: Locale; setLocale: (l: Locale) => void }>({
  locale: 'zh',
  setLocale: () => {},
});

export function LocaleProvider({ locale, children }: { locale: string; children: ReactNode }) {
  const [cur, setCur] = useState<Locale>((locale as Locale) ?? 'zh');
  return (
    <LocaleCtx.Provider value={{ locale: cur, setLocale: (l) => {
      setCur(l);
      document.cookie = `locale=${l}; path=/; max-age=${60 * 60 * 24 * 365}`;
    }}}>
      {children}
    </LocaleCtx.Provider>
  );
}

export const useLocale = () => useContext(LocaleCtx);
