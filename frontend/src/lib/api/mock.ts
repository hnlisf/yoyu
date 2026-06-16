/**
 * Mock data layer for the v4 frontend.
 *
 * Backend (t_315788e2 metadata) does not yet implement:
 *   - GET /api/fish/:id/growth-history
 *   - GET /api/stats/summary?userId=:uid
 *   - GET /api/stats/weekly?userId=:uid
 *   - GET /api/achievements?userId=:uid
 *
 * Until those land, this module returns deterministic fixtures so the
 * frontend is fully demoable. When the backend endpoints are added, swap
 * each stub's body for `api<T>(path)` and delete this file.
 */
import type { Fish } from '../api';

export interface GrowthRecord {
  date: string;
  growth: number;
  health: number;
  nutrition: number;
  mood: number;
}

export interface UserStatsSummary {
  totalDays: number;
  totalFish: number;
  feedCount: number;
  waterChangeCount: number;
  treatCount: number;
  achievementCount: number;
}

export interface WeeklyDatum {
  day: string; // 'Mon' | 'Tue' | ...
  feed: number;
  waterChange: number;
  treat: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: string;
}

/** Generate `n` synthetic growth points spanning the last `n` days. */
export function mockGrowthHistory(fishId: string, n = 30): GrowthRecord[] {
  const out: GrowthRecord[] = [];
  const today = new Date();
  // Seed from fishId length so it's deterministic per fish.
  const seed = (fishId.charCodeAt(0) || 65) % 7;
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86400000);
    const dayIdx = n - 1 - i;
    out.push({
      date: d.toISOString().slice(0, 10),
      growth: Math.min(100, 30 + dayIdx * 2 + (seed % 5)),
      health: Math.max(40, 95 - (dayIdx % 8) * 3 + (seed % 4)),
      nutrition: Math.max(30, 80 - (dayIdx % 6) * 4 + (seed % 6)),
      mood: Math.max(50, 90 - (dayIdx % 5) * 5 + (seed % 3)),
    });
  }
  return out;
}

export function mockStatsSummary(fishCount: number): UserStatsSummary {
  return {
    totalDays: 47,
    totalFish: fishCount,
    feedCount: 128,
    waterChangeCount: 16,
    treatCount: 5,
    achievementCount: 4,
  };
}

export function mockWeekly(): WeeklyDatum[] {
  return [
    { day: 'Mon', feed: 6, waterChange: 1, treat: 0 },
    { day: 'Tue', feed: 8, waterChange: 0, treat: 1 },
    { day: 'Wed', feed: 7, waterChange: 1, treat: 0 },
    { day: 'Thu', feed: 9, waterChange: 0, treat: 0 },
    { day: 'Fri', feed: 8, waterChange: 1, treat: 1 },
    { day: 'Sat', feed: 10, waterChange: 0, treat: 0 },
    { day: 'Sun', feed: 7, waterChange: 1, treat: 0 },
  ];
}

export const mockAchievements: Achievement[] = [
  { id: 'a1', name: 'First Tank', description: 'Create your first tank', icon: '🪼', unlocked: true, unlockedAt: '2026-05-02' },
  { id: 'a2', name: 'Fish Whisperer', description: 'Raise 5 fish to adulthood', icon: '🐠', unlocked: true, unlockedAt: '2026-05-20' },
  { id: 'a3', name: 'Hydration Hero', description: 'Complete 10 water changes', icon: '💧', unlocked: true, unlockedAt: '2026-06-01' },
  { id: 'a4', name: 'Month Strong', description: 'Keep fish alive for 30 days', icon: '🏆', unlocked: true, unlockedAt: '2026-06-10' },
  { id: 'a5', name: 'Century Feeder', description: 'Feed your fish 100 times', icon: '🍤', unlocked: true, unlockedAt: '2026-06-12' },
  { id: 'a6', name: 'Tank Master', description: 'Run 3 tanks simultaneously', icon: '🏝️', unlocked: false },
  { id: 'a7', name: 'Species Sage', description: 'Collect all 5 base species', icon: '📖', unlocked: false },
  { id: 'a8', name: 'Legendary Caretaker', description: '100 days of perfect health', icon: '👑', unlocked: false },
];

/** Map a Fish to its fish_species.id for mock lookups. */
export function speciesSlugFromFish(fish: Fish): string {
  return fish.species?.id ?? 'guppy';
}
