import { useTranslations } from 'next-intl';
import Link from 'next/link';

/**
 * HomeHero — brand logo + slogan + CTA button
 * Server component (no interactivity needed)
 */
export default function HomeHero() {
  const t = useTranslations();

  return (
    <section className="relative text-center py-12 md:py-16 xl:py-20 px-4">
      {/* Decorative bubble */}
      <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-20 h-20 rounded-full bg-accent/10 blur-2xl pointer-events-none" />

      {/* Brand icon */}
      <div className="mx-auto mb-6 w-20 h-20 rounded-full bg-gradient-to-br from-accent/30 to-accent-aux/20 flex items-center justify-center shadow-glow-accent">
        <span className="text-3xl">🐟</span>
      </div>

      {/* Slogan */}
      <h1 className="text-3xl md:text-4xl xl:text-5xl font-bold text-text-primary mb-3">
        {t('brandName')}
      </h1>
      <p className="text-lg md:text-xl text-text-secondary mb-8 max-w-md mx-auto">
        {t('tagline')}
      </p>

      {/* CTA */}
      <Link
        href="/tanks"
        className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-accent text-deep font-semibold text-lg shadow-glow-accent hover:bg-accent-aux transition-colors"
      >
        {t('home.startButton')}
        <span className="text-xl">→</span>
      </Link>
    </section>
  );
}
