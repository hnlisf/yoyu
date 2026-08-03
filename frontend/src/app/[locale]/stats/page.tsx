'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { api, FishTank } from '@/lib/api';
// P4 PR 21: 改用 SWR + 真实后端 API（替代 3 个 mock）
import {
  useStatsSummary,
  useStatsWeekly,
  useAchievements,
  type UserStatsSummary,
  type Achievement,
} from '@/lib/swr/useStats';
import { GlassCard } from '@/components/ui/GlassCard';
import { WeeklyBarChart } from '@/components/stats/WeeklyBarChart';
import { AchievementBadge } from '@/components/AchievementBadge';

const USER_ID = 'demo-user';

export default function StatsPage() {
  const t = useTranslations('stats');
  // P4 PR 21：用 SWR hooks 替代 useState + useEffect + mock
  const { summary, isLoading: summaryLoading } = useStatsSummary(USER_ID);
  const { weekly, isLoading: weeklyLoading } = useStatsWeekly(USER_ID, 12);
  const { achievements, isLoading: achievementsLoading } = useAchievements(USER_ID);
  const loading = summaryLoading || weeklyLoading || achievementsLoading;

  if (loading || !summary) {
    return <p className="text-text-secondary text-sm font-light">…</p>;
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-light text-text-primary tracking-wide">{t('title')}</h1>
        <p className="text-xs text-text-secondary font-light mt-1">{t('subtitle')}</p>
      </header>

      {/* Core data cards — 3 on mobile, 6 on desktop */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        <StatCard label={t('totalDays')} value={summary.totalDays} unit={t('unitDay')} />
        <StatCard label={t('totalFish')} value={summary.totalFish} unit={t('unitCount')} />
        <StatCard label={t('feedCount')} value={summary.feedCount} unit={t('unitCount')} />
        <StatCard label={t('waterChange')} value={summary.waterChangeCount} unit={t('unitCount')} />
        <StatCard label={t('treatCount')} value={summary.treatCount} unit={t('unitCount')} />
        <StatCard
          label={t('achievementCount')}
          value={summary.achievementCount}
          unit={`/ ${achievements.length}`}
        />
      </div>

      {/* Weekly bar chart */}
      <GlassCard>
        <h2 className="text-sm font-normal text-text-primary mb-3">{t('weeklyChart')}</h2>
        <WeeklyBarChart data={weekly} metric="feed" height={160} />
      </GlassCard>

      {/* Achievements — horizontal scroll on mobile to keep above fixed tab bar */}
      <GlassCard>
        <h2 className="text-sm font-normal text-text-primary mb-3">{t('achievements')}</h2>
        <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 snap-x">
          {achievements.map((a) => (
            <AchievementBadge
              key={a.id}
              achievementKey={a.achievementKey}
              unlocked={a.unlocked}
              unlockedAt={a.unlockedAt}
            />
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

function StatCard({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <GlassCard className="text-center py-4">
      <p className="text-[10px] text-text-secondary font-light uppercase tracking-wide">
        {label}
      </p>
      <p className="text-2xl text-accent mt-1 font-light tabular-nums">{value}</p>
      <p className="text-[10px] text-text-secondary font-light">{unit}</p>
    </GlassCard>
  );
}
