'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { api, FishTank, Fish } from '@/lib/api';
import { FishAvatar } from '@/components/fish';
import { slugToVariant } from '@/components/fish/types';
import { TankStage } from '@/components/Tank/TankStage';
import { FeedingProvider, useFeeding } from '@/components/Tank/feedingStateMachine';
import { GlassCard } from '@/components/ui/GlassCard';
import { Tag } from '@/components/ui/Tag';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Toast } from '@/components/ui/Toast';
import { Icon } from '@/components/ui/Icon';
import { useTranslateTankName } from '@/lib/i18n/tankName';

interface PageProps {
  params: { id: string };
}

/**
 * Tank detail page — v5.0 main stage shows fish swimming with CSS offset-path
 * + feeding animation state machine. Below: status bars, water quality cards,
 * action buttons, and species chips.
 */
export default function TankDetailPage({ params }: PageProps) {
  const { id } = params;

  return (
    <FeedingProvider>
      <TankPageContent tankId={id} />
    </FeedingProvider>
  );
}

function TankPageContent({ tankId }: { tankId: string }) {
  const t = useTranslations('tankDetail');
  const tf = useTranslations('fish.stage');
  const tCommon = useTranslations('common');
  const tName = useTranslateTankName();
  const { startFeeding } = useFeeding();

  const [tank, setTank] = useState<FishTank | null>(null);
  const [fishList, setFishList] = useState<Fish[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const load = async () => {
    try {
      const tk = await api<FishTank>(`/api/fish-tanks/${tankId}`);
      setTank(tk);
      const fl = await api<Fish[]>(`/api/fish?tankId=${tankId}`);
      setFishList(fl);
    } catch (e: any) {
      setToast('Load failed: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [tankId]);

  const feedAll = async () => {
    if (!fishList.length) return;
    setBusy(true);

    // Trigger feeding animation
    const particles = Array.from(
      { length: 3 + Math.floor(Math.random() * 5) },
      (_, i) => ({
        id: `food-${Date.now()}-${i}`,
        x: 20 + Math.random() * 60,
        y: 5 + Math.random() * 15,
      }),
    );
    startFeeding(particles);

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
      await api(`/api/fish-tanks/${tankId}/tick`, { method: 'POST' });
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
          <h1 className="text-2xl font-light text-text-primary tracking-wide">
            {tName(tank.name)}
          </h1>
          <p className="text-xs text-text-secondary font-light mt-1">
            {tkSize(tank.size, t)}
          </p>
        </div>
      </header>

      {/* Main stage — v5.0: CSS offset-path swim + feeding animation */}
      <TankStage fishList={fishList} />

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
          <p className="text-xl text-accent mt-1 font-light tabular-nums">
            {tank.temp.toFixed(1)}°
          </p>
        </GlassCard>
        <GlassCard className="text-center py-4">
          <p className="text-[10px] text-text-secondary font-light uppercase tracking-wide">pH</p>
          <p className="text-xl text-accent mt-1 font-light tabular-nums">
            {tank.ph.toFixed(1)}
          </p>
        </GlassCard>
        <GlassCard className="text-center py-4">
          <p className="text-[10px] text-text-secondary font-light uppercase tracking-wide">
            {t('fish')}
          </p>
          <p className="text-xl text-accent mt-1 font-light tabular-nums">
            {fishList.length}
          </p>
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

function tkSize(
  size: 'small' | 'medium' | 'large',
  t: ReturnType<typeof useTranslations>,
): string {
  return t('sizeLabel', {
    size: size === 'small' ? 'S' : size === 'medium' ? 'M' : 'L',
  });
}
