import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';

export const locales = ['zh', 'en', 'ja'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'zh';

export default getRequestConfig(async () => {
  // Locale priority: cookie > Accept-Language > default
  const cookieStore = cookies();
  let locale: string = cookieStore.get('locale')?.value ?? defaultLocale;
  if (!locales.includes(locale as Locale)) locale = defaultLocale;
  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});
