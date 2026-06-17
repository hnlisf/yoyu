'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { api, FishTank, Fish } from '@/lib/api';
import { FishAvatar } from '@/components/fish';
import { slugToVariant } from '@/components/fish/types';
import { GlassCard } from '@/components/ui/GlassCard';
import { Tag } from '@/components/ui/Tag';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Toast } from '@/components/ui/Toast';
import { Icon } from '@/components/ui/Icon';

interface PageProps {
  params: { id: string };
}

/**
 * Tank detail page — main stage shows all fish swimming with random delays,
 * below are status bars, water quality cards, action buttons, and species chips.
 */
export default function TankDetailPage({ params }: PageProps) {
  const { id } = params;
  const t = useTranslations('tankDetail');
  const tf = useTranslations('fish.stage');
  const tCommon = useTranslations('common');
  const [tank, setTank] = useState<FishTank | null>(null);
  const [fishList, setFishList] = useState<Fish[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const load = async () => {
    try {
      const tk = await api<FishTank>(`/api/fish-tanks/${id}`);
      setTank(tk);
      const fl = await api<Fish[]>(`/api/fish?tankId=${id}`);
      setFishList(fl);
    } catch (e: any) {
      setToast('Load failed: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const feedAll = async () => {
    if (!fishList.length) return;
    setBusy(true);
    try {
      for (const f of fishList) {
        await api(`/api/fish/${f.id}/feed`, {
          method: 'POST',
          body: JSON.stringify({ amount: 'normal' }),
        });
      }
      setToast(t('feedAllDone'));
      await load();
    } catch (e: any) {
      setToast('Feed failed: ' + e.message);
    } finally {
      setBusy(false);
    }
  };

  const waterChange = async () => {
    setBusy(true);
    try {
      await api(`/api/fish-tanks/${id}/tick`, { method: 'POST' });
      setToast(t('waterChanged'));
      await load();
    } catch (e: any) {
      setToast('Water change failed: ' + e.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <p className="text-text-secondary text-sm font-light">{tCommon('loading')}</p>;
  }

  if (!tank) {
    return (
      <GlassCard>
        <p className="text-text-primary text-sm">{t('notFound')}</p>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-5">
      <header className="flex items-baseline justify-between">
        <div>
          <Link
            href="/tanks"
            className="text-[11px] font-light text-accent tracking-wide inline-block mb-2"
          >
            ← {tCommon('back')}
          </Link>
          <h1 className="text-2xl font-light text-text-primary tracking-wide">{tank.name}</h1>
          <p className="text-xs text-text-secondary font-light mt-1">
            {tkSize(tank.size, t)}
          </p>
        </div>
      </header>

      {/* Main stage */}
      <GlassCard className="relative overflow-hidden" style={{ minHeight: 280 }}>
        {/* Background bubbles */}
        <div className="absolute inset-0 bg-gradient-to-b from-accent/[0.08] to-deep/40" />
        <div
          className="absolute bottom-4 left-8 w-2 h-2 rounded-full bg-white/40 animate-bubble"
          aria-hidden
        />
        <div
          className="absolute bottom-4 right-12 w-3 h-3 rounded-full bg-white/30 animate-bubble"
          style={{ animationDelay: '2s' }}
          aria-hidden
        />
        <div
          className="absolute bottom-4 left-1/3 w-1.5 h-1.5 rounded-full bg-white/30 animate-bubble"
          style={{ animationDelay: '4s' }}
          aria-hidden
        />

        {fishList.length > 0 ? (
          <div className="relative z-10 flex flex-wrap gap-4 items-end justify-center py-8">
            {fishList.map((f, i) => (
              <Link
                key={f.id}
                href={`/growth/${f.id}`}
                className="flex flex-col items-center animate-float"
                style={{ animationDelay: `${i * 0.4}s` }}
              >
                <FishAvatar
                  variant={slugToVariant(f.species?.name ?? f.species?.id)}
                  stage={f.stage}
                  size={80}
                  animated={false}
                />
                <p className="text-[11px] text-text-primary mt-1 font-light drop-shadow">
                  {f.name || tf(f.stage)}
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="relative z-10 flex items-center justify-center py-16 text-text-secondary text-sm">
            {t('noFish')}
          </div>
        )}
      </GlassCard>

      {/* Status bars */}
      <GlassCard className="space-y-3">
        <h2 className="text-sm font-normal text-text-primary">{t('statusTitle')}</h2>
        <ProgressBar value={tank.cleanliness} variant="accent" showLabel label={t('cleanliness')} />
        <ProgressBar value={tank.oxygen} variant="health" showLabel label={t('oxygen')} />
      </GlassCard>

      {/* Water quality cards */}
      <div className="grid grid-cols-3 gap-3">
        <GlassCard className="text-center py-4">
          <p className="text-[10px] text-text-secondary font-light uppercase tracking-wide">
            {t('temp')}
          </p>
          <p className="text-xl text-accent mt-1 font-light tabular-nums">{tank.temp.toFixed(1)}°</p>
        </GlassCard>
        <GlassCard className="text-center py-4">
          <p className="text-[10px] text-text-secondary font-light uppercase tracking-wide">pH</p>
          <p className="text-xl text-accent mt-1 font-light tabular-nums">{tank.ph.toFixed(1)}</p>
        </GlassCard>
        <GlassCard className="text-center py-4">
          <p className="text-[10px] text-text-secondary font-light uppercase tracking-wide">
            {t('fish')}
          </p>
          <p className="text-xl text-accent mt-1 font-light tabular-nums">{fishList.length}</p>
        </GlassCard>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-3 gap-3">
        <Button variant="accent" onClick={feedAll} disabled={busy || !fishList.length}>
          <Icon name="feed" size={14} /> {t('feedAll')}
        </Button>
        <Button variant="primary" onClick={waterChange} disabled={busy}>
          <Icon name="water" size={14} /> {t('waterChange')}
        </Button>
        <Button variant="ghost" disabled>
          <Icon name="treat" size={14} /> {t('treat')}
        </Button>
      </div>

      {/* Species chips */}
      {fishList.length > 0 && (
        <GlassCard className="space-y-3">
          <h2 className="text-sm font-normal text-text-primary">{t('fish')}</h2>
          <div className="space-y-2">
            {fishList.map((f) => {
              const variant = slugToVariant(f.species?.name ?? f.species?.id);
              return (
                <Link
                  key={f.id}
                  href={`/growth/${f.id}`}
                  className="flex items-center gap-3 p-2 rounded-xl hover:bg-glass transition"
                >
                  <FishAvatar variant={variant} stage={f.stage} size={48} animated={false} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary truncate">
                      {f.name || tf(f.stage)}
                    </p>
                    <p className="text-[10px] font-light text-text-secondary">
                      {tf(f.stage)} · {Math.round(f.growth)}%
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Tag variant="success">
                      <Icon name="health" size={11} /> {Math.round(f.health)}
                    </Tag>
                    <Tag variant="gold">
                      <Icon name="feed" size={11} /> {Math.round(f.nutrition)}
                    </Tag>
                  </div>
                </Link>
              );
            })}
          </div>
        </GlassCard>
      )}

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}

function tkSize(size: 'small' | 'medium' | 'large', t: ReturnType<typeof useTranslations>): string {
  return t('sizeLabel', { size: size === 'small' ? 'S' : size === 'medium' ? 'M' : 'L' });
}
