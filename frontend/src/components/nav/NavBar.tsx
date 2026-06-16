'use client';

import { usePathname } from 'next/navigation';
import { Link } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import { TankIcon, SpeciesIcon, GrowthIcon, StatsIcon, ProfileIcon } from './icons';

interface Tab {
  href: string;
  i18nKey: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

/** Tab order matches the spec (Home, Species, Growth, Stats, Profile). */
const TABS: Tab[] = [
  { href: '/tanks', i18nKey: 'nav.tank', icon: TankIcon },
  { href: '/species', i18nKey: 'nav.species', icon: SpeciesIcon },
  { href: '/stats', i18nKey: 'nav.stats', icon: StatsIcon },
  { href: '/profile', i18nKey: 'nav.profile', icon: ProfileIcon },
];

/** Renders the bottom 5-tab navigation bar. */
export function NavBar() {
  const pathname = usePathname();
  const t = useTranslations();
  return (
    <nav className="navbar" aria-label="Primary">
      {TABS.map(({ href, i18nKey, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + '/');
        return (
          <Link
            key={href}
            href={href}
            className={`navbar-item${active ? ' active' : ''}`}
            aria-current={active ? 'page' : undefined}
          >
            <Icon />
            <span>{t(i18nKey)}</span>
            {active && <span className="navbar-active-bar" />}
          </Link>
        );
      })}
    </nav>
  );
}
