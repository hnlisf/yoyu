'use client';

import { useTranslations } from 'next-intl';
import { api, useApi, FishTank } from '@/lib/api';
import { GlassCard } from '@/components/ui/GlassCard';
import { WeeklyBarChart } from '@/components/stats/WeeklyBarChart';
import { AchievementBadge } from '@/components/AchievementBadge';

const USER_ID = 'demo-user';

// Types matching the backend GET /api/stats response
interface StatsSummary {
  fishCount: number;
  totalDays: number;
  feedCount: number;
  waterChangeCount: number;
  treatCount: number;
  achievementCount: number;
}

interface WeeklyRaw {
  date: string; // 'YYYY-MM-DD'
  feed: number;
  water: number;
  remind: number;
}

interface Achievement {
  id: string;
  titleKey: string;
  unlockedAt: string | null;
}

interface StatsResponse {
  summary: StatsSummary;
  weekly: WeeklyRaw[];
  achievements: Achievement[];
}

// Transform backend weekly ISO dates to short day labels for WeeklyBarChart
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
function transformWeekly(raw: WeeklyRaw[]) {
  return raw.map((d) => ({
    day: DAY_LABELS[new Date(d.date + 'T00:00:00Z').getUTCDay()],
    feed: d.feed,
    waterChange: d.water,
    treat: d.remind,
  }));
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

export default function StatsPage() {
  const t = useTranslations('stats');

  // Fetch fish tanks to get fishCount (the only real-time piece we still need from /api/fish-tanks)
  const { data: tanks } = useApi<FishTank[]>(`/api/fish-tanks?userId=${USER_ID}`);

  // Fetch real stats from the new backend aggregation endpoint
  const { data: stats, error } = useApi<StatsResponse>('/api/stats?userId=' + USER_ID);

  const loading = !stats && !error;

  if (loading) {
    return <p className="text-text-secondary text-sm font-light">…</p>;
  }

  // Fallback: if backend /api/stats fails, show zeros
  const summary: StatsSummary = stats?.summary ?? {
    fishCount: 0,
    totalDays: 0,
    feedCount: 0,
    waterChangeCount: 0,
    treatCount: 0,
    achievementCount: 0,
  };

  // If fishCount from /api/fish-tanks is available, use it for the summary
  const fishCountFromTanks = tanks
    ? tanks.reduce((s, tank) => s + (tank.fish?.length ?? 0), 0)
    : summary.fishCount;

  const weekly = stats ? transformWeekly(stats.weekly) : [];
  const achievements = stats?.achievements ?? [];

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-light text-text-primary tracking-wide">{t('title')}</h1>
        <p className="text-xs text-text-secondary font-light mt-1">{t('subtitle')}</p>
      </header>

      {/* Core data cards — 3 on mobile, 6 on desktop */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        <StatCard label={t('totalDays')} value={summary.totalDays} unit={t('unitDay')} />
        <StatCard label={t('totalFish')} value={fishCountFromTanks} unit={t('unitCount')} />
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
              achievementKey={a.titleKey}
              unlocked={a.unlockedAt !== null}
              unlockedAt={a.unlockedAt ?? undefined}
            />
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
