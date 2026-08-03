/**
 * ============================================================================
 * 文件名：swr/useStats.ts（统计 SWR Hooks 集合）
 * ============================================================================
 * 作用：替代 stats/page.tsx 的 3 个 mock 调用
 *
 * P4 §3.3.2-3.3.4：PR 21
 *
 * 提供 3 个 hook：
 *   - useStatsSummary(userId)
 *   - useStatsWeekly(userId, weeks)
 *   - useAchievements(userId)
 *
 * 设计：每个 hook 一个 SWR key，独立的缓存 + revalidate 策略
 * ============================================================================
 */

'use client';

import useSWR from 'swr';

export interface UserStatsSummary {
  userId: string;
  totalFish: number;
  totalTanks: number;
  byStatus: {
    healthy: number;
    subhealthy: number;
    danger: number;
    hungry: number;
    dead: number;
  };
  bySpecies: Array<{ speciesId: string; speciesName: string; count: number }>;
  recentFish: Array<{
    id: string;
    name: string;
    speciesName: string;
    growth: number;
  }>;
  favoriteCount: number;
}

export interface WeeklyFeedingDatum {
  weekStart: string;
  feedCount: number;
  fishFedCount: number;
}

export interface Achievement {
  key: string;
  icon: string;
  titleKey: string;
  descKey: string;
  unlocked: boolean;
  unlockedAt: string | null;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

/**
 * useStatsSummary —— 用户级整体统计
 */
export function useStatsSummary(userId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<UserStatsSummary>(
    userId ? `/api/stats/summary?userId=${userId}` : null,
    fetcher,
    {
      revalidateOnFocus: true,
      dedupingInterval: 10_000,
    },
  );

  return {
    summary: data ?? null,
    isLoading,
    isError: !!error,
    error,
    refresh: mutate,
  };
}

/**
 * useStatsWeekly —— 喂食频次时间序列
 */
export function useStatsWeekly(userId: string | null, weeks: number = 12) {
  const { data, error, isLoading, mutate } = useSWR<WeeklyFeedingDatum[]>(
    userId ? `/api/stats/weekly?userId=${userId}&weeks=${weeks}` : null,
    fetcher,
    {
      revalidateOnFocus: true,
      dedupingInterval: 30_000,
    },
  );

  return {
    weekly: data ?? [],
    isLoading,
    isError: !!error,
    error,
    refresh: mutate,
  };
}

/**
 * useAchievements —— 成就解锁列表
 */
export function useAchievements(userId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<Achievement[]>(
    userId ? `/api/achievements?userId=${userId}` : null,
    fetcher,
    {
      revalidateOnFocus: true,
      dedupingInterval: 30_000,
    },
  );

  return {
    achievements: data ?? [],
    isLoading,
    isError: !!error,
    error,
    refresh: mutate,
  };
}