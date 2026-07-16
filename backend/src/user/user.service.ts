import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface DefaultTankResult {
  defaultTankId: string | null;
  tankName?: string;
}

export interface MyFishItem {
  fishId: string;
  fishName: string;
  nickname: string;
  tankId: string;
  tankName: string;
  daysInTank: number;
  status: string | null;
}

export interface MyFishListResult {
  total: number;
  page: number;
  items: MyFishItem[];
}

export interface CreateUserDto {
  id?: string;
  name?: string;
  locale?: string;
  maxTanks?: number;
}

export interface UpdateUserDto {
  name?: string;
  locale?: string;
  defaultTankId?: string | null;
  maxTanks?: number;
}

function parseI18nName(nameI18n: string): string {
  try {
    const parsed = JSON.parse(nameI18n);
    return parsed['zh'] || parsed['en'] || parsed['ja'] || Object.values(parsed)[0] as string || '';
  } catch {
    return nameI18n;
  }
}

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  // ── User CRUD ──

  async findAll() {
    return this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { tanks: true } } },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { tanks: true, _count: { select: { tanks: true } } },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async create(data: CreateUserDto) {
    const id = data.id || undefined;
    if (id) {
      const existing = await this.prisma.user.findUnique({ where: { id } });
      if (existing) throw new ConflictException('User with this id already exists');
    }
    return this.prisma.user.create({
      data: {
        id,
        name: data.name ?? '鱼友',
        locale: data.locale ?? 'zh',
        maxTanks: data.maxTanks ?? 6,
      },
    });
  }

  async update(id: string, data: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return this.prisma.user.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.locale !== undefined && { locale: data.locale }),
        ...(data.defaultTankId !== undefined && { defaultTankId: data.defaultTankId }),
        ...(data.maxTanks !== undefined && { maxTanks: data.maxTanks }),
      },
    });
  }

  async remove(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return this.prisma.user.delete({ where: { id } });
  }

  // ── Utility (moved from FishTanksService) ──

  async ensureUser(userId: string): Promise<string> {
    const existing = await this.prisma.user.findUnique({ where: { id: userId } });
    if (existing) return existing.id;
    return (await this.prisma.user.create({ data: { id: userId } })).id;
  }

  async createDemoUser(): Promise<string> {
    const latest = await this.prisma.user.findFirst({ orderBy: { createdAt: 'desc' } });
    if (latest) return latest.id;
    return (await this.prisma.user.create({ data: {} })).id;
  }

  // ── Default Tank ──

  async getDefaultTank(userId: string): Promise<DefaultTankResult> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { defaultTank: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Already has a default tank set — return it
    if (user.defaultTankId && user.defaultTank) {
      return {
        defaultTankId: user.defaultTankId,
        tankName: user.defaultTank.name,
      };
    }

    // No default tank set — find the user's first tank and promote it
    const firstTank = await this.prisma.fishTank.findFirst({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });

    if (firstTank) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { defaultTankId: firstTank.id },
      });

      return {
        defaultTankId: firstTank.id,
        tankName: firstTank.name,
      };
    }

    // No tanks at all
    return { defaultTankId: null };
  }

  async setDefaultTank(tankId: string): Promise<DefaultTankResult> {
    // Find the tank to verify it exists and get its userId
    const tank = await this.prisma.fishTank.findUnique({
      where: { id: tankId },
    });

    if (!tank) {
      throw new NotFoundException('Tank not found');
    }

    // Update user's defaultTankId
    await this.prisma.user.update({
      where: { id: tank.userId },
      data: { defaultTankId: tankId },
    });

    return {
      defaultTankId: tankId,
      tankName: tank.name,
    };
  }

  /**
   * v9.1 Item 5: Get all fish belonging to the user (across all tanks) with pagination.
   */
  /**
   * v10.1.4 §4: Fish summary for /profile page — aggregated stats.
   * @param sort 'count_desc' | 'recent' | 'growth' — sorts bySpecies
   */
  async getFishSummary(userId: string, sort?: string) {
    const tanks = await this.prisma.fishTank.findMany({
      where: { userId },
      select: { id: true },
    });
    const tankIds = tanks.map((t) => t.id);

    const totalTanks = tankIds.length;
    if (totalTanks === 0) {
      return { totalFish: 0, totalTanks: 0, byStatus: {}, bySpecies: [], recentFish: [], favorites: [] };
    }

    const fish = await this.prisma.fish.findMany({
      where: { tankId: { in: tankIds } },
      include: { species: true, tank: true },
      orderBy: { createdAt: 'desc' },
    });

    // By status
    const byStatus: Record<string, number> = { healthy: 0, subhealthy: 0, danger: 0, hungry: 0, dead: 0 };
    for (const f of fish) {
      const s = f.status || 'healthy';
      byStatus[s] = (byStatus[s] || 0) + 1;
    }

    // By species (grouped by speciesId) — Tomas §3.2 spec schema
    // v10.1.4 FAIL-8: restructured to {data:[{speciesId, name, count, latestGrowthCm, visualVariant}], pagination}
    const speciesMap = new Map<string, { name: string; count: number; latestGrowthCm: number; visualVariant?: any }>();
    for (const f of fish) {
      const sp = f.species;
      const existing = speciesMap.get(sp.id);
      if (existing) {
        existing.count += 1;
        if (f.growth > existing.latestGrowthCm) {
          existing.latestGrowthCm = f.growth;
          existing.visualVariant = f.visualVariant;
        }
      } else {
        speciesMap.set(sp.id, {
          name: parseI18nName(sp.nameI18n),
          count: 1,
          latestGrowthCm: f.growth,
          visualVariant: f.visualVariant,
        });
      }
    }

    // Sort bySpecies per sort key
    const sortKey = sort ?? 'count_desc';
    const speciesEntries = Array.from(speciesMap.entries());
    if (sortKey === 'recent') {
      const recentSpeciesOrder = new Map<string, number>();
      fish.forEach((f, idx) => recentSpeciesOrder.set(f.species.id, fish.length - idx));
      speciesEntries.sort((a, b) => (recentSpeciesOrder.get(b[0]) ?? 0) - (recentSpeciesOrder.get(a[0]) ?? 0));
    } else if (sortKey === 'growth') {
      speciesEntries.sort((a, b) => b[1].latestGrowthCm - a[1].latestGrowthCm);
    } else {
      // Default: count_desc
      speciesEntries.sort((a, b) => b[1].count - a[1].count);
    }

    const data = speciesEntries.map(([id, v]) => ({
      speciesId: id,
      name: v.name,
      count: v.count,
      latestGrowthCm: Math.round(v.latestGrowthCm * 10) / 10,
      visualVariant: v.visualVariant,
    }));

    // Favorites from user preferences — kept for legacy frontend compatibility
    let favorites: { speciesId: string; name: string }[] = [];
    try {
      const pref = await this.prisma.userPreference.findUnique({ where: { userId } });
      if (pref?.favorites) {
        const favIds: string[] = JSON.parse(pref.favorites);
        const favSpecies = await this.prisma.fishSpecies.findMany({
          where: { id: { in: favIds } },
          select: { id: true, nameI18n: true },
        });
        favorites = favSpecies.map((sp) => ({ speciesId: sp.id, name: parseI18nName(sp.nameI18n) }));
      }
    } catch {
      // Silent — favorites not available
    }

    return {
      // Tomas §3.2 spec schema — FAIL-8
      data,
      pagination: {
        total: data.length,
        page: 1,
        pageSize: data.length,
      },
      // Legacy fields kept for frontend backward compatibility
      totalFish: fish.length,
      totalTanks,
      byStatus,
      recentFish: fish.slice(0, 5).map((f) => ({
        fishId: f.id,
        name: f.name || parseI18nName(f.species.nameI18n),
        species: parseI18nName(f.species.nameI18n),
        tankId: f.tankId,
        tankName: f.tank.name,
        daysInTank: Math.floor((Date.now() - f.createdAt.getTime()) / (1000 * 60 * 60 * 24)),
        status: f.status,
        growth: Math.round(f.growth),
      })),
      favorites,
    };
  }

  async getMyFishes(userId: string, page: number = 1, limit: number = 20): Promise<MyFishListResult> {
    // Get all tank IDs belonging to this user
    const tanks = await this.prisma.fishTank.findMany({
      where: { userId },
      select: { id: true, name: true },
    });

    const tankIds = tanks.map((t) => t.id);
    const tankNameMap = new Map(tanks.map((t) => [t.id, t.name]));

    // Count total fish across all user tanks
    const total = tankIds.length > 0
      ? await this.prisma.fish.count({ where: { tankId: { in: tankIds } } })
      : 0;

    // Fetch paginated fish with species
    const fish = tankIds.length > 0
      ? await this.prisma.fish.findMany({
          where: { tankId: { in: tankIds } },
          include: { species: true },
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { createdAt: 'desc' },
        })
      : [];

    const now = Date.now();
    const items: MyFishItem[] = fish.map((f) => ({
      fishId: f.id,
      fishName: parseI18nName(f.species.nameI18n),
      nickname: f.name || '',
      tankId: f.tankId,
      tankName: tankNameMap.get(f.tankId) || '',
      daysInTank: Math.floor((now - f.createdAt.getTime()) / (1000 * 60 * 60 * 24)),
      status: f.status,
    }));

    return { total, page, items };
  }
}
