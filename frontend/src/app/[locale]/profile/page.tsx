'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link, useRouter, usePathname } from '@/i18n/routing';
import { api, FishTank, Fish } from '@/lib/api';
import { FishAvatar } from '@/components/fish';
import { slugToVariant } from '@/components/fish/types';
import { GlassCard } from '@/components/ui/GlassCard';
import { Tag } from '@/components/ui/Tag';
import { Switch } from '@/components/ui/Switch';
import { Button } from '@/components/ui/Button';
import { BottomSheet } from '@/components/ui/BottomSheet';

const USER_ID = 'demo-user';
const LOCALES = ['zh', 'en', 'ja'] as const;

export default function ProfilePage() {
  const t = useTranslations('profile');
  const router = useRouter();
  const pathname = usePathname();
  const [tanks, setTanks] = useState<FishTank[]>([]);
  const [allFish, setAllFish] = useState<Fish[]>([]);
  const [loading, setLoading] = useState(true);
  const [notif, setNotif] = useState(true);
  const [langOpen, setLangOpen] = useState(false);
  const [city, setCity] = useState('');
  const [cityInput, setCityInput] = useState('');
  const [cityOpen, setCityOpen] = useState(false);
  const [citySaving, setCitySaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const t0 = await api<FishTank[]>(`/api/fish-tanks?userId=${USER_ID}`);
        if (cancelled) return;
        setTanks(t0);
        const fishLists = await Promise.all(
          t0.map((tk) => api<Fish[]>(`/api/fish?tankId=${tk.id}`).catch(() => []))
        );
        if (cancelled) return;
        setAllFish(fishLists.flat());
      } catch {
        // tolerate error
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load user city preference
  useEffect(() => {
    api<{ city?: string }>(`/api/user/preferences?userId=${USER_ID}`)
      .then((pref) => {
        if (pref?.city) {
          setCity(pref.city);
          setCityInput(pref.city);
        }
      })
      .catch(() => {});
  }, []);

  const saveCity = async () => {
    setCitySaving(true);
    try {
      await api(`/api/user/preferences`, {
        method: 'PUT',
        body: JSON.stringify({ userId: USER_ID, city: cityInput }),
      });
      setCity(cityInput);
      setCityOpen(false);
    } catch {
      // ignore
    } finally {
      setCitySaving(false);
    }
  };

  // De-dup fish by species id for favorites
  const seen = new Set<string>();
  const favoriteFish = allFish.filter((f) => {
    const key = f.species?.id ?? f.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Count distinct species
  const speciesUnlocked = new Set(allFish.map((f) => f.species?.id ?? f.id)).size;

  const changeLocale = (locale: string) => {
    // Persist to cookie for next-intl detection
    document.cookie = `locale=${locale};path=/;max-age=${365 * 24 * 60 * 60}`;
    // Navigate to the same page with new locale
    router.push(pathname, { locale: locale as 'zh' | 'en' | 'ja' });
  };

  // Get language label from i18n
  const languages = t.raw('languages') as Record<string, string>;

  return (
    <div className="space-y-5">
      {/* Avatar section */}
      <GlassCard className="text-center py-8 relative overflow-hidden">
        <div
          className="absolute inset-0 bg-gradient-to-br from-accent/15 to-accent-gold/10"
          aria-hidden
        />
        <div className="relative z-10">
          <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-accent to-accent-aux flex items-center justify-center mb-3 shadow-glow-accent">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#0a1f2e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="9" r="3.5" />
              <path d="M5 20c1-3 4-5 7-5s6 2 7 5" />
            </svg>
          </div>
          <h1 className="text-xl font-light text-text-primary">Demo User</h1>
          <Tag variant="gold" className="mt-2">
            Lv. 5
          </Tag>
        </div>
      </GlassCard>

      {/* Profile stats — clickable cards */}
      <div className="grid grid-cols-3 gap-3">
        <Link href="/tanks" className="block">
          <GlassCard hover className="text-center py-4 cursor-pointer">
            <p className="text-2xl text-accent font-light tabular-nums">{tanks.length}</p>
            <p className="text-[11px] text-text-secondary font-light mt-1">{t('myTanks')}</p>
          </GlassCard>
        </Link>
        <Link href="/my-fish" className="block">
          <GlassCard hover className="text-center py-4 cursor-pointer">
            <p className="text-2xl text-accent font-light tabular-nums">{allFish.length}</p>
            <p className="text-[11px] text-text-secondary font-light mt-1">{t('myFish')}</p>
          </GlassCard>
        </Link>
        <Link href="/species?filter=unlocked" className="block">
          <GlassCard hover className="text-center py-4 cursor-pointer">
            <p className="text-2xl text-accent-gold font-light tabular-nums">
              {speciesUnlocked}<span className="text-sm text-text-secondary"> / 5</span>
            </p>
            <p className="text-[11px] text-text-secondary font-light mt-1">{t('unlockedSpecies')}</p>
          </GlassCard>
        </Link>
      </div>

      {/* Favorites */}
      {favoriteFish.length > 0 && (
        <GlassCard>
          <h2 className="text-sm font-normal text-text-primary mb-3">{t('favorites')}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
            {favoriteFish.map((f) => (
              <Link
                key={f.id}
                href={`/growth/${f.id}`}
                className="flex-shrink-0 w-24 p-1"
              >
                <GlassCard hover className="text-center py-3">
                  <div className="flex justify-center mb-2">
                    <FishAvatar
                      variant={slugToVariant(f.species?.name ?? f.species?.id)}
                      visualVariant={f.species?.visualVariant}
                      stage={f.stage}
                      size={56}
                      animated={false}
                    />
                  </div>
                  <p className="text-[11px] text-text-primary whitespace-normal break-words text-center">
                    {f.species?.name ?? f.name}
                  </p>
                </GlassCard>
              </Link>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Settings */}
      <GlassCard className="space-y-3">
        <h2 className="text-sm font-normal text-text-primary">{t('settings')}</h2>

        <SettingRow
          label={t('notifLabel')}
          desc={t('notifDesc')}
          control={<Switch checked={notif} onChange={setNotif} />}
        />
        <SettingRow
          label={t('languageLabel')}
          desc={t('languageDesc')}
          control={
            <button
              onClick={() => setLangOpen(true)}
              className="focus:outline-none"
            >
              <Tag variant="primary" className="text-[11px] cursor-pointer hover:opacity-80 transition">
                {t('languageValue')}
              </Tag>
            </button>
          }
        />
        <SettingRow
          label={t('cityLabel') || '城市设置'}
          desc={city ? `${t('cityCurrent') || '当前'}: ${city}` : (t('cityDesc') || '设置城市以获取当地天气')}
          control={
            <button
              onClick={() => { setCityInput(city); setCityOpen(true); }}
              className="focus:outline-none"
            >
              <Tag variant="gold" className="text-[11px] cursor-pointer hover:opacity-80 transition">
                {city || (t('citySet') || '设置')}
              </Tag>
            </button>
          }
        />
        <SettingRow
          label={t('aboutLabel')}
          desc={t('aboutDesc')}
          control={<span className="text-accent text-xs">›</span>}
        />
      </GlassCard>

      {/* Language picker BottomSheet */}
      <BottomSheet
        open={langOpen}
        onClose={() => setLangOpen(false)}
        title={t('languageLabel')}
      >
        <div className="space-y-2">
          {LOCALES.map((loc) => (
            <Button
              key={loc}
              variant="ghost"
              onClick={() => changeLocale(loc)}
              className="w-full justify-start text-left"
            >
              <span className="text-sm text-text-primary font-light">
                {languages?.[loc] ?? loc}
              </span>
            </Button>
          ))}
        </div>
      </BottomSheet>

      {/* City picker BottomSheet */}
      <BottomSheet
        open={cityOpen}
        onClose={() => setCityOpen(false)}
        title={t('cityLabel') || '城市设置'}
      >
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              className="input flex-1"
              value={cityInput}
              onChange={(e) => setCityInput(e.target.value)}
              placeholder={t('cityPlaceholder') || '输入城市名，如"北京"'}
              onKeyDown={(e) => e.key === 'Enter' && saveCity()}
            />
            <Button variant="accent" onClick={saveCity} disabled={citySaving || !cityInput.trim()}>
              {citySaving ? '...' : (t('citySave') || '保存')}
            </Button>
          </div>
          {/* Quick city suggestions */}
          <div className="flex flex-wrap gap-2">
            {['北京', '上海', '广州', '深圳', '杭州', '成都', '东京', 'New York'].map((c) => (
              <Tag
                key={c}
                variant="neutral"
                className="cursor-pointer hover:bg-glass transition"
                onClick={() => { setCityInput(c); }}
              >
                {c}
              </Tag>
            ))}
          </div>
        </div>
      </BottomSheet>

      {loading && <p className="text-text-secondary text-xs font-light">…</p>}
    </div>
  );
}

function SettingRow({
  label,
  desc,
  control,
}: {
  label: string;
  desc: string;
  control: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-glass-border last:border-0">
      <div className="flex-1 min-w-0 pr-3">
        <p className="text-sm text-text-primary font-light">{label}</p>
        <p className="text-[10px] text-text-secondary font-light mt-0.5">{desc}</p>
      </div>
      {control}
    </div>
  );
}
