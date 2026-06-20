'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/routing';
import { api, FishTank, Fish } from '@/lib/api';
import { useTankStore } from '@/lib/stores/tankStore';
import { FishAvatar } from '@/components/fish';
import { slugToVariant } from '@/components/fish/types';
import { GlassCard } from '@/components/ui/GlassCard';
import { Tag } from '@/components/ui/Tag';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Button } from '@/components/ui/Button';
import { FAB } from '@/components/ui/FAB';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Input } from '@/components/ui/Input';
import { Icon } from '@/components/ui/Icon';
import { useTranslateTankName } from '@/lib/i18n/tankName';

const USER_ID = 'demo-user';

export default function TanksHomePage() {
  const t = useTranslations('tanks.home');
  const tCommon = useTranslations('common');
  const tName = useTranslateTankName();
  const router = useRouter();
  // Pull the cached list of tanks from the global store so the bottom-nav
  // and detail page share the same source of truth.
  const tanks = useTankStore((s) => s.tanks);
  const setTanks = useTankStore((s) => s.setTanks);
  const setLoading = useTankStore((s) => s.setLoading);
  const storeError = useTankStore((s) => s.error);
  const upsertTank = useTankStore((s) => s.upsertTank);
  const [loading, setLocalLoading] = useState(tanks.length === 0);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('My Tank');
  const [size, setSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [busy, setBusy] = useState(false);
  const [representativeFishByTank, setRepresentativeFishByTank] = useState<Record<string, Fish>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const data = await api<FishTank[]>(`/api/fish-tanks?userId=${USER_ID}`);
        if (cancelled) return;
        setTanks(data);
        setLocalLoading(false);
        // Fetch first fish of each tank in parallel to show a representative avatar.
        const fishEntries = await Promise.all(
          data.map(async (tk) => {
            try {
              const fl = await api<Fish[]>(`/api/fish?tankId=${tk.id}`);
              return [tk.id, fl[0]] as const;
            } catch {
              return [tk.id, undefined] as const;
            }
          })
        );
        if (cancelled) return;
        const map: Record<string, Fish> = {};
        for (const [id, f] of fishEntries) {
          if (f) map[id] = f;
        }
        setRepresentativeFishByTank(map);
      } catch (e: any) {
        if (!cancelled) setError(e.message ?? 'load error');
      } finally {
        if (!cancelled) setLocalLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const createTank = async () => {
    setBusy(true);
    try {
      const created = await api<FishTank>('/api/fish-tanks', {
        method: 'POST',
        body: JSON.stringify({ userId: USER_ID, name, size }),
      });
      setCreating(false);
      setName('My Tank');
      // Re-fetch and store the new tank.
      const data = await api<FishTank[]>(`/api/fish-tanks?userId=${USER_ID}`);
      setTanks(data);
      // Auto-redirect to the tank detail page so the user sees the fish
      if (created?.id) {
        router.push(`/tanks/${created.id}`);
      }
    } catch (e: any) {
      alert('Create failed: ' + e.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading && tanks.length === 0) {
    return <p className="text-text-secondary text-sm font-light">{tCommon('loading')}</p>;
  }

  if (error) {
    return (
      <GlassCard>
        <p className="text-sm text-text-primary mb-2">{tCommon('error')}</p>
        <p className="text-xs text-text-secondary mb-4">{error}</p>
        <Button variant="primary" onClick={() => window.location.reload()}>
          {tCommon('retry')}
        </Button>
      </GlassCard>
    );
  }

  const isEmpty = tanks.length === 0;

  return (
    <div className="space-y-5">
      <header className="flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-light text-text-primary tracking-wide">{t('title')}</h1>
          <p className="text-xs text-text-secondary font-light mt-1">
            {t('subtitle', { count: tanks.length })}
          </p>
        </div>
      </header>

      {isEmpty ? (
        <GlassCard hover className="text-center py-12">
          <div className="flex justify-center mb-4 text-accent opacity-80">
            <Icon name="bubble" size={48} />
          </div>
          <p className="text-sm text-text-primary font-light mb-5">{t('empty')}</p>
          <Button variant="primary" onClick={() => setCreating(true)}>
            {t('createButton')}
          </Button>
        </GlassCard>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4 pb-20">
          {tanks.map((tk) => {
            const repFish = representativeFishByTank[tk.id];
            const variant = slugToVariant(repFish?.species?.name ?? repFish?.species?.id);
            const stage = repFish?.stage ?? 'subadult';
            const waterScore = Math.round((tk.cleanliness + tk.oxygen) / 2);
            const waterVariant =
              waterScore >= 70 ? 'success' : waterScore >= 40 ? 'warning' : 'orange';
            const waterLabel =
              waterScore >= 70 ? t('healthy') : waterScore >= 40 ? t('ok') : t('attention');
            return (
              <Link key={tk.id} href={`/tanks/${tk.id}`} className="block">
                <GlassCard hover className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <h2 className="text-base font-normal text-text-primary truncate">
                        {tName(tk.name)}
                      </h2>
                      <p className="text-[11px] font-light text-text-secondary">
                        {tk.temp.toFixed(1)}°C · pH {tk.ph.toFixed(1)}
                      </p>
                    </div>
                    <FishAvatar variant={variant} stage={stage} size={56} animated={false} />
                  </div>

                  <div className="flex items-center justify-between">
                    <Tag variant={waterVariant}>{waterLabel}</Tag>
                    <span className="inline-flex items-center gap-1 text-[11px] font-light text-text-secondary">
                      <Icon name="fishCount" size={13} />
                      {tk.fish?.length ?? '—'}
                    </span>
                  </div>

                  <ProgressBar
                    value={tk.cleanliness}
                    variant="accent"
                    showLabel
                    label={t('cleanliness')}
                  />
                </GlassCard>
              </Link>
            );
          })}
        </div>
      )}

      {!isEmpty && <FAB aria-label="new tank" onClick={() => setCreating(true)} />}

      <BottomSheet
        open={creating}
        onClose={() => setCreating(false)}
        title={t('createTitle')}
      >
        <div className="space-y-4">
          <Input
            label={t('name')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Tank"
          />
          <div>
            <label className="block text-[11px] font-light text-text-secondary mb-1.5 tracking-wide uppercase">
              {t('size')}
            </label>
            <div className="flex gap-2">
              {(['small', 'medium', 'large'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSize(s)}
                  className={`flex-1 py-2 rounded-xl text-sm transition ${
                    size === s
                      ? 'bg-accent/20 text-accent border border-accent/40'
                      : 'bg-glass text-text-secondary border border-glass-border'
                  }`}
                >
                  {s === 'small' ? t('sizeSmall') : s === 'medium' ? t('sizeMedium') : t('sizeLarge')}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="ghost" onClick={() => setCreating(false)} className="flex-1">
              {tCommon('cancel')}
            </Button>
            <Button variant="primary" onClick={createTank} disabled={busy} className="flex-1">
              {busy ? '…' : tCommon('create')}
            </Button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
