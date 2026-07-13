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
