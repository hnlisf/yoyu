import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StatsSummaryDto } from './dto/stats-summary.dto';
import { StatsWeeklyDatumDto } from './dto/stats-weekly.dto';
import { AchievementDto } from './dto/stats-achievements.dto';

@Injectable()
export class StatsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Single endpoint returns the full stats payload.
   * No HealthRecord table exists in the schema, so treatCount is hard-coded 0.
   */
  async getStats(userId: string): Promise<{
    summary: StatsSummaryDto;
    weekly: StatsWeeklyDatumDto[];
    achievements: AchievementDto[];
  }> {
    const summary = await this.buildSummary(userId);
    const weekly = await this.buildWeekly(userId);
    const achievements = this.buildAchievements(summary);

    return { summary, weekly, achievements };
  }

  private async buildSummary(userId: string): Promise<StatsSummaryDto> {
    // fishCount: count unique fish across all user's tanks
    const fishCount = await this.prisma.fish.count({
      where: { tank: { userId } },
    });

    // totalDays: floor((now - earliest tank createdAt) / 86400_000)
    const earliestTank = await this.prisma.fishTank.findFirst({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true },
    });
    const totalDays = earliestTank
      ? Math.floor((Date.now() - earliestTank.createdAt.getTime()) / 86_400_000)
      : 0;

    // feedCount: FeedRecord rows for user's fish
    const feedCount = await this.prisma.feedRecord.count({
      where: { fish: { tank: { userId } } },
    });

    // waterChangeCount: WaterChangeLog rows across user's tanks
    const waterChangeCount = await this.prisma.waterChangeLog.count({
      where: { tank: { userId } },
    });

    // treatCount: HealthRecord table does not exist in schema → 0
    const treatCount = 0;

    // achievementCount: computed from unlocked achievements
    const achievements = this.buildAchievements({
      fishCount,
      totalDays,
      feedCount,
      waterChangeCount,
      treatCount,
      achievementCount: 0,
    });
    const achievementCount = achievements.filter((a) => a.unlockedAt !== null).length;

    return {
      fishCount,
      totalDays,
      feedCount,
      waterChangeCount,
      treatCount,
      achievementCount,
    };
  }

  /**
   * Last 7 days (including today), group by date for:
   *   feed: FeedRecord count per day
   *   water: WaterChangeLog count per day
   *   remind: Reminder.isDone count per day (type = feed/water_change/clean)
   * Missing dates are padded with zeros.
   */
  private async buildWeekly(userId: string): Promise<StatsWeeklyDatumDto[]> {
    const now = new Date();
    const result: StatsWeeklyDatumDto[] = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const startOfDay = new Date(dateStr + 'T00:00:00.000Z');
      const endOfDay = new Date(dateStr + 'T23:59:59.999Z');

      // Feed records for user's fish on this day
      const feed = await this.prisma.feedRecord.count({
        where: {
          fedAt: { gte: startOfDay, lte: endOfDay },
          fish: { tank: { userId } },
        },
      });

      // Water change logs on this day
      const water = await this.prisma.waterChangeLog.count({
        where: {
          changedAt: { gte: startOfDay, lte: endOfDay },
          tank: { userId },
        },
      });

      // Done reminders on this day — use createdAt (no updatedAt field in schema)
      const remind = await this.prisma.reminder.count({
        where: {
          userId,
          isDone: true,
          createdAt: { gte: startOfDay, lte: endOfDay },
        },
      });

      result.push({ date: dateStr, feed, water, remind });
    }

    return result;
  }

  private buildAchievements(summary: StatsSummaryDto): AchievementDto[] {
    const { fishCount, totalDays, feedCount, waterChangeCount, treatCount } = summary;

    const now = () => new Date().toISOString();

    const rules: Array<{ id: string; titleKey: string; condition: boolean }> = [
      { id: 'first_fish',     titleKey: 'stats.achievement.first_fish',      condition: fishCount >= 1 },
      { id: 'week_keeper',    titleKey: 'stats.achievement.week_keeper',     condition: totalDays >= 7 },
      { id: 'feed_master',    titleKey: 'stats.achievement.feed_master',     condition: feedCount >= 50 },
      { id: 'water_angel',    titleKey: 'stats.achievement.water_angel',     condition: waterChangeCount >= 20 },
      { id: 'health_guardian', titleKey: 'stats.achievement.health_guardian', condition: treatCount >= 5 },
      { id: 'collector',       titleKey: 'stats.achievement.collector',       condition: fishCount >= 10 },
      { id: 'loyalist',       titleKey: 'stats.achievement.loyalist',       condition: totalDays >= 30 },
      { id: 'century_feeder', titleKey: 'stats.achievement.century_feeder', condition: feedCount >= 100 },
    ];

    return rules.map(({ id, titleKey, condition }) => ({
      id,
      titleKey,
      unlockedAt: condition ? now() : null,
    }));
  }
}
