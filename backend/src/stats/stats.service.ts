/**
 * ============================================================================
 * 文件名：stats/stats.service.ts（统计聚合服务）
 * ============================================================================
 * 作用：替代前端 mock 的 3 个统计端点
 *   - /api/stats/summary     → 用户级整体统计
 *   - /api/stats/weekly      → 喂食频次时间序列
 *   - /api/achievements      → 成就解锁列表
 *
 * P4 §3.1.2-3.1.4：PR 19
 *
 * 设计取舍：
 *   - 不存"聚合快照"表——按需聚合，30 天内数据量小
 *   - 三个端点共用 FishService + ReminderService 跨模块数据
 *   - achievements 用静态规则（首条鱼/5/10/...）+ DB 检查解锁状态
 * ============================================================================
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { safeParse } from '../common/i18n';

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
  /** 周一日期（ISO date） */
  weekStart: string;
  /** 喂食次数 */
  feedCount: number;
  /** 喂食的鱼只数（去重） */
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

@Injectable()
export class StatsService {
  constructor(private prisma: PrismaService) {}

  /** GET /api/stats/summary —— 用户级整体统计 */
  async getSummary(userId: string): Promise<UserStatsSummary> {
    // 一次查所有鱼 + 缸（用 include 减少 N+1）
    const tanks = await this.prisma.fishTank.findMany({
      where: { userId },
      include: {
        fish: {
          include: { species: { select: { id: true, nameI18n: true } } },
        },
      },
    });

    const allFish = tanks.flatMap((t) => t.fish);
    const totalFish = allFish.length;
    const totalTanks = tanks.length;

    // 按 status 分类
    const byStatus = {
      healthy: 0,
      subhealthy: 0,
      danger: 0,
      hungry: 0,
      dead: 0,
    };
    for (const f of allFish) {
      const s = (f.status ?? 'healthy') as keyof typeof byStatus;
      if (s in byStatus) byStatus[s]++;
      else byStatus.healthy++;  // 未知状态默认归健康
    }

    // 按 species 聚合
    const speciesMap = new Map<string, { count: number; nameI18n: string }>();
    for (const f of allFish) {
      const sid = f.speciesId;
      const existing = speciesMap.get(sid);
      if (existing) existing.count++;
      else speciesMap.set(sid, { count: 1, nameI18n: f.species.nameI18n });
    }
    const bySpecies = Array.from(speciesMap.entries())
      .map(([speciesId, { count, nameI18n }]) => ({
        speciesId,
        speciesName: this.parseI18nName(nameI18n),
        count,
      }))
      .sort((a, b) => b.count - a.count);

    // 最近 5 条鱼（按 createdAt 倒序）
    const recentFish = [...allFish]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 5)
      .map((f) => ({
        id: f.id,
        name: f.name,
        speciesName: this.parseI18nName(f.species.nameI18n),
        growth: f.growth,
      }));

    // 收藏数
    const pref = await this.prisma.userPreference.findUnique({ where: { userId } });
    let favoriteCount = 0;
    if (pref?.favorites) {
      // P2 PR 11：用 safeParse 替换裸 JSON.parse
      const favIds = safeParse<string[]>(pref.favorites, []);
      favoriteCount = Array.isArray(favIds) ? favIds.length : 0;
    }

    return { userId, totalFish, totalTanks, byStatus, bySpecies, recentFish, favoriteCount };
  }

  /** GET /api/stats/weekly —— 喂食频次时间序列 */
  async getWeekly(userId: string, weeks: number = 12): Promise<WeeklyFeedingDatum[]> {
    const since = new Date();
    since.setDate(since.getDate() - weeks * 7);

    // 取所有用户的鱼 + 喂食记录（在 since 之后）
    const tanks = await this.prisma.fishTank.findMany({
      where: { userId },
      include: { fish: { include: { feedRecords: { where: { fedAt: { gte: since } } } } } },
    });

    // 按 ISO 周聚合
    const buckets = new Map<string, { feedCount: number; fishIds: Set<string> }>();
    for (const tank of tanks) {
      for (const fish of tank.fish) {
        for (const rec of fish.feedRecords) {
          const wkStart = this.weekStartISO(rec.fedAt);
          const bucket = buckets.get(wkStart) ?? { feedCount: 0, fishIds: new Set() };
          bucket.feedCount++;
          bucket.fishIds.add(fish.id);
          buckets.set(wkStart, bucket);
        }
      }
    }

    return Array.from(buckets.entries())
      .map(([weekStart, b]) => ({
        weekStart,
        feedCount: b.feedCount,
        fishFedCount: b.fishIds.size,
      }))
      .sort((a, b) => a.weekStart.localeCompare(b.weekStart));
  }

  /** GET /api/achievements —— 成就解锁列表 */
  async getAchievements(userId: string): Promise<Achievement[]> {
    const tanks = await this.prisma.fishTank.findMany({
      where: { userId },
      include: { fish: true },
    });
    const totalFish = tanks.reduce((acc, t) => acc + t.fish.length, 0);
    const tanksCount = tanks.length;

    // 成就规则（简单阈值）
    const rules: Array<{
      key: string;
      icon: string;
      titleKey: string;
      descKey: string;
      unlocked: boolean;
    }> = [
      {
        key: 'firstTank',
        icon: '🏠',
        titleKey: 'achievements.firstTank.title',
        descKey: 'achievements.firstTank.desc',
        unlocked: tanksCount >= 1,
      },
      {
        key: 'firstFish',
        icon: '🐟',
        titleKey: 'achievements.firstFish.title',
        descKey: 'achievements.firstFish.desc',
        unlocked: totalFish >= 1,
      },
      {
        key: 'fiveFish',
        icon: '🐠',
        titleKey: 'achievements.fiveFish.title',
        descKey: 'achievements.fiveFish.desc',
        unlocked: totalFish >= 5,
      },
      {
        key: 'tenFish',
        icon: '🐡',
        titleKey: 'achievements.tenFish.title',
        descKey: 'achievements.tenFish.desc',
        unlocked: totalFish >= 10,
      },
      {
        key: 'threeTanks',
        icon: '🏘️',
        titleKey: 'achievements.threeTanks.title',
        descKey: 'achievements.threeTanks.desc',
        unlocked: tanksCount >= 3,
      },
    ];

    // unlockedAt（简化：用 tank 创建时间作为代理）
    const firstTank = await this.prisma.fishTank.findFirst({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });

    return rules.map((r) => ({
      ...r,
      unlockedAt: r.unlocked ? firstTank?.createdAt.toISOString() ?? null : null,
    }));
  }

  // ── helpers ──

  private parseI18nName(nameI18n: string): string {
    // P2 PR 11：用 safeParse 替换裸 JSON.parse
    const obj = safeParse<Record<string, string>>(nameI18n, {});
    return obj.zh ?? obj.en ?? obj.ja ?? Object.values(obj)[0] ?? '';
  }

  private weekStartISO(d: Date): string {
    // Monday as week start
    const dt = new Date(d);
    const day = dt.getDay();  // 0=Sun, 1=Mon, ...
    const diff = day === 0 ? -6 : 1 - day;  // shift to Monday
    dt.setDate(dt.getDate() + diff);
    return dt.toISOString().slice(0, 10);  // YYYY-MM-DD
  }
}