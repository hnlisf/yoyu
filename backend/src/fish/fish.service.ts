import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Fish } from '@prisma/client';
import { FishSpeciesService } from '../fish-species/fish-species.service';

export interface CreateFishDto {
  tankId?: string;
  speciesId: string;
  name?: string;
  userId?: string;
}

export interface UpdateFishDto {
  name?: string;
}

export type FeedAmount = 'small' | 'normal' | 'large';
const FEED_NUTRITION: Record<FeedAmount, number> = { small: 15, normal: 30, large: 50 };

// v9.0: tank capacity mapping
const TANK_CAPACITY: Record<string, number> = {
  small: 6,
  medium: 12,
  large: 30,
};

// v9.0: fish status computation
function computeStatus(health: number, nutrition: number): string {
  if (nutrition < 20) return 'hungry';
  if (health < 50) return 'danger';
  if (health >= 80 && nutrition >= 60) return 'healthy';
  if (health >= 50 && nutrition >= 40) return 'subhealthy';
  return 'danger';
}

@Injectable()
export class FishService {
  constructor(
    private prisma: PrismaService,
    private speciesService: FishSpeciesService,
  ) {}

  async findAllByTank(tankId: string, lang = 'zh') {
    const list = await this.prisma.fish.findMany({
      where: { tankId },
      include: { species: true, feedRecords: { orderBy: { fedAt: 'desc' }, take: 5 } },
      orderBy: { createdAt: 'asc' },
    });
    return list.map((f) => this.attachI18nSpecies(f, lang));
  }

  /** Get all fish owned by a user (across all tanks) — v9.0: enhanced with adoptedDays + status */
  async findAllByUser(userId: string, lang = 'zh') {
    const list = await this.prisma.fish.findMany({
      where: { tank: { userId } },
      include: { species: true, feedRecords: { orderBy: { fedAt: 'desc' }, take: 5 } },
      orderBy: { createdAt: 'asc' },
    });
    return list.map((f) => {
      const result = this.attachI18nSpecies(f, lang);
      // v9.0: compute adoptedDays and status on the fly
      const adoptedDays = Math.floor((Date.now() - new Date(f.createdAt).getTime()) / 86400000);
      const status = computeStatus(f.health, f.nutrition);
      return { ...result, adoptedDays, status };
    });
  }

  async findOne(id: string, lang = 'zh') {
    const fish = await this.prisma.fish.findUnique({
      where: { id },
      include: { species: true, feedRecords: { orderBy: { fedAt: 'desc' }, take: 10 } },
    });
    if (!fish) return null;
    return this.attachI18nSpecies(fish, lang);
  }

  private attachI18nSpecies(fish: any, lang: string) {
    if (fish.species) {
      fish.species = this.speciesService.toI18n(fish.species, lang);
    }
    return fish;
  }

  /**
   * Create a fish. v9.0 changes:
   * - Validate tank capacity before creation (REQ-6)
   * - Generate instanceId
   * - Support name (nickname) field (REQ-2)
   */
  async create(data: CreateFishDto, userId?: string): Promise<Fish> {
    // Resolve tankId: explicit > user.defaultTankId > first tank > error
    let tankId = data.tankId;

    const uid = userId || data.userId;
    if (!tankId && uid) {
      const user = await this.prisma.user.findUnique({
        where: { id: uid },
        include: { tanks: { orderBy: { createdAt: 'asc' }, take: 1 } },
      });

      if (!user) throw new NotFoundException('用户不存在');

      if (user.defaultTankId) {
        const defTank = await this.prisma.fishTank.findUnique({
          where: { id: user.defaultTankId },
        });
        if (defTank) tankId = user.defaultTankId;
      }

      if (!tankId && user.tanks.length > 0) {
        tankId = user.tanks[0].id;
        await this.prisma.user.update({
          where: { id: uid },
          data: { defaultTankId: tankId },
        });
      }
    }

    if (!tankId) {
      throw new BadRequestException('请先创建一个鱼缸');
    }

    const tank = await this.prisma.fishTank.findUnique({ where: { id: tankId } });
    if (!tank) throw new NotFoundException('鱼缸不存在');
    const species = await this.prisma.fishSpecies.findUnique({ where: { id: data.speciesId } });
    if (!species) throw new NotFoundException('鱼种不存在');

    // v9.0 REQ-6: capacity check
    const capacity = TANK_CAPACITY[tank.size] ?? 12;
    const currentCount = await this.prisma.fish.count({ where: { tankId } });
    if (currentCount >= capacity) {
      const sizeLabel = tank.size === 'small' ? '小型缸' : tank.size === 'medium' ? '中型缸' : '大型缸';
      throw new BadRequestException(`该鱼缸已满（${sizeLabel}最多${capacity}条），请升级或换缸`);
    }

    // v9.0: generate instanceId
    const instanceId = `inst_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    // v9.1 item2: nickname is now required, validate
    const nickname = (data.name ?? '').trim();
    if (!nickname) {
      throw new BadRequestException('请给鱼起个昵称');
    }
    if (nickname.length > 20) {
      throw new BadRequestException('昵称不能超过20个字符');
    }
    if (/<[^>]*>/.test(nickname)) {
      throw new BadRequestException('昵称不能包含HTML标签');
    }
    // No emoji
    if (
      /[\uD800-\uDBFF][\uDC00-\uDFFF]/.test(nickname) ||
      /[\u2600-\u27BF]/.test(nickname) ||
      /[\uFE00-\uFE0F]/.test(nickname) ||
      /\u200D/.test(nickname)
    ) {
      throw new BadRequestException('昵称不能包含表情符号');
    }

    return this.prisma.fish.create({
      data: {
        tankId,
        speciesId: data.speciesId,
        name: nickname,
        instanceId,
        stage: 'fry',
        growth: 0,
        health: 100,
        nutrition: 100,
      },
    });
  }

  async update(id: string, data: UpdateFishDto) {
    await this.ensureExists(id);
    return this.prisma.fish.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.ensureExists(id);
    return this.prisma.fish.delete({ where: { id } });
  }

  /**
   * Feed a fish: validate frequency, update nutrition, add feed record,
   * and advance growth/health based on the species' growth model.
   */
  async feed(fishId: string, amount: FeedAmount = 'normal') {
    const fish = await this.findOne(fishId);
    if (!fish) throw new NotFoundException('Fish not found');

    // Frequency check
    const minIntervalHours = this.feedIntervalHours(fish.species.feedFreq);
    if (fish.lastFedAt) {
      const hoursSinceLastFeed = (Date.now() - new Date(fish.lastFedAt).getTime()) / (1000 * 60 * 60);
      if (hoursSinceLastFeed < minIntervalHours) {
        const hoursRemain = Math.ceil(minIntervalHours - hoursSinceLastFeed);
        const hint = fish.species.feedRefuseHint
          || `还没到投喂时间呢，请等待 {hours} 小时后再次投喂`;
        throw new BadRequestException(
          `温馨提醒：${hint.replace('{hours}', String(hoursRemain))}`,
        );
      }
    }

    const nutritionGain = FEED_NUTRITION[amount];
    const newNutrition = Math.min(100, fish.nutrition + nutritionGain);
    const healthGain = fish.health < 70 ? 5 : 1;
    const newHealth = Math.min(100, fish.health + healthGain);

    // Growth model: 100 / growthDays per day
    const daysOld = Math.max(0, (Date.now() - new Date(fish.birthday).getTime()) / (1000 * 60 * 60 * 24));
    const naturalGrowth = (daysOld / fish.species.growthDays) * 100;
    const feedBonus = amount === 'large' ? 1 : amount === 'normal' ? 0.5 : 0.25;
    const newGrowth = Math.min(100, naturalGrowth + feedBonus);
    const newStage = this.computeStage(newGrowth, fish.species.stages);

    const [updated] = await this.prisma.$transaction([
      this.prisma.fish.update({
        where: { id: fishId },
        data: {
          nutrition: newNutrition,
          health: newHealth,
          growth: newGrowth,
          stage: newStage,
          lastFedAt: new Date(),
        },
      }),
      this.prisma.feedRecord.create({
        data: { fishId, amount },
      }),
    ]);

    return updated;
  }

  computeStage(growth: number, stagesJson: string): string {
    let stages: any[] = [];
    try { stages = JSON.parse(stagesJson); } catch {}
    if (!stages.length) return 'fry';
    const days = (growth / 100) * (stages[stages.length - 1]?.days ?? 1);
    let current = stages[0].name;
    for (const s of stages) {
      if (days >= s.days) current = s.name;
    }
    return current;
  }

  feedIntervalHours(freq: string): number {
    if (freq === 'daily') return 12;
    if (freq === 'twice_daily') return 6;
    if (freq === 'every_2_days') return 36;
    return 8;
  }

  private async ensureExists(id: string) {
    const f = await this.prisma.fish.findUnique({ where: { id } });
    if (!f) throw new NotFoundException('Fish not found');
  }

  /**
   * v9.1 item4: Rename a fish (nickname).
   * Validates: non-empty, 1-20 chars, no emoji, no HTML tags.
   * Checks tank ownership via userId (403 if not owner).
   */
  async renameFish(
    tankId: string,
    fishId: string,
    nickname: string,
    userId: string,
  ): Promise<Fish> {
    // Validate nickname
    if (!nickname || typeof nickname !== 'string') {
      throw new BadRequestException('昵称不能为空');
    }
    const trimmed = nickname.trim();
    if (trimmed.length < 1 || trimmed.length > 20) {
      throw new BadRequestException('昵称长度须在1-20个字符之间');
    }
    // No HTML tags
    if (/<[^>]*>/.test(trimmed)) {
      throw new BadRequestException('昵称不能包含HTML标签');
    }
    // No emoji (detect characters outside BMP and common emoji ranges)
    if (
      /[\uD800-\uDBFF][\uDC00-\uDFFF]/.test(trimmed) ||
      /[\u2600-\u27BF]/.test(trimmed) ||
      /[\uFE00-\uFE0F]/.test(trimmed) ||
      /\u200D/.test(trimmed)
    ) {
      throw new BadRequestException('昵称不能包含表情符号');
    }

    // Check fish exists and belongs to the specified tank
    const fish = await this.prisma.fish.findUnique({
      where: { id: fishId },
      include: { tank: true },
    });
    if (!fish) throw new NotFoundException('鱼不存在');
    if (fish.tankId !== tankId) {
      throw new NotFoundException('鱼不属于该鱼缸');
    }

    // Check tank ownership
    const tank = await this.prisma.fishTank.findUnique({ where: { id: tankId } });
    if (!tank) throw new NotFoundException('鱼缸不存在');
    if (tank.userId !== userId) {
      throw new ForbiddenException('无权操作该鱼缸');
    }

    return this.prisma.fish.update({
      where: { id: fishId },
      data: { name: trimmed },
    });
  }
}
