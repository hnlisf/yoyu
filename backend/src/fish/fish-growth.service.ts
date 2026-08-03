/**
 * ============================================================================
 * 文件名：fish/fish-growth.service.ts（鱼只成长历史服务）
 * ============================================================================
 * 作用：返回单条鱼随时间的成长数据 —— 替代前端 mockGrowthHistory
 *
 * P4 §3.1.1：PR 18 — 第一个 mock → 真实端点
 *
 * 数据来源：
 *   - Fish 模型当前 growth / stage
 *   - FeedRecord 历史 → 推算过去的"成长快照"
 *
 * 设计取舍：
 *   - 不存"成长快照"表（避免冗余）—— 按需聚合 FeedRecord + Fish 字段
 *   - 返回时间序列 [{ at, growth, stage, weight }] 供前端图表直接消费
 *   - 上限 N=30 个采样点（防爆量）
 *
 * @see frontend/src/lib/api/mock.ts:71 mockGrowthHistory —— 本 service 取代之
 * ============================================================================
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { safeParse } from '../common/i18n';

export interface GrowthPoint {
  /** 时间（ISO 8601） */
  at: string;
  /** 成长度 0-100 */
  growth: number;
  /** 阶段名 */
  stage: 'fry' | 'juvenile' | 'subadult' | 'adult';
  /** 估算重量（克）；暂未实现真实公式，返回 nullable */
  weight: number | null;
}

@Injectable()
export class FishGrowthService {
  constructor(private prisma: PrismaService) {}

  /**
   * getGrowthHistory —— 取一条鱼的成长时间序列
   *
   * 算法：
   *   - 起点：birthday 时 growth=0 / stage='fry'
   *   - 中间：每个 FeedRecord 触发一次成长步进（feeds * 5%）
   *   - 终点：当前 Fish.growth / Fish.stage
   *   - 采样：最多 N=30 点（均匀间隔）
   *
   * @param fishId 鱼只 ID
   * @param limit   最多返回几个点（默认 30）
   * @returns 按时间正序的 GrowthPoint[]
   * @throws 404 if fish not found
   */
  async getGrowthHistory(fishId: string, limit: number = 30): Promise<GrowthPoint[]> {
    const fish = await this.prisma.fish.findUnique({
      where: { id: fishId },
      include: {
        feedRecords: { orderBy: { fedAt: 'asc' } },
        species: true,
      },
    });
    if (!fish) {
      throw new Error(`Fish not found: ${fishId}`);
    }

    const points: GrowthPoint[] = [];

    // 起点：birthday
    points.push({
      at: fish.birthday.toISOString(),
      growth: 0,
      stage: 'fry',
      weight: null,
    });

    // 累计增长
    let cumGrowth = 0;
    const stepGrowth = 5;  // 每次喂食 +5%（可调）
    for (const record of fish.feedRecords) {
      cumGrowth = Math.min(100, cumGrowth + stepGrowth);
      points.push({
        at: record.fedAt.toISOString(),
        growth: cumGrowth,
        stage: this.computeStageByGrowth(cumGrowth, fish.species.stages),
        weight: null,
      });
    }

    // 终点：当前状态（如果跟最后记录不同）
    if (cumGrowth !== fish.growth || fish.feedRecords.length === 0) {
      points.push({
        at: fish.createdAt.toISOString(),
        growth: fish.growth,
        stage: fish.stage as any,
        weight: null,
      });
    }

    // 采样：均匀下采样到 limit 个点
    return this.downsample(points, limit);
  }

  /** 根据成长度计算阶段名（用 species.stages JSON） */
  private computeStageByGrowth(growth: number, stagesJson: string): 'fry' | 'juvenile' | 'subadult' | 'adult' {
    // P2 PR 11：用 safeParse 替换裸 JSON.parse（项目策略禁止）
    const stages = safeParse<any[]>(stagesJson, []);
    if (!stages.length) return 'fry' as any;

    // 简化：取 stages 中不超过当前 growth% 对应的最大阶段
    let current = stages[0].name ?? 'fry';
    for (const s of stages) {
      const threshold = (s.days ?? 0) / Math.max(1, stages[stages.length - 1]?.days ?? 1) * 100;
      if (growth >= threshold) current = s.name;
    }
    return current as any;
  }

  /** 均匀下采样：保留首尾，均匀抽取中间点 */
  private downsample(points: GrowthPoint[], limit: number): GrowthPoint[] {
    if (points.length <= limit) return points;
    const result: GrowthPoint[] = [points[0]];
    const step = (points.length - 1) / (limit - 1);
    for (let i = 1; i < limit - 1; i++) {
      result.push(points[Math.round(i * step)]);
    }
    result.push(points[points.length - 1]);
    return result;
  }
}