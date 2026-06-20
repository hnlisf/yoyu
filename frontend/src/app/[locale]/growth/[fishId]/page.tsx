'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { api, Fish } from '@/lib/api';
import { mockGrowthHistory } from '@/lib/api/mock';
import { FishAvatar } from '@/components/fish';
import { slugToVariant } from '@/components/fish/types';
import { GlassCard } from '@/components/ui/GlassCard';
import { Tag } from '@/components/ui/Tag';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { GrowthChart } from '@/components/growth/GrowthChart';
import { Icon } from '@/components/ui/Icon';

interface PageProps {
  params: { fishId: string };
}

export default function YoYuthPage({ params }: PageProps) {
  const { fishId } = params;
  const t = useTranslations('growth');
  const tf = useTranslations('fish.stage');
  const [fish, setFish] = useState<Fish | null>(null);
  const [history, setHistory] = useState<ReturnType<typeof mockGrowthHistory>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const f = await api<Fish>(`/api/fish/${fishId}`);
        if (cancelled) return;
        setFish(f);
        // MOCK: backend growth-history endpoint not implemented yet.
        // When it lands, replace with: await api<GrowthRecord[]>(`/api/fish/${fishId}/growth-history`)
        setHistory(mockGrowthHistory(fishId, 30));
      } catch (e: any) {
        // tolerate network error and show empty state
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fishId]);

  if (loading) {
    return <p className="text-text-secondary text-sm font-light">…</p>;
  }

  if (!fish) {
    return (
      <GlassCard>
        <p className="text-text-primary text-sm">{t('notFound')}</p>
      </GlassCard>
    );
  }

  const variant = slugToVariant(fish.species?.name ?? fish.species?.id);
  const days = Math.max(
    1,
    Math.floor((Date.now() - new Date(fish.birthday).getTime()) / 86400000)
  );

  return (
    <div className="space-y-5">
      <Link
        href={fish.tankId ? `/tanks/${fish.tankId}` : '/tanks'}
        className="text-[11px] font-light text-accent tracking-wide inline-block"
      >
        ← {t('backToTank')}
      </Link>

      {/* Fish profile card */}
      <GlassCard className="flex items-center gap-4">
        <FishAvatar variant={variant} stage={fish.stage} size={100} animated={false} />
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-light text-text-primary truncate">
            {fish.name || tf(fish.stage)}
          </h1>
          <p className="text-xs text-text-secondary font-light mt-1">
            {fish.species?.name ?? '—'} · {t('daysInTank', { count: days })}
          </p>
          <div className="mt-2 flex gap-1.5">
            <Tag variant="primary">{tf(fish.stage)}</Tag>
            <Tag variant="gold">
              <Icon name="feed" size={11} /> {Math.round(fish.nutrition)}
            </Tag>
            <Tag variant="success">
              <Icon name="health" size={11} /> {Math.round(fish.health)}
            </Tag>
          </div>
        </div>
      </GlassCard>

      {/* Growth chart */}
      <GlassCard>
        <GrowthChart records={history} metric="growth" height={200} />
      </GlassCard>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 gap-3">
        <GlassCard className="py-4">
          <p className="text-[10px] text-text-secondary font-light uppercase tracking-wide mb-2">
            {t('nutrition')}
          </p>
          <p className="text-2xl text-accent-orange font-light tabular-nums">
            {Math.round(fish.nutrition)}
          </p>
          <ProgressBar value={fish.nutrition} variant="orange" />
        </GlassCard>
        <GlassCard className="py-4">
          <p className="text-[10px] text-text-secondary font-light uppercase tracking-wide mb-2">
            {t('health')}
          </p>
          <p className="text-2xl text-success font-light tabular-nums">
            {Math.round(fish.health)}
          </p>
          <ProgressBar value={fish.health} variant="health" />
        </GlassCard>
        <GlassCard className="py-4">
          <p className="text-[10px] text-text-secondary font-light uppercase tracking-wide mb-2">
            {t('mood')}
          </p>
          <p className="text-2xl text-accent-gold font-light tabular-nums">
            {Math.round(history[history.length - 1]?.mood ?? 70)}
          </p>
          <ProgressBar value={history[history.length - 1]?.mood ?? 70} variant="gold" />
        </GlassCard>
        <GlassCard className="py-4">
          <p className="text-[10px] text-text-secondary font-light uppercase tracking-wide mb-2">
            {t('stage')}
          </p>
          <p className="text-2xl text-accent font-light truncate">{tf(fish.stage)}</p>
          <ProgressBar value={fish.growth} variant="accent" />
        </GlassCard>
      </div>

      {/* Feed history */}
      {fish.feedRecords && fish.feedRecords.length > 0 && (
        <GlassCard className="space-y-2">
          <h2 className="text-sm font-normal text-text-primary mb-2">{t('feedHistory')}</h2>
          {fish.feedRecords.slice(0, 6).map((r) => (
            <div
              key={r.id}
              className="flex justify-between text-xs font-light py-1.5 border-b border-glass-border last:border-0"
            >
              <span className="text-text-secondary">
                {new Date(r.fedAt).toLocaleString()}
              </span>
              <span className="text-text-primary">{r.amount}</span>
            </div>
          ))}
        </GlassCard>
      )}
    </div>
  );
}
