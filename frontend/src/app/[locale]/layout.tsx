import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { cookies } from 'next/headers';
import './globals.css';
import Header from '@/components/Header';
import { NavBar } from '@/components/nav/NavBar';
import { LocaleProvider } from '@/components/LocaleProvider';

export const metadata: Metadata = {
  title: 'FishGrow · Liquid Glass',
  description: 'Virtual fish pet game — v4 liquid glass design',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();
  const cookieStore = cookies();
  const userId = cookieStore.get('userId')?.value ?? 'demo-user';

  return (
    <html lang={locale}>
      <body className="bg-deep-sea min-h-screen">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <LocaleProvider locale={locale}>
            <Header />
            <main className="mx-auto max-w-5xl px-4 py-6 pb-28 page-enter">
              {children}
            </main>
            <NavBar />
          </LocaleProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
